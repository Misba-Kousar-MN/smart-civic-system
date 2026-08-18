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
 * Returns directory of officers
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
        )
      `)
      .order('level', { ascending: true });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    const formattedOfficers = (officers || []).map((off) => ({
      id: off.id,
      profile_id: off.profile_id,
      full_name: off.profiles ? off.profiles.full_name : 'Unknown Officer',
      level: off.level,
      department_id: off.department_id,
      zone_id: off.zone_id
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
 * Returns single officer details
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

module.exports = {
  getZones,
  getDepartments,
  getSlaPolicies,
  getOfficers,
  getOfficerById
};
