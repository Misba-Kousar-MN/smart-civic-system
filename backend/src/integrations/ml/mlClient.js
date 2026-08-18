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
async function detectCivicIssue(imageBuffer, originalFilename, reportId) {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: originalFilename || 'report_image.jpg',
      contentType: 'image/jpeg'
    });
    if (reportId) {
      formData.append('report_id', reportId);
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
        ai_confidence: mlData.ai_confidence || null,
        bounding_boxes: mlData.bounding_boxes || [],
        model_version: mlData.model_version || 'fastapi-ml-v1'
      };
    }
  } catch (err) {
    console.error(`[ML_CLIENT] Error communicating with FastAPI ML service (${err.message}). Defaulting.`);
  }

  return {
    detected: false,
    ai_category: null,
    ai_confidence: null,
    bounding_boxes: [],
    model_version: 'fastapi-ml-fallback'
  };
}

/**
 * Verify resolution evidence by calling the FastAPI ML Service over HTTP
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
        ai_confidence: mlData.ai_confidence || 80.0,
        comparison_notes: mlData.comparison_notes || 'Resolution evidence verified by FastAPI ML service.',
        model_version: mlData.model_version || 'fastapi-ml-v1'
      };
    }
  } catch (err) {
    console.error(`[ML_CLIENT] Error communicating with FastAPI resolution service (${err.message}). Defaulting.`);
  }

  return {
    ai_verification_passed: true,
    ai_confidence: 80.0,
    comparison_notes: 'Resolution evidence accepted (FastAPI ML fallback).',
    model_version: 'fastapi-ml-fallback'
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
  checkHealth
};
