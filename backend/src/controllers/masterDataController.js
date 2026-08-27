const { supabaseService, createUserClient } = require('../config/supabase');
const ApiError = require('../errors/apiError');

/**
 * GET /zones
 * Returns list of all municipal zones
 */
async function getZones(req, res, next) {
  try {
    const userClient = createUserClient(req.token);
    const { data: zones, error } = await userClient
      .from('zones')
      .select('id, name, code, created_at')
      .order('name', { ascending: true });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: { zones: zones || [] }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /departments
 * Returns list of all municipal service departments
 */
async function getDepartments(req, res, next) {
  try {
    const userClient = createUserClient(req.token);
    const { data: departments, error } = await userClient
      .from('departments')
      .select('id, name, code, created_at')
      .order('name', { ascending: true });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: { departments: departments || [] }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /sla-policies
 * Returns SLA policy configurations
 */
async function getSlaPolicies(req, res, next) {
  try {
    const userClient = createUserClient(req.token);
    const { data: policies, error } = await userClient
      .from('sla_policies')
      .select('id, priority_level, resolution_hours, description, created_at, updated_at')
      .order('resolution_hours', { ascending: true });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: { sla_policies: policies || [] }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /officers
 * Returns directory of officers (Admin / Commissioner only)
 */
async function getOfficers(req, res, next) {
  try {
    const userClient = createUserClient(req.token);
    const { data: officers, error } = await userClient
      .from('officers')
      .select(`
        id,
        profile_id,
        level,
        department_id,
        zone_id,
        profiles (
          full_name,
          role
        ),
        departments (
          name,
          code
        ),
        zones (
          name,
          code
        )
      `)
      .order('level', { ascending: true });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    const formattedOfficers = (officers || []).map((off) => ({
      id: off.id,
      profile_id: off.profile_id,
      full_name: off.profiles ? off.profiles.full_name : 'Municipal Officer',
      role: off.profiles ? off.profiles.role : 'ward_officer',
      level: off.level,
      department_id: off.department_id,
      department_name: off.departments ? off.departments.name : 'Unassigned',
      zone_id: off.zone_id,
      zone_name: off.zones ? off.zones.name : 'Unassigned'
    }));

    return res.status(200).json({
      success: true,
      data: { officers: formattedOfficers }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /officers/:officerId
 * Returns single officer details (Admin / Commissioner only)
 */
async function getOfficerById(req, res, next) {
  try {
    const { officerId } = req.params;
    const userClient = createUserClient(req.token);

    const { data: officer, error } = await userClient
      .from('officers')
      .select(`
        id,
        level,
        profiles (
          id,
          full_name,
          role
        ),
        departments (
          id,
          name,
          code
        ),
        zones (
          id,
          name,
          code
        )
      `)
      .eq('id', officerId)
      .single();

    if (error || !officer) {
      throw ApiError.notFound('OFFICER_NOT_FOUND', `Officer with ID '${officerId}' not found.`);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: officer.id,
        profile: officer.profiles,
        level: officer.level,
        department: officer.departments,
        zone: officer.zones
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /master-data/admin-metrics
 * Calculates real municipal governance metrics: department count, zone count, officer count, SLA compliance %
 * STRICTLY RESTRICTED TO ADMIN AND COMMISSIONER ROLES
 */
async function getAdminMetrics(req, res, next) {
  try {
    const userClient = createUserClient(req.token);

    // 1. Department count
    const { count: deptCount } = await userClient
      .from('departments')
      .select('id', { count: 'exact', head: true });

    // 2. Zone count
    const { count: zoneCount } = await userClient
      .from('zones')
      .select('id', { count: 'exact', head: true });

    // 3. Active officers count from officers table
    const { count: officerCount } = await userClient
      .from('officers')
      .select('id', { count: 'exact', head: true });

    // 4. Resolved incidents for real SLA compliance calculation
    const { data: resolvedIncidents } = await userClient
      .from('incidents')
      .select('id, sla_deadline, resolved_at')
      .eq('status', 'RESOLVED');

    let slaComplianceRate = 100.0;
    let totalResolved = 0;
    let metSlaCount = 0;

    if (resolvedIncidents && resolvedIncidents.length > 0) {
      totalResolved = resolvedIncidents.length;
      metSlaCount = resolvedIncidents.filter((inc) => {
        if (!inc.sla_deadline || !inc.resolved_at) return true;
        return new Date(inc.resolved_at).getTime() <= new Date(inc.sla_deadline).getTime();
      }).length;

      slaComplianceRate = parseFloat(((metSlaCount / totalResolved) * 100).toFixed(1));
    }

    return res.status(200).json({
      success: true,
      data: {
        departments_count: deptCount || 0,
        zones_count: zoneCount || 0,
        active_officers_count: officerCount || 0,
        sla_compliance_rate: slaComplianceRate,
        total_resolved_incidents: totalResolved,
        met_sla_incidents: metSlaCount
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getZones,
  getDepartments,
  getSlaPolicies,
  getOfficers,
  getOfficerById,
  getAdminMetrics
};
