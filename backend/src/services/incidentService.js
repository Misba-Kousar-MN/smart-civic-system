const { supabaseService, createUserClient } = require('../config/supabase');
const env = require('../config/env');
const mlClient = require('../integrations/ml/mlClient');
const ApiError = require('../errors/apiError');

// Valid status transitions map
const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  CLOSED: []
};

/**
 * Upload resolution image to storage bucket
 */
async function uploadEvidence(filePath, buffer, mimeType) {
  const bucketName = env.SUPABASE_STORAGE_BUCKET_EVIDENCE;
  try {
    await supabaseService.storage.createBucket(bucketName, { public: true });
  } catch (e) {
    // Bucket exists or created
  }

  const { data, error } = await supabaseService.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error(`[STORAGE] Upload error to ${bucketName}/${filePath}:`, error);
    return `${env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
  }

  const { data: publicUrlData } = supabaseService.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Escalate incident via public.trigger_incident_escalation() RPC
 */
async function escalateIncident({ user, incidentId, reason }) {
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw ApiError.badRequest('ESCALATION_REASON_REQUIRED', 'Escalation reason text is required.');
  }

  // Pre-fetch incident to verify current level and existance
  const { data: incident, error: incErr } = await supabaseService
    .from('incidents')
    .select('id, current_level, status, department_id, zone_id')
    .eq('id', incidentId)
    .single();

  if (incErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
  }

  if (incident.current_level >= 3) {
    throw ApiError.unprocessable(
      'ESCALATION_MAX_LEVEL',
      'Incident is already at maximum escalation level (Level 3).'
    );
  }

  // Pre-validate officer authorization role level
  if (user.role === 'ward_officer' && incident.current_level !== 1) {
    throw ApiError.forbidden(
      'ESCALATION_UNAUTHORIZED',
      'Ward Officer (Level 1) can only escalate Level 1 incidents to Level 2.'
    );
  }

  if (user.role === 'aee' && incident.current_level !== 2) {
    throw ApiError.forbidden(
      'ESCALATION_UNAUTHORIZED',
      'Assistant Executive Engineer (Level 2) can only escalate Level 2 incidents to Level 3.'
    );
  }

  // Execute atomic escalation via public.trigger_incident_escalation() RPC
  const { data: escalation, error: rpcErr } = await supabaseService.rpc(
    'trigger_incident_escalation',
    {
      p_incident_id: incidentId,
      p_reason: reason.trim()
    }
  );

  if (rpcErr) {
    console.error('[DB] Escalation RPC error:', rpcErr);
    if (rpcErr.message && rpcErr.message.includes('already at maximum')) {
      throw ApiError.unprocessable('ESCALATION_MAX_LEVEL', rpcErr.message);
    }
    if (rpcErr.message && rpcErr.message.includes('not authorized')) {
      throw ApiError.forbidden('ESCALATION_UNAUTHORIZED', rpcErr.message);
    }
    throw ApiError.internal('ESCALATION_FAILED', `Escalation transaction failed: ${rpcErr.message}`);
  }

  // Fetch updated incident
  const { data: updatedIncident } = await supabaseService
    .from('incidents')
    .select('id, current_level, status')
    .eq('id', incidentId)
    .single();

  const toLevel = incident.current_level + 1;

  // Notify higher-level officers or administrators
  // Fetch target officers for notification
  const { data: targetOfficers } = await supabaseService
    .from('officers')
    .select('profile_id')
    .eq('level', toLevel);

  if (targetOfficers && targetOfficers.length > 0) {
    const notifs = targetOfficers.map((off) => ({
      user_id: off.profile_id,
      title: 'Incident Escalated',
      message: `Incident #${incidentId.substring(0, 8)} has been escalated to Level ${toLevel}. Reason: ${reason}`
    }));
    await supabaseService.from('notifications').insert(notifs);
  }

  return {
    escalation: escalation || {
      incident_id: incidentId,
      from_level: incident.current_level,
      to_level: toLevel,
      reason: reason,
      triggered_at: new Date().toISOString(),
      status: 'TRIGGERED'
    },
    incident: updatedIncident || {
      id: incidentId,
      current_level: toLevel,
      status: 'ESCALATED'
    }
  };
}

/**
 * Submit resolution evidence for an incident
 */
async function submitResolutionEvidence({ user, incidentId, files }) {
  if (!files || !files.before_image || !files.before_image[0]) {
    throw ApiError.badRequest(
      'RESOLUTION_BEFORE_IMAGE_REQUIRED',
      'Before image file is required.'
    );
  }
  if (!files || !files.after_image || !files.after_image[0]) {
    throw ApiError.badRequest(
      'RESOLUTION_AFTER_IMAGE_REQUIRED',
      'After image file is required.'
    );
  }

  const beforeFile = files.before_image[0];
  const afterFile = files.after_image[0];

  // Fetch incident to verify existence and original category
  const { data: incident, error: incErr } = await supabaseService
    .from('incidents')
    .select('id, category, status')
    .eq('id', incidentId)
    .single();

  if (incErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
  }

  // Upload images to Supabase Storage
  const timestamp = Date.now();
  const beforeUrl = await uploadEvidence(
    `${incidentId}/before_${timestamp}.jpg`,
    beforeFile.buffer,
    beforeFile.mimetype
  );
  const afterUrl = await uploadEvidence(
    `${incidentId}/after_${timestamp}.jpg`,
    afterFile.buffer,
    afterFile.mimetype
  );

  // Run AI verification with FastAPI ML microservice
  const mlVerify = await mlClient.verifyResolution(
    beforeFile.buffer,
    afterFile.buffer,
    incidentId,
    incident.category
  );

  // Insert resolution evidence record using service_role client
  const { data: evidence, error: evErr } = await supabaseService
    .from('resolution_evidence')
    .insert({
      incident_id: incidentId,
      before_image_url: beforeUrl,
      after_image_url: afterUrl,
      ai_verification_passed: mlVerify.ai_verification_passed,
      ai_confidence: mlVerify.ai_confidence,
      submitted_by: user.id
    })
    .select('id, incident_id, before_image_url, after_image_url, ai_verification_passed, ai_confidence, created_at')
    .single();

  if (evErr) {
    console.error('[DB] Resolution evidence insert error:', evErr);
    throw ApiError.internal('RESOLUTION_SUBMIT_FAILED', `Failed to store resolution evidence: ${evErr.message}`);
  }

  if (mlVerify.ai_verification_passed) {
    const nowIso = new Date().toISOString();

    // Update incident status to RESOLVED
    await supabaseService
      .from('incidents')
      .update({
        status: 'RESOLVED',
        resolved_at: nowIso
      })
      .eq('id', incidentId);

    // Insert status_history record
    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: incident.status,
      new_status: 'RESOLVED',
      changed_by: user.id,
      remarks: 'Resolved with AI-verified evidence.'
    });

    // Find citizen(s) who reported this issue and award +10 trust score
    const { data: incReports } = await supabaseService
      .from('incident_reports')
      .select('reports(user_id)')
      .eq('incident_id', incidentId);

    if (incReports && incReports.length > 0) {
      for (const ir of incReports) {
        if (ir.reports && ir.reports.user_id) {
          const reporterUserId = ir.reports.user_id;

          // Record trust history log
          await supabaseService.from('trust_history').insert({
            user_id: reporterUserId,
            points_changed: 10,
            reason: 'Report resolved successfully by municipal officer.'
          });

          // Fetch citizen trust score and update
          const { data: citizenProfile } = await supabaseService
            .from('profiles')
            .select('trust_score')
            .eq('id', reporterUserId)
            .single();

          if (citizenProfile) {
            const newScore = Math.min(100, (citizenProfile.trust_score || 100) + 10);
            await supabaseService
              .from('profiles')
              .update({ trust_score: newScore })
              .eq('id', reporterUserId);
          }

          // Notify citizen
          await supabaseService.from('notifications').insert({
            user_id: reporterUserId,
            title: 'Issue Resolved',
            message: 'The civic issue you reported has been verified and marked as RESOLVED by municipal authorities. +10 Trust Score awarded!'
          });
        }
      }
    }

    return {
      resolution_evidence: evidence,
      verified: true
    };
  } else {
    // If AI verification failed, throw 422 Unprocessable
    throw ApiError.unprocessable(
      'RESOLUTION_AI_VERIFICATION_FAILED',
      mlVerify.comparison_notes || 'AI verification determined issue is not adequately resolved from the provided after image.'
    );
  }
}

module.exports = {
  VALID_TRANSITIONS,
  escalateIncident,
  submitResolutionEvidence
};
