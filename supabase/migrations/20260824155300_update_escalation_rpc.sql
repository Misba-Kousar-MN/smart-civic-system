-- =============================================================================
-- UPDATE ATOMIC ESCALATION RPC TO PRESERVE ACTOR IDENTITY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_incident_escalation(
    p_incident_id UUID,
    p_reason TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS public.escalations AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_incident public.incidents%ROWTYPE;
    v_from_level INTEGER;
    v_to_level INTEGER;
    v_escalation public.escalations;
BEGIN
    SELECT *
    INTO v_incident
    FROM public.incidents
    WHERE id = p_incident_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident not found.';
    END IF;

    v_from_level := v_incident.current_level;

    IF v_from_level = 1 THEN
        v_to_level := 2;
    ELSIF v_from_level = 2 THEN
        v_to_level := 3;
    ELSE
        RAISE EXCEPTION 'Incident is already at maximum escalation level (Level 3).';
    END IF;

    -- Create escalation record
    INSERT INTO public.escalations (
        incident_id,
        from_level,
        to_level,
        reason,
        status
    )
    VALUES (
        p_incident_id,
        v_from_level,
        v_to_level,
        p_reason,
        'TRIGGERED'
    )
    RETURNING * INTO v_escalation;

    -- Update incident current level and status
    UPDATE public.incidents
    SET current_level = v_to_level,
        status = 'ESCALATED',
        updated_at = now()
    WHERE id = p_incident_id;

    -- Insert status history record preserving initiating officer ID
    INSERT INTO public.status_history (
        incident_id,
        old_status,
        new_status,
        changed_by,
        remarks
    )
    VALUES (
        p_incident_id,
        v_incident.status,
        'ESCALATED',
        v_user_id,
        'Escalated from Level ' || v_from_level || ' to Level ' || v_to_level || '. Reason: ' || p_reason
    );

    RETURN v_escalation;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
