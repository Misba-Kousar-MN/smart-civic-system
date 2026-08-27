const reportService = require('../services/reportService');
const { supabaseService, createUserClient } = require('../config/supabase');
const ApiError = require('../errors/apiError');
const mlClient = require('../integrations/ml/mlClient');

/**
 * POST /reports
 * Submit a new citizen report
 */
async function submitReport(req, res, next) {
  try {
    const { latitude, longitude, voice_transcript, category_hint } = req.body;

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
      voice_transcript,
      category_hint
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
 * POST /reports/transcribe
 * Standalone Whisper speech-to-text transcription for voice recording preview
 */
async function transcribeAudio(req, res, next) {
  try {
    const voiceFile = req.files?.voice_note ? req.files.voice_note[0] : null;
    if (!voiceFile) {
      throw ApiError.badRequest('VOICE_NOTE_REQUIRED', 'Voice note audio file is required for transcription.');
    }

    const result = await mlClient.transcribeAudio(voiceFile.buffer, voiceFile.originalname);
    if (!result.success) {
      throw ApiError.internal('TRANSCRIPTION_FAILED', 'Whisper speech-to-text transcription service unavailable.');
    }

    const transcriptText = (result.transcript || '').trim();

    return res.status(200).json({
      success: true,
      data: {
        transcript: transcriptText || null,
        empty_speech: !transcriptText,
        language: result.language || 'en',
        model_version: result.model_version || 'whisper-tiny'
      },
      message: transcriptText ? 'Audio transcribed successfully.' : 'Whisper could not detect speech in this recording.'
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
      .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at, incident_reports(incident_id, is_primary, incidents(id, status, priority_level, sla_deadline, category))', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rawReports, count, error } = await query;

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    const reports = (rawReports || []).map((r) => {
      const incReport = Array.isArray(r.incident_reports) ? r.incident_reports[0] : r.incident_reports;
      const inc = incReport?.incidents || null;
      return {
        ...r,
        incident_id: inc?.id || incReport?.incident_id || null,
        status: inc?.status || 'OPEN',
        priority_level: inc?.priority_level || 'MEDIUM',
        sla_deadline: inc?.sla_deadline || null,
        category: inc?.category || r.ai_category || 'Civic Issue'
      };
    });

    // Fetch overall status breakdown for all reports submitted by the authenticated citizen
    const { data: allUserReports } = await userClient
      .from('reports')
      .select('id, incident_reports(incidents(status))')
      .eq('user_id', req.user.id);

    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    (allUserReports || []).forEach((r) => {
      const incReport = Array.isArray(r.incident_reports) ? r.incident_reports[0] : r.incident_reports;
      const st = incReport?.incidents?.status || 'OPEN';
      if (st === 'RESOLVED' || st === 'CLOSED') {
        resolvedCount++;
      } else if (st === 'IN_PROGRESS' || st === 'ESCALATED' || st === 'PAUSED' || st === 'REOPENED') {
        inProgressCount++;
      } else {
        openCount++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        reports: reports,
        status_counts: {
          open: openCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          total: count !== null && count !== undefined ? count : (allUserReports ? allUserReports.length : 0)
        },
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

    const { data: rawReport, error } = await userClient
      .from('reports')
      .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at, incident_reports(incident_id, is_primary, incidents(id, status, priority_level, sla_deadline, category, current_level, created_at))')
      .eq('id', reportId)
      .single();

    if (error || !rawReport) {
      throw ApiError.notFound('REPORT_NOT_FOUND', `Report with ID '${reportId}' not found.`);
    }

    const incReport = Array.isArray(rawReport.incident_reports) ? rawReport.incident_reports[0] : rawReport.incident_reports;
    const inc = incReport?.incidents || null;
    const incId = inc?.id || incReport?.incident_id || null;

    let resolutionEvidence = null;
    if (incId) {
      const { data: revData } = await supabaseService
        .from('resolution_evidence')
        .select('*')
        .eq('incident_id', incId)
        .order('created_at', { ascending: false })
        .maybeSingle();
      resolutionEvidence = revData;
    }

    const report = {
      ...rawReport,
      incident_id: incId,
      status: inc?.status || 'OPEN',
      priority_level: inc?.priority_level || 'MEDIUM',
      sla_deadline: inc?.sla_deadline || null,
      category: inc?.category || rawReport.ai_category || 'Civic Issue',
      resolution_evidence: resolutionEvidence || null
    };

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
  transcribeAudio,
  getReports,
  getReportById
};
