-- =============================================================================
-- POSTGIS SPATIAL DEDUPLICATION & ZONE ROUTING RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.st_dwithin_incidents(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 50.0
)
RETURNS SETOF public.incidents AS $$
BEGIN
    RETURN QUERY
    SELECT i.*
    FROM public.incidents i
    WHERE i.status IN ('OPEN', 'IN_PROGRESS', 'REOPENED', 'ESCALATED')
      AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_meters
      )
    ORDER BY ST_Distance(
        i.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) ASC;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.find_zone_for_location(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION
)
RETURNS UUID AS $$
DECLARE
    v_zone_id UUID;
BEGIN
    SELECT z.id INTO v_zone_id
    FROM public.zones z
    WHERE z.boundary IS NOT NULL
      AND ST_Contains(
          z.boundary,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
      )
    LIMIT 1;

    RETURN v_zone_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;
