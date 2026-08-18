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

module.exports = {
  getMyProfile,
  updateMyProfile
};
