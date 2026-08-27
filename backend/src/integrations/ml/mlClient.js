const axios = require('axios');
const FormData = require('form-data');
const env = require('../../config/env');

const CANONICAL_CATEGORIES = [
  'Pothole',
  'Road Damage',
  'Garbage Dump',
  'Drainage Blockage',
  'Streetlight Failure',
  'Water Leakage',
  'Broken Footpath',
  'Encroachment',
  'Tree Fall',
  'Manhole Uncovered',
  'Other'
];

/**
 * Detect civic issue by calling the FastAPI ML Service over HTTP
 */
async function detectCivicIssue(imageBuffer, originalFilename, reportId, categoryHint) {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: originalFilename || 'report_image.jpg',
      contentType: 'image/jpeg'
    });
    if (reportId) {
      formData.append('report_id', reportId);
    }
    if (categoryHint) {
      formData.append('category_hint', categoryHint);
    }

    const response = await axios.post(`${env.ML_SERVICE_URL}/detect`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Internal-API-Key': env.ML_INTERNAL_API_KEY
      },
      timeout: env.ML_TIMEOUT_MS
    });

    if (response.data && response.data.success && response.data.data) {
      const mlData = response.data.data;
      return {
        detected: Boolean(mlData.detected),
        ai_category: mlData.ai_category || null,
        ai_confidence: typeof mlData.ai_confidence === 'number' ? mlData.ai_confidence : null,
        description: mlData.description || null,
        bounding_boxes: mlData.bounding_boxes || [],
        model_version: mlData.model_version || 'fastapi-ml-v1',
        error: mlData.error || null,
        gemini_called: Boolean(mlData.gemini_called),
        gemini_http_status: mlData.gemini_http_status ?? 200,
        gemini_category: mlData.gemini_category ?? null,
        gemini_confidence: mlData.gemini_confidence ?? null
      };
    }
  } catch (err) {
    console.error(`[ML_CLIENT] Error communicating with FastAPI ML service (${err.message}). Defaulting.`);
  }

  return {
    detected: false,
    ai_category: null,
    ai_confidence: null,
    description: null,
    bounding_boxes: [],
    model_version: 'fastapi-ml-fallback',
    error: 'AI_UNAVAILABLE'
  };
}

/**
 * Verify resolution evidence by calling the FastAPI ML Service over HTTP
 * STRICT SAFETY RULE: AI VERIFICATION MUST FAIL CLOSED
 */
async function verifyResolution(beforeBuffer, afterBuffer, incidentId, aiCategory) {
  try {
    const formData = new FormData();
    formData.append('before_image', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' });
    formData.append('after_image', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' });
    if (incidentId) {
      formData.append('incident_id', incidentId);
    }
    formData.append('ai_category', aiCategory || 'Other');

    const response = await axios.post(`${env.ML_SERVICE_URL}/verify-resolution`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Internal-API-Key': env.ML_INTERNAL_API_KEY
      },
      timeout: env.ML_TIMEOUT_MS
    });

    if (response.data && response.data.success && response.data.data) {
      const mlData = response.data.data;
      return {
        ai_verification_passed: Boolean(mlData.ai_verification_passed),
        ai_confidence: mlData.ai_confidence !== undefined && mlData.ai_confidence !== null ? mlData.ai_confidence : null,
        comparison_notes: mlData.comparison_notes || 'Resolution evidence processed by FastAPI ML service.',
        same_issue: mlData.same_issue !== undefined ? Boolean(mlData.same_issue) : true,
        repair_completed: mlData.repair_completed !== undefined ? Boolean(mlData.repair_completed) : false,
        service_error: Boolean(mlData.service_error),
        model_version: mlData.model_version || 'fastapi-ml-v1'
      };
    }
  } catch (err) {
    console.error(`[ML_CLIENT] Error communicating with FastAPI resolution service (${err.message}). Failing closed.`);
  }

  // STRICT FAIL CLOSED ON ERROR / TIMEOUT / UNHEALTHY ML SERVICE
  return {
    ai_verification_passed: false,
    ai_confidence: null,
    comparison_notes: 'AI Verification Unavailable: No verification result was received from the AI service. Incident remains active for manual officer review.',
    same_issue: false,
    repair_completed: false,
    service_error: true,
    model_version: 'fastapi-ml-failclosed'
  };
}

/**
 * Transcribe audio voice note by calling FastAPI ML Service /ml/v1/transcribe over HTTP
 */
async function transcribeAudio(audioBuffer, filename) {
  try {
    const formData = new FormData();
    const cleanFilename = (filename || 'voice_note.webm').split(';')[0].trim();
    const rawExt = cleanFilename.split('.').pop() || 'webm';
    const ext = rawExt.toLowerCase();
    const contentType = ext === 'wav' ? 'audio/wav' : ext === 'mp4' ? 'audio/mp4' : ext === 'ogg' ? 'audio/ogg' : 'audio/webm';

    formData.append('audio', audioBuffer, {
      filename: cleanFilename,
      contentType: contentType
    });

    const response = await axios.post(`${env.ML_SERVICE_URL}/transcribe`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Internal-API-Key': env.ML_INTERNAL_API_KEY
      },
      timeout: 30000
    });

    if (response.data && response.data.success && response.data.data) {
      const mlData = response.data.data;
      return {
        success: true,
        transcript: mlData.transcript || '',
        language: mlData.language || 'en',
        model_version: mlData.model_version || 'whisper-tiny',
        processing_time_ms: mlData.processing_time_ms || 0
      };
    }
  } catch (err) {
    console.error(`[ML_CLIENT] Error communicating with FastAPI transcription service (${err.message}).`);
  }

  return {
    success: false,
    transcript: null,
    language: null,
    model_version: 'whisper-failed'
  };
}

/**
 * Check FastAPI ML Service Health
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${env.ML_SERVICE_URL}/health`, {
      headers: { 'X-Internal-API-Key': env.ML_INTERNAL_API_KEY },
      timeout: 5000
    });
    return response.data;
  } catch (err) {
    return {
      success: false,
      error: { code: 'ML_SERVICE_UNAVAILABLE', message: err.message }
    };
  }
}

module.exports = {
  CANONICAL_CATEGORIES,
  detectCivicIssue,
  verifyResolution,
  transcribeAudio,
  checkHealth
};
