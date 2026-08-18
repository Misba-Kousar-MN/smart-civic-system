const { supabaseService } = require('../config/supabase');
const ApiError = require('../errors/apiError');

/**
 * Middleware to authenticate requests via Supabase JWT
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('AUTH_TOKEN_MISSING', 'Authorization header with Bearer token is required.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('AUTH_TOKEN_MISSING', 'Bearer token is missing.');
    }

    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
    if (authError || !user) {
      throw ApiError.unauthorized('AUTH_TOKEN_INVALID', 'Invalid or expired access token.');
    }

    // Fetch application profile role and metadata from public.profiles
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, full_name, phone_number, role, trust_score')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw ApiError.unauthorized('AUTH_TOKEN_INVALID', 'User profile record not found.');
    }

    // Fetch officer metadata if applicable
    let officer = null;
    if (['ward_officer', 'aee', 'commissioner'].includes(profile.role)) {
      const { data: officerData } = await supabaseService
        .from('officers')
        .select('id, profile_id, level, department_id, zone_id')
        .eq('profile_id', user.id)
        .maybeSingle();
      officer = officerData;
    }

    req.user = {
      id: profile.id,
      email: user.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role,
      trust_score: profile.trust_score,
      officer: officer
    };

    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role authorization middleware factory
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('AUTH_TOKEN_MISSING', 'Authentication is required.'));
    }

    // Admin role has full access
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          'AUTH_INSUFFICIENT_ROLE',
          `Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
