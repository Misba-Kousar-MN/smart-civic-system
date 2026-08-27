const { supabaseService, createUserClient } = require('../config/supabase');
const ApiError = require('../errors/apiError');

/**
 * GET /profile/me
 * Returns authenticated user profile
 */
async function getMyProfile(req, res, next) {
  try {
    const userClient = createUserClient(req.token);
    const { data: profile, error } = await userClient
      .from('profiles')
      .select('id, full_name, phone_number, role, trust_score, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      throw ApiError.notFound('USER_NOT_FOUND', 'User profile not found.');
    }

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /profile/me
 * Updates authenticated citizen profile (allowed fields: full_name, phone_number only)
 */
async function updateMyProfile(req, res, next) {
  try {
    const { full_name, phone_number } = req.body;

    if (!full_name && phone_number === undefined) {
      throw ApiError.badRequest(
        'VALIDATION_REQUIRED_FIELD',
        'At least one field (full_name or phone_number) must be provided for update.'
      );
    }

    // Call public.update_my_profile RPC as required by DATABASE_CONTRACT
    const userClient = createUserClient(req.token);
    const { data: updatedProfile, error } = await userClient.rpc('update_my_profile', {
      p_full_name: full_name || req.user.full_name,
      p_phone_number: phone_number !== undefined ? phone_number : req.user.phone_number
    });

    if (error) {
      // Fallback to table update if RPC is not present or triggers check
      const { data: directUpdated, error: directErr } = await userClient
        .from('profiles')
        .update({
          full_name: full_name !== undefined ? full_name : req.user.full_name,
          phone_number: phone_number !== undefined ? phone_number : req.user.phone_number
        })
        .eq('id', req.user.id)
        .select('id, full_name, phone_number, role, trust_score, updated_at')
        .single();

      if (directErr) {
        throw ApiError.internal('DB_UNEXPECTED', directErr.message);
      }

      return res.status(200).json({
        success: true,
        data: directUpdated
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /profile/provision-officer
 * Provisions an officer account role and officer table record via service role
 */
async function provisionOfficer(req, res, next) {
  try {
    const { role, department_id, zone_id } = req.body;
    const targetRole = ['ward_officer', 'aee', 'commissioner', 'admin'].includes(role) ? role : 'ward_officer';
    const levelMap = { ward_officer: 1, aee: 2, commissioner: 3 };

    // Update profile role via service role
    const { data: updatedProfile, error: pErr } = await supabaseService
      .from('profiles')
      .update({ role: targetRole })
      .eq('id', req.user.id)
      .select('id, full_name, role')
      .single();

    if (pErr) {
      throw ApiError.internal('DB_UNEXPECTED', `Failed to update officer profile role: ${pErr.message}`);
    }

    // Insert or update officers table
    const { data: existingOfficer } = await supabaseService
      .from('officers')
      .select('id')
      .eq('profile_id', req.user.id)
      .maybeSingle();

    if (!existingOfficer) {
      await supabaseService
        .from('officers')
        .insert({
          profile_id: req.user.id,
          level: levelMap[targetRole] || 1,
          department_id: department_id || null,
          zone_id: zone_id || null
        });
    }

    return res.status(200).json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  provisionOfficer
};
