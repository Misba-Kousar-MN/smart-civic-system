const reportService = require('../services/reportService');
const { createUserClient } = require('../config/supabase');
const ApiError = require('../errors/apiError');

/**
 * POST /reports
 * Submit a new citizen report
 */
async function submitReport(req, res, next) {
  try {
    const { latitude, longitude, voice_transcript } = req.body;

    const errors = {};
    if (!latitude) errors.latitude = 'Latitude is required.';
    if (!longitude) errors.longitude = 'Longitude is required.';

    if (Object.keys(errors).length > 0) {
      throw ApiError.badRequest(
        'VALIDATION_REQUIRED_FIELD',
        'One or more required fields are missing or invalid.',
        errors
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      throw ApiError.badRequest(
        'VALIDATION_INVALID_COORDINATES',
        'Latitude or longitude is out of valid spatial coordinate range.'
      );
    }

    const result = await reportService.submitReport({
      userId: req.user.id,
      token: req.token,
      files: req.files,
      latitude: lat,
      longitude: lng,
      voice_transcript
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Report submitted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /reports
 * List reports submitted by the authenticated citizen
 */
async function getReports(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const userClient = createUserClient(req.token);

    let query = userClient
      .from('reports')
      .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: reports, count, error } = await query;

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        reports: reports || [],
        pagination: {
          page: page,
          limit: limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /reports/:reportId
 * Get details of a single report
 */
async function getReportById(req, res, next) {
  try {
    const { reportId } = req.params;
    const userClient = createUserClient(req.token);

    const { data: report, error } = await userClient
      .from('reports')
      .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      throw ApiError.notFound('REPORT_NOT_FOUND', `Report with ID '${reportId}' not found.`);
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitReport,
  getReports,
  getReportById
};
