-- =============================================================================
-- ESCALATION INTEGRITY
--
-- Keeps an incident escalation, its audit history and its renewed SLA deadline
-- in one locked transaction.  The expected level/deadline arguments make a
-- stale scheduler read a no-op instead of creating a second escalation.
-- =============================================================================

BEGIN;

-- The backend already supports these states; make the database contract match.
ALTER TABLE public.incidents
    DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE public.incidents
    ADD CONSTRAINT incidents_status_check CHECK (
        status IN (
            'OPEN',
            'IN_PROGRESS',
            'PAUSED',
            'RESOLVED',
            'CLOSED',
            'REOPENED',
            'ESCALATED',
            'SLA_BREACHED'
        )
    );

CREATE OR REPLACE FUNCTION public.process_incident_escalation(
    p_incident_id UUID,
    p_reason TEXT,
    p_expected_level INTEGER,
    p_expected_sla_deadline TIMESTAMPTZ,
    p_effective_now TIMESTAMPTZ,
    p_actor_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'manual'
)
RETURNS TABLE (
    performed BOOLEAN,
    terminal_breach BOOLEAN,
    escalation_id UUID,
    incident_id UUID,
    from_level INTEGER,
    to_level INTEGER,
    current_level INTEGER,
    status TEXT,
    sla_deadline TIMESTAMPTZ
)
AS $$
DECLARE
    v_incident public.incidents%ROWTYPE;
    v_actor_id UUID;
    v_to_level INTEGER;
    v_resolution_hours INTEGER;
    v_new_deadline TIMESTAMPTZ;
    v_escalation_id UUID;
    v_is_service BOOLEAN := current_setting('role', true) = 'service_role';
BEGIN
    IF p_source NOT IN ('manual', 'scheduler') THEN
        RAISE EXCEPTION 'Unsupported escalation source.';
    END IF;

    IF p_effective_now IS NULL THEN
        RAISE EXCEPTION 'An effective timestamp is required.';
    END IF;

    -- Only the scheduler may use service-role credentials.  Interactive calls
    -- run with the requester JWT, so the actor cannot be spoofed.
    IF NOT v_is_service THEN
        IF p_source <> 'manual' OR auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Only the internal scheduler can run scheduled escalation.';
        END IF;

        IF p_actor_id IS NOT NULL AND p_actor_id <> auth.uid() THEN
            RAISE EXCEPTION 'Escalation actor does not match the authenticated user.';
        END IF;

        v_actor_id := auth.uid();
        IF NOT public.is_officer_authorized_for_incident(v_actor_id, p_incident_id) THEN
            RAISE EXCEPTION 'Officer is not authorized for this incident.';
        END IF;
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    SELECT *
    INTO v_incident
    FROM public.incidents
    WHERE id = p_incident_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident not found.';
    END IF;

    -- A scheduler may have read the incident before another worker handled it.
    IF p_expected_level IS NOT NULL AND v_incident.current_level <> p_expected_level THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::UUID, v_incident.id,
            v_incident.current_level, v_incident.current_level, v_incident.current_level,
            v_incident.status, v_incident.sla_deadline;
        RETURN;
    END IF;

    IF p_expected_sla_deadline IS NOT NULL
       AND v_incident.sla_deadline IS DISTINCT FROM p_expected_sla_deadline THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::UUID, v_incident.id,
            v_incident.current_level, v_incident.current_level, v_incident.current_level,
            v_incident.status, v_incident.sla_deadline;
        RETURN;
    END IF;

    IF v_incident.status IN ('RESOLVED', 'CLOSED', 'SLA_BREACHED') THEN
        RETURN QUERY SELECT FALSE, v_incident.status = 'SLA_BREACHED', NULL::UUID,
            v_incident.id, v_incident.current_level, v_incident.current_level,
            v_incident.current_level, v_incident.status, v_incident.sla_deadline;
        RETURN;
    END IF;

    IF p_source = 'scheduler'
       AND (v_incident.sla_deadline IS NULL OR v_incident.sla_deadline >= p_effective_now) THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::UUID, v_incident.id,
            v_incident.current_level, v_incident.current_level, v_incident.current_level,
            v_incident.status, v_incident.sla_deadline;
        RETURN;
    END IF;

    -- Level 3 is terminal.  Record its breach once without inventing a Level 4.
    IF v_incident.current_level >= 3 THEN
        IF p_source <> 'scheduler' THEN
            RAISE EXCEPTION 'Incident is already at maximum escalation level (Level 3).';
        END IF;

        UPDATE public.incidents
        SET status = 'SLA_BREACHED',
            updated_at = now()
        WHERE id = v_incident.id;

        INSERT INTO public.status_history (
            incident_id, old_status, new_status, changed_by, remarks
        ) VALUES (
            v_incident.id, v_incident.status, 'SLA_BREACHED', v_actor_id,
            COALESCE(NULLIF(trim(p_reason), ''),
                'Level 3 SLA deadline expired. No higher authority level exists.')
        );

        RETURN QUERY SELECT TRUE, TRUE, NULL::UUID, v_incident.id,
            3, 3, 3, 'SLA_BREACHED'::TEXT, v_incident.sla_deadline;
        RETURN;
    END IF;

    SELECT resolution_hours
    INTO v_resolution_hours
    FROM public.sla_policies
    WHERE priority_level = v_incident.priority_level;

    IF v_resolution_hours IS NULL OR v_resolution_hours <= 0 THEN
        RAISE EXCEPTION 'No valid SLA policy is configured for priority level %.', v_incident.priority_level;
    END IF;

    v_to_level := v_incident.current_level + 1;
    v_new_deadline := p_effective_now + make_interval(hours => v_resolution_hours);

    INSERT INTO public.escalations (
        incident_id, from_level, to_level, reason, status
    ) VALUES (
        v_incident.id,
        v_incident.current_level,
        v_to_level,
        COALESCE(NULLIF(trim(p_reason), ''), 'Escalated for intervention.'),
        'TRIGGERED'
    ) RETURNING id INTO v_escalation_id;

    UPDATE public.incidents
    SET current_level = v_to_level,
        status = 'ESCALATED',
        sla_started_at = p_effective_now,
        sla_deadline = v_new_deadline,
        updated_at = now()
    WHERE id = v_incident.id;

    INSERT INTO public.status_history (
        incident_id, old_status, new_status, changed_by, remarks
    ) VALUES (
        v_incident.id, v_incident.status, 'ESCALATED', v_actor_id,
        'Escalated from Level ' || v_incident.current_level || ' to Level ' || v_to_level ||
        '. Reason: ' || COALESCE(NULLIF(trim(p_reason), ''), 'Escalated for intervention.')
    );

    RETURN QUERY SELECT TRUE, FALSE, v_escalation_id, v_incident.id,
        v_incident.current_level, v_to_level, v_to_level, 'ESCALATED'::TEXT, v_new_deadline;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.process_incident_escalation(
    UUID, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_incident_escalation(
    UUID, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) TO authenticated, service_role;

COMMIT;
