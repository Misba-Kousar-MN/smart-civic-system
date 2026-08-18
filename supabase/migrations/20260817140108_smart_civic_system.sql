-- =============================================================================
-- SMART CIVIC SYSTEM - SUPABASE / POSTGRESQL PRODUCTION MIGRATION
-- FINAL FREEZE
-- EXACTLY 13 APPLICATION TABLES
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- 1. PROFILES
-- =============================================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (
        role IN ('citizen', 'ward_officer', 'aee', 'commissioner', 'admin')
    ),
    trust_score INTEGER NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. ZONES
-- =============================================================================

CREATE TABLE public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    boundary geometry(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. DEPARTMENTS
-- =============================================================================

CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. OFFICERS
-- =============================================================================

CREATE TABLE public.officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    zone_id UUID REFERENCES public.zones(id) ON DELETE RESTRICT,
    level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. SLA POLICIES
-- =============================================================================

CREATE TABLE public.sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority_level TEXT UNIQUE NOT NULL CHECK (
        priority_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
    ),
    resolution_hours INTEGER NOT NULL CHECK (resolution_hours > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. INCIDENTS
-- =============================================================================

CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00
        CHECK (priority_score BETWEEN 0.00 AND 100.00),
    priority_level TEXT REFERENCES public.sla_policies(priority_level)
        ON DELETE RESTRICT,
    location geography(Point, 4326) NOT NULL,
    address TEXT,
    zone_id UUID REFERENCES public.zones(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level IN (1, 2, 3)),
    assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN (
            'OPEN',
            'IN_PROGRESS',
            'RESOLVED',
            'CLOSED',
            'REOPENED',
            'ESCALATED'
        )
    ),
    sla_started_at TIMESTAMPTZ,
    sla_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 7. REPORTS
-- =============================================================================

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    voice_note_url TEXT,
    voice_transcript TEXT,
    location geography(Point, 4326) NOT NULL,
    ai_category TEXT,
    ai_confidence NUMERIC(5, 2)
        CHECK (
            ai_confidence IS NULL
            OR ai_confidence BETWEEN 0.00 AND 100.00
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. INCIDENT_REPORTS
-- =============================================================================

CREATE TABLE public.incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_incident_reports_single_primary
ON public.incident_reports (incident_id)
WHERE is_primary = true;

-- =============================================================================
-- 9. ESCALATIONS
-- =============================================================================

CREATE TABLE public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    from_level INTEGER NOT NULL CHECK (from_level IN (1, 2, 3)),
    to_level INTEGER NOT NULL CHECK (to_level IN (1, 2, 3)),
    reason TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'TRIGGERED' CHECK (
        status IN ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED')
    ),
    CONSTRAINT chk_valid_escalation_flow CHECK (
        (from_level = 1 AND to_level = 2)
        OR
        (from_level = 2 AND to_level = 3)
    )
);

-- =============================================================================
-- 10. STATUS_HISTORY
-- =============================================================================

CREATE TABLE public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 11. RESOLUTION_EVIDENCE
-- =============================================================================

CREATE TABLE public.resolution_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    ai_verification_passed BOOLEAN NOT NULL,
    ai_confidence NUMERIC(5, 2)
        CHECK (ai_confidence BETWEEN 0.00 AND 100.00),
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 12. TRUST_HISTORY
-- =============================================================================

CREATE TABLE public.trust_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_changed INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 13. NOTIFICATIONS
-- =============================================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_incidents_location
ON public.incidents USING GIST (location);

CREATE INDEX idx_reports_location
ON public.reports USING GIST (location);

CREATE INDEX idx_zones_boundary
ON public.zones USING GIST (boundary);

CREATE INDEX idx_incidents_status
ON public.incidents (status);

CREATE INDEX idx_incidents_priority_level
ON public.incidents (priority_level);

CREATE INDEX idx_incidents_department_id
ON public.incidents (department_id);

CREATE INDEX idx_incidents_zone_id
ON public.incidents (zone_id);

CREATE INDEX idx_incidents_assigned_officer_id
ON public.incidents (assigned_officer_id);

CREATE INDEX idx_incidents_current_level
ON public.incidents (current_level);

CREATE INDEX idx_incidents_created_at
ON public.incidents (created_at DESC);

CREATE INDEX idx_reports_user_id
ON public.reports (user_id);

CREATE INDEX idx_reports_created_at
ON public.reports (created_at DESC);

CREATE INDEX idx_officers_department_id
ON public.officers (department_id);

CREATE INDEX idx_officers_zone_id
ON public.officers (zone_id);

CREATE INDEX idx_officers_level
ON public.officers (level);

CREATE INDEX idx_notifications_user_id
ON public.notifications (user_id);

CREATE INDEX idx_notifications_unread
ON public.notifications (user_id, is_read)
WHERE is_read = false;

CREATE INDEX idx_escalations_incident_id
ON public.escalations (incident_id);

CREATE INDEX idx_escalations_triggered_at
ON public.escalations (triggered_at DESC);

CREATE INDEX idx_status_history_incident_id
ON public.status_history (incident_id);

CREATE INDEX idx_resolution_evidence_incident_id
ON public.resolution_evidence (incident_id);

CREATE INDEX idx_trust_history_user_id
ON public.trust_history (user_id);

CREATE INDEX idx_incident_reports_incident_id
ON public.incident_reports (incident_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
    SELECT role
    FROM public.profiles
    WHERE id = p_user_id;
$$ LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT trust_score
    FROM public.profiles
    WHERE id = p_user_id;
$$ LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
          AND role = 'admin'
    );
$$ LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public;

-- =============================================================================
-- OFFICER AUTHORIZATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_officer_authorized_for_incident(
    p_user_id UUID,
    p_incident_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_officer RECORD;
    v_incident RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO v_officer
    FROM public.officers
    WHERE profile_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO v_incident
    FROM public.incidents
    WHERE id = p_incident_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_officer.level = 3 THEN
        RETURN TRUE;
    END IF;

    IF v_officer.level = 2
       AND v_officer.department_id = v_incident.department_id THEN
        RETURN TRUE;
    END IF;

    IF v_officer.level = 1
       AND v_officer.department_id = v_incident.department_id
       AND v_officer.zone_id = v_incident.zone_id THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- =============================================================================
-- INCIDENT UPDATE VALIDATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_officer_incident_update(
    p_user_id UUID,
    p_incident_id UUID,
    p_new_id UUID,
    p_new_category TEXT,
    p_new_severity TEXT,
    p_new_priority_score NUMERIC,
    p_new_priority_level TEXT,
    p_new_location GEOGRAPHY,
    p_new_address TEXT,
    p_new_zone_id UUID,
    p_new_department_id UUID,
    p_new_current_level INTEGER,
    p_new_assigned_officer_id UUID,
    p_new_sla_started_at TIMESTAMPTZ,
    p_new_sla_deadline TIMESTAMPTZ,
    p_new_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old public.incidents%ROWTYPE;
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(p_user_id)
       OR public.get_user_role(p_user_id) = 'commissioner' THEN
        RETURN TRUE;
    END IF;

    IF NOT public.is_officer_authorized_for_incident(
        p_user_id,
        p_incident_id
    ) THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO v_old
    FROM public.incidents
    WHERE id = p_incident_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF p_new_id IS DISTINCT FROM v_old.id
       OR p_new_category IS DISTINCT FROM v_old.category
       OR p_new_severity IS DISTINCT FROM v_old.severity
       OR p_new_priority_score IS DISTINCT FROM v_old.priority_score
       OR p_new_priority_level IS DISTINCT FROM v_old.priority_level
       OR p_new_location IS DISTINCT FROM v_old.location
       OR p_new_address IS DISTINCT FROM v_old.address
       OR p_new_zone_id IS DISTINCT FROM v_old.zone_id
       OR p_new_department_id IS DISTINCT FROM v_old.department_id
       OR p_new_current_level IS DISTINCT FROM v_old.current_level
       OR p_new_assigned_officer_id IS DISTINCT FROM v_old.assigned_officer_id
       OR p_new_sla_started_at IS DISTINCT FROM v_old.sla_started_at
       OR p_new_sla_deadline IS DISTINCT FROM v_old.sla_deadline
       OR p_new_created_at IS DISTINCT FROM v_old.created_at THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- =============================================================================
-- ESCALATION AUTHORIZATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_officer_trigger_escalation(
    p_user_id UUID,
    p_incident_id UUID,
    p_from_level INTEGER,
    p_to_level INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_officer RECORD;
    v_incident RECORD;
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    SELECT *
    INTO v_officer
    FROM public.officers
    WHERE profile_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO v_incident
    FROM public.incidents
    WHERE id = p_incident_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_incident.current_level != p_from_level THEN
        RETURN FALSE;
    END IF;

    IF NOT (
        (p_from_level = 1 AND p_to_level = 2)
        OR
        (p_from_level = 2 AND p_to_level = 3)
    ) THEN
        RETURN FALSE;
    END IF;

    IF v_officer.level = 1 THEN
        RETURN (
            p_from_level = 1
            AND v_officer.department_id = v_incident.department_id
            AND v_officer.zone_id = v_incident.zone_id
        );
    END IF;

    IF v_officer.level = 2 THEN
        RETURN (
            p_from_level = 2
            AND v_officer.department_id = v_incident.department_id
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- =============================================================================
-- ATOMIC ESCALATION RPC
-- THIS IS THE SOLE APPLICATION ESCALATION CREATION PATH
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_incident_escalation(
    p_incident_id UUID,
    p_reason TEXT
)
RETURNS public.escalations AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_incident public.incidents%ROWTYPE;
    v_from_level INTEGER;
    v_to_level INTEGER;
    v_escalation public.escalations;
BEGIN
    IF v_user_id IS NULL
       AND current_setting('role', true) <> 'service_role' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

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
        RAISE EXCEPTION
            'Incident is already at maximum escalation level (Level 3).';
    END IF;

    IF NOT (
        current_setting('role', true) = 'service_role'
        OR public.is_admin(v_user_id)
    ) THEN
        IF NOT public.can_officer_trigger_escalation(
            v_user_id,
            p_incident_id,
            v_from_level,
            v_to_level
        ) THEN
            RAISE EXCEPTION
                'Officer is not authorized to escalate this incident.';
        END IF;
    END IF;

    PERFORM set_config(
        'app.escalation_rpc',
        'on',
        true
    );

    INSERT INTO public.escalations (
        incident_id,
        from_level,
        to_level,
        reason,
        triggered_at,
        status
    )
    VALUES (
        p_incident_id,
        v_from_level,
        v_to_level,
        p_reason,
        now(),
        'TRIGGERED'
    )
    RETURNING *
    INTO v_escalation;

    UPDATE public.incidents
    SET
        current_level = v_to_level,
        status = 'ESCALATED',
        updated_at = now()
    WHERE id = p_incident_id;

    INSERT INTO public.status_history (
        incident_id,
        old_status,
        new_status,
        changed_by,
        remarks,
        created_at
    )
    VALUES (
        p_incident_id,
        v_incident.status,
        'ESCALATED',
        v_user_id,
        p_reason,
        now()
    );

    RETURN v_escalation;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- AUTH PROFILE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Citizen User'
    );

    v_phone := COALESCE(
        NEW.phone,
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'phone'
    );

    INSERT INTO public.profiles (
        id,
        full_name,
        phone_number,
        role,
        trust_score,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_full_name,
        v_phone,
        'citizen',
        100,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- PROFILE COLUMN PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_column_protection()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION
            'Unauthorized column update: only full_name and phone_number may be modified.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS enforce_profile_column_protection_trigger
ON public.profiles;

CREATE TRIGGER enforce_profile_column_protection_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_column_protection();

-- =============================================================================
-- REPORT AI FIELD PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_report_ai_field_protection()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.ai_category IS NOT NULL
           OR NEW.ai_confidence IS NOT NULL THEN
            RAISE EXCEPTION
                'Unauthorized submission: AI fields are controlled by the backend AI workflow.';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.ai_category IS DISTINCT FROM OLD.ai_category
           OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence THEN
            RAISE EXCEPTION
                'Unauthorized update: AI fields cannot be modified by the client.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS enforce_report_ai_field_protection_trigger
ON public.reports;

CREATE TRIGGER enforce_report_ai_field_protection_trigger
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_report_ai_field_protection();

-- =============================================================================
-- NOTIFICATION COLUMN PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_notification_column_protection()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION
            'Unauthorized column update: only is_read may be modified.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS enforce_notification_column_protection_trigger
ON public.notifications;

CREATE TRIGGER enforce_notification_column_protection_trigger
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_notification_column_protection();

-- =============================================================================
-- DATABASE-LEVEL INCIDENT COLUMN PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_incident_column_protection()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR public.is_admin(v_user_id)
       OR current_setting('app.escalation_rpc', true) = 'on' THEN
        RETURN NEW;
    END IF;

    v_role := public.get_user_role(v_user_id);

    IF v_role = 'commissioner' THEN
        RETURN NEW;
    END IF;

    IF v_role IN ('ward_officer', 'aee') THEN

        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.category IS DISTINCT FROM OLD.category
           OR NEW.severity IS DISTINCT FROM OLD.severity
           OR NEW.priority_score IS DISTINCT FROM OLD.priority_score
           OR NEW.priority_level IS DISTINCT FROM OLD.priority_level
           OR NEW.location IS DISTINCT FROM OLD.location
           OR NEW.address IS DISTINCT FROM OLD.address
           OR NEW.zone_id IS DISTINCT FROM OLD.zone_id
           OR NEW.department_id IS DISTINCT FROM OLD.department_id
           OR NEW.current_level IS DISTINCT FROM OLD.current_level
           OR NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id
           OR NEW.sla_started_at IS DISTINCT FROM OLD.sla_started_at
           OR NEW.sla_deadline IS DISTINCT FROM OLD.sla_deadline
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN

            RAISE EXCEPTION
                'Unauthorized incident update: protected incident fields cannot be modified by Level 1/2 officers.';
        END IF;

        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'Unauthorized incident update.';
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS enforce_incident_column_protection_trigger
ON public.incidents;

CREATE TRIGGER enforce_incident_column_protection_trigger
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_incident_column_protection();

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_officers_updated_at
BEFORE UPDATE ON public.officers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sla_policies_updated_at
BEFORE UPDATE ON public.sla_policies
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MASTER DATA
-- =============================================================================

CREATE POLICY "Authenticated users read zones"
ON public.zones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage zones"
ON public.zones
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users read departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users read sla_policies"
ON public.sla_policies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage sla_policies"
ON public.sla_policies
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- PROFILES
-- =============================================================================

CREATE POLICY "Users view their own profile or officers view citizen profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid())
       IN ('ward_officer', 'aee', 'commissioner', 'admin')
);

CREATE POLICY "Users update personal contact fields in their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_full_name TEXT,
    p_phone_number TEXT
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    phone_number TEXT,
    role TEXT,
    trust_score INTEGER,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    RETURN QUERY
    UPDATE public.profiles
    SET
        full_name = COALESCE(
            NULLIF(trim(p_full_name), ''),
            public.profiles.full_name
        ),
        phone_number = COALESCE(
            NULLIF(trim(p_phone_number), ''),
            public.profiles.phone_number
        ),
        updated_at = now()
    WHERE public.profiles.id = auth.uid()
    RETURNING
        public.profiles.id,
        public.profiles.full_name,
        public.profiles.phone_number,
        public.profiles.role,
        public.profiles.trust_score,
        public.profiles.updated_at;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- OFFICERS
-- =============================================================================

CREATE POLICY "Authenticated users view officers directory"
ON public.officers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage officers"
ON public.officers
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- REPORTS
-- =============================================================================

CREATE POLICY "Citizens view their own reports; officers view all"
ON public.reports
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid())
       IN ('ward_officer', 'aee', 'commissioner', 'admin')
);

CREATE POLICY "Citizens insert their own reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage reports"
ON public.reports
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- INCIDENTS
-- =============================================================================

CREATE POLICY "Incidents SELECT policy"
ON public.incidents
FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(auth.uid(), id)
    OR EXISTS (
        SELECT 1
        FROM public.incident_reports ir
        INNER JOIN public.reports r
            ON r.id = ir.report_id
        WHERE ir.incident_id = incidents.id
          AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Authorized officers update permitted incident fields"
ON public.incidents
FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(auth.uid(), id)
)
WITH CHECK (
    public.validate_officer_incident_update(
        auth.uid(),
        id,
        id,
        category,
        severity,
        priority_score,
        priority_level,
        location,
        address,
        zone_id,
        department_id,
        current_level,
        assigned_officer_id,
        sla_started_at,
        sla_deadline,
        created_at
    )
);

CREATE POLICY "Admins insert incidents"
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- INCIDENT_REPORTS
-- =============================================================================

CREATE POLICY "Citizens select incident_reports for their own reports"
ON public.incident_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.reports r
        WHERE r.id = incident_reports.report_id
          AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Officers select authorized incident_reports"
ON public.incident_reports
FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

CREATE POLICY "Authorized officers and admins insert incident_reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

CREATE POLICY "Authorized officers and admins update incident_reports"
ON public.incident_reports
FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
)
WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

CREATE POLICY "Authorized officers and admins delete incident_reports"
ON public.incident_reports
FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

-- =============================================================================
-- ESCALATIONS
-- =============================================================================

CREATE POLICY "Officers and admins view escalations"
ON public.escalations
FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid())
    IN ('ward_officer', 'aee', 'commissioner', 'admin')
);

CREATE POLICY "Admins update escalation status"
ON public.escalations
FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid())
)
WITH CHECK (
    public.is_admin(auth.uid())
);

-- =============================================================================
-- STATUS HISTORY
-- =============================================================================

CREATE POLICY "View status history"
ON public.status_history
FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid())
    IN ('ward_officer', 'aee', 'commissioner', 'admin')
    OR EXISTS (
        SELECT 1
        FROM public.incident_reports ir
        INNER JOIN public.reports r
            ON r.id = ir.report_id
        WHERE ir.incident_id = status_history.incident_id
          AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Authorized officers insert status history"
ON public.status_history
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

-- =============================================================================
-- RESOLUTION EVIDENCE
-- =============================================================================

CREATE POLICY "View resolution evidence"
ON public.resolution_evidence
FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid())
    IN ('ward_officer', 'aee', 'commissioner', 'admin')
    OR EXISTS (
        SELECT 1
        FROM public.incident_reports ir
        INNER JOIN public.reports r
            ON r.id = ir.report_id
        WHERE ir.incident_id = resolution_evidence.incident_id
          AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Authorized officers insert resolution evidence"
ON public.resolution_evidence
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_officer_authorized_for_incident(
        auth.uid(),
        incident_id
    )
);

-- =============================================================================
-- TRUST HISTORY
-- =============================================================================

CREATE POLICY "Citizens view their own trust history"
ON public.trust_history
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins insert trust history"
ON public.trust_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE POLICY "Users view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update read status on their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO public.departments (name, code)
VALUES
    ('Civil / Roads', 'ROADS'),
    ('Waste Management', 'SANITATION'),
    ('Streetlights / Electrical', 'ELECTRICAL'),
    ('Water Supply / Underground Drainage', 'UGD')
ON CONFLICT (code)
DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.sla_policies (
    priority_level,
    resolution_hours,
    description
)
VALUES
    (
        'CRITICAL',
        12,
        'Immediate civic emergency or severe public safety hazard (12 Hours SLA)'
    ),
    (
        'HIGH',
        24,
        'High priority infrastructure breach requiring urgent response (24 Hours SLA)'
    ),
    (
        'MEDIUM',
        72,
        'Standard municipal maintenance issue (72 Hours SLA)'
    ),
    (
        'LOW',
        168,
        'Low priority routine civic request or enhancement (7 Days SLA)'
    )
ON CONFLICT (priority_level)
DO UPDATE SET
    resolution_hours = EXCLUDED.resolution_hours,
    description = EXCLUDED.description;

-- DEVELOPMENT PLACEHOLDER ZONES.
-- These are NOT official Davanagere municipal ward boundaries.

INSERT INTO public.zones (
    name,
    code,
    boundary
)
VALUES
(
    'Zone 1 - City Center',
    'ZONE1',
    ST_GeomFromText(
        'POLYGON((75.9000 14.4500, 75.9300 14.4500, 75.9300 14.4800, 75.9000 14.4800, 75.9000 14.4500))',
        4326
    )
),
(
    'Zone 2 - Residential',
    'ZONE2',
    ST_GeomFromText(
        'POLYGON((75.9300 14.4500, 75.9600 14.4500, 75.9600 14.4800, 75.9300 14.4800, 75.9300 14.4500))',
        4326
    )
),
(
    'Zone 3 - Outer Area',
    'ZONE3',
    ST_GeomFromText(
        'POLYGON((75.9000 14.4800, 75.9600 14.4800, 75.9600 14.5200, 75.9000 14.5200, 75.9000 14.4800))',
        4326
    )
)
ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name,
    boundary = EXCLUDED.boundary;

-- =============================================================================
-- SUPABASE REALTIME
-- =============================================================================

DO $$
DECLARE
    v_pub_id OID;
    v_tables TEXT[] := ARRAY[
        'incidents',
        'escalations',
        'resolution_evidence',
        'notifications'
    ];
    t TEXT;
BEGIN
    SELECT oid
    INTO v_pub_id
    FROM pg_publication
    WHERE pubname = 'supabase_realtime';

    IF v_pub_id IS NOT NULL THEN

        FOREACH t IN ARRAY v_tables LOOP

            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_rel pr
                INNER JOIN pg_class c
                    ON c.oid = pr.prrelid
                INNER JOIN pg_namespace n
                    ON n.oid = c.relnamespace
                WHERE pr.prpubid = v_pub_id
                  AND n.nspname = 'public'
                  AND c.relname = t
            ) THEN

                EXECUTE format(
                    'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;',
                    t
                );

            END IF;

        END LOOP;

    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE
            'Realtime configuration skipped: %',
            SQLERRM;
END $$;

-- =============================================================================
-- FINAL STRUCTURAL VALIDATION
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
          'profiles',
          'zones',
          'departments',
          'officers',
          'sla_policies',
          'incidents',
          'reports',
          'incident_reports',
          'escalations',
          'status_history',
          'resolution_evidence',
          'trust_history',
          'notifications'
      );

    IF v_count <> 13 THEN
        RAISE EXCEPTION
            'FINAL VALIDATION FAILED: Expected exactly 13 application tables, found %.',
            v_count;
    END IF;

END $$;

COMMIT;
