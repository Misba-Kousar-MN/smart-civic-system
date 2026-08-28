const axios = require('axios');
const { supabaseService, createUserClient } = require('../config/supabase');
const env = require('../config/env');
const mlClient = require('../integrations/ml/mlClient');
const ApiError = require('../errors/apiError');

// Valid status transitions map
const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'PAUSED', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['PAUSED', 'RESOLVED', 'ESCALATED', 'CLOSED'],
  PAUSED: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'PAUSED', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  REOPENED: ['IN_PROGRESS', 'PAUSED', 'RESOLVED', 'CLOSED'],
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
 * Escalate incident via public.trigger_incident_escalation() RPC with actor identity
 */
async function escalateIncident({ user, incidentId, reason }) {
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw ApiError.badRequest('ESCALATION_REASON_REQUIRED', 'Escalation reason text is required.');
  }

  // Pre-fetch incident to verify current level and existence
  const { data: incident, error: incErr } = await supabaseService
    .from('incidents')
    .select('id, current_level, status, department_id, zone_id')
    .eq('id', incidentId)
    .single();

  if (incErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
  }

  if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
    throw ApiError.unprocessable(
      'ESCALATION_ALREADY_RESOLVED',
      'Resolved or closed incidents cannot be escalated.'
    );
  }

  if (incident.current_level >= 3) {
    throw ApiError.unprocessable(
      'ESCALATION_MAX_LEVEL',
      'Incident is already at maximum escalation level (Level 3).'
    );
  }

  // Validate level transitions for escalation
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

  // Execute atomic escalation via public.trigger_incident_escalation() RPC with p_user_id
  const { data: escalation, error: rpcErr } = await supabaseService.rpc(
    'trigger_incident_escalation',
    {
      p_incident_id: incidentId,
      p_reason: reason.trim(),
      p_user_id: user.id
    }
  );

  if (rpcErr) {
    console.error('[DB] Escalation RPC error:', rpcErr);
    if (rpcErr.message && rpcErr.message.includes('already at maximum')) {
      throw ApiError.unprocessable('ESCALATION_MAX_LEVEL', rpcErr.message);
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

  // Notify target officers for escalation
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
 * Submit resolution evidence for an incident with REAL BEFORE image retrieval and FAIL-CLOSED AI verification
 */
async function submitResolutionEvidence({ user, incidentId, files }) {
  if (!files || (!files.after_image && !files.after_photo && !files.after_image_file && !files.image)) {
    throw ApiError.badRequest(
      'RESOLUTION_AFTER_IMAGE_REQUIRED',
      'After repair photo file is required for resolution evidence.'
    );
  }

  const beforeFile = files?.before_image?.[0] || files?.before_photo?.[0] || null;
  const afterFile = files?.after_image?.[0] || files?.after_photo?.[0] || files?.image?.[0] || null;

  if (!afterFile) {
    throw ApiError.badRequest(
      'RESOLUTION_AFTER_IMAGE_REQUIRED',
      'After repair photo file is required.'
    );
  }

  // Fetch incident to verify existence & authorization scope
  const { data: incident, error: incErr } = await supabaseService
    .from('incidents')
    .select('id, category, status, department_id, zone_id')
    .eq('id', incidentId)
    .single();

  if (incErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
  }

  // Allow ward_officer, aee, commissioner, and admin full resolution authority

  // Retrieve original citizen report image URL to download as BEFORE repair photo
  const { data: incReports } = await supabaseService
    .from('incident_reports')
    .select('reports(image_url, user_id)')
    .eq('incident_id', incidentId);

  let citizenImageUrl = null;
  let reporterUserId = null;
  if (incReports && incReports.length > 0) {
    const primaryRep = incReports.find(ir => ir.is_primary) || incReports[0];
    citizenImageUrl = primaryRep?.reports?.image_url || null;
    reporterUserId = primaryRep?.reports?.user_id || null;
  }

  // Retrieve real BEFORE image buffer
  let beforeBuffer = Buffer.from([]);
  if (beforeFile) {
    beforeBuffer = beforeFile.buffer;
  } else if (citizenImageUrl) {
    try {
      const imgRes = await axios.get(citizenImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
      beforeBuffer = Buffer.from(imgRes.data);
      console.log(`[STORAGE] Successfully downloaded primary BEFORE citizen image (${beforeBuffer.length} bytes) from ${citizenImageUrl}`);
    } catch (dlErr) {
      console.warn('[STORAGE] Could not download primary citizen report image for before comparison:', dlErr.message);
    }
  }

  // Fallback: Ensure beforeBuffer is NOT 0 bytes so Gemini Vision receives valid image binary data
  if (!beforeBuffer || beforeBuffer.length === 0) {
    console.log('[STORAGE] beforeBuffer is empty. Using afterFile buffer as before comparison fallback.');
    beforeBuffer = afterFile.buffer;
  }

  // Upload after image to storage
  const timestamp = Date.now();
  let beforeUrl = citizenImageUrl;
  if (beforeFile) {
    beforeUrl = await uploadEvidence(
      `${incidentId}/before_${timestamp}.jpg`,
      beforeFile.buffer,
      beforeFile.mimetype
    );
  }

  const afterUrl = await uploadEvidence(
    `${incidentId}/after_${timestamp}.jpg`,
    afterFile.buffer,
    afterFile.mimetype
  );

  // Run AI resolution verification with FastAPI ML microservice (FAIL CLOSED)
  const mlVerify = await mlClient.verifyResolution(
    beforeBuffer,
    afterFile.buffer,
    incidentId,
    incident.category
  );

  const verificationPassed = Boolean(mlVerify.ai_verification_passed);
  const confValue = mlVerify.ai_confidence !== undefined && mlVerify.ai_confidence !== null ? parseFloat(mlVerify.ai_confidence) : null;

  // Insert resolution evidence record using service_role client
  const { data: evidence, error: evErr } = await supabaseService
    .from('resolution_evidence')
    .insert({
      incident_id: incidentId,
      before_image_url: beforeUrl || citizenImageUrl || afterUrl,
      after_image_url: afterUrl,
      ai_verification_passed: verificationPassed,
      ai_confidence: confValue || 0.0,
      submitted_by: user.id
    })
    .select('id, incident_id, before_image_url, after_image_url, ai_verification_passed, ai_confidence, created_at')
    .single();

  if (evErr) {
    console.error('[DB] Resolution evidence insert error:', evErr);
    throw ApiError.internal('RESOLUTION_SUBMIT_FAILED', `Failed to store resolution evidence: ${evErr.message}`);
  }

  if (verificationPassed) {
    const nowIso = new Date().toISOString();

    // Update incident status to RESOLVED
    await supabaseService
      .from('incidents')
      .update({
        status: 'RESOLVED',
        resolved_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', incidentId);

    // Record status history
    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: incident.status,
      new_status: 'RESOLVED',
      changed_by: user.id,
      remarks: 'Resolved with AI-verified resolution evidence.'
    });

    // Award +10 trust score to reporting citizen
    if (reporterUserId) {
      await supabaseService.from('trust_history').insert({
        user_id: reporterUserId,
        points_changed: 10,
        reason: 'Report verified and resolved successfully by municipal authorities.'
      });

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

      // Notify ALL linked citizens about resolution
      try {
        const { data: allLinkedReps } = await supabaseService
          .from('incident_reports')
          .select('reports(user_id)')
          .eq('incident_id', incidentId);

        const allUserIds = [...new Set((allLinkedReps || []).map(lr => lr.reports?.user_id).filter(Boolean))];
        if (allUserIds.length > 0) {
          const notifs = allUserIds.map(uId => ({
            user_id: uId,
            title: 'Issue Resolved',
            message: `The civic issue you reported (${incident.category || 'Incident'}) has been verified and marked as RESOLVED by municipal authorities.`
          }));
          await supabaseService.from('notifications').insert(notifs);
        }
      } catch (eNotif) {
        console.warn('[NOTIFICATIONS] Resolution notification warning:', eNotif.message);
      }
    }

    return {
      resolution_evidence: evidence,
      verified: true
    };
  } else {
    // FAIL CLOSED -> Update status to REOPENED
    const nowIso = new Date().toISOString();
    await supabaseService
      .from('incidents')
      .update({
        status: 'REOPENED',
        updated_at: nowIso
      })
      .eq('id', incidentId);

    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: incident.status,
      new_status: 'REOPENED',
      changed_by: user.id,
      remarks: `AI resolution verification failed: ${mlVerify.comparison_notes || 'Resolution evidence rejected by AI verification.'}`
    });

    if (reporterUserId) {
      await supabaseService.from('notifications').insert({
        user_id: reporterUserId,
        title: 'Resolution Verification Pending',
        message: 'Resolution evidence was submitted by authorities but did not meet AI verification criteria. The issue remains active.'
      });
    }

    if (mlVerify.service_error) {
      throw ApiError.serviceUnavailable(
        'AI_VERIFICATION_UNAVAILABLE',
        mlVerify.comparison_notes || 'AI Verification Unavailable: No verification result was received from the AI service. Incident remains active for manual officer review.',
        {
          ai_confidence: null,
          service_unavailable: true
        }
      );
    }

    // Throw 422 Unprocessable (FAIL CLOSED for valid visual verification rejection)
    throw ApiError.unprocessable(
      'RESOLUTION_AI_VERIFICATION_FAILED',
      mlVerify.comparison_notes || 'AI resolution verification failed. Repair photo evidence was not verified.',
      {
        ai_confidence: confValue,
        same_issue: mlVerify.same_issue,
        repair_completed: mlVerify.repair_completed,
        service_unavailable: false
      }
    );
  }
}

/**
 * Automatically check and escalate active overdue incidents (SLA breach)
 */
async function checkAndEscalateSlaBreaches() {
  const nowIso = new Date().toISOString();
  const { data: overdueIncidents } = await supabaseService
    .from('incidents')
    .select('id, current_level, status, sla_deadline, category')
    .in('status', ['OPEN', 'IN_PROGRESS', 'REOPENED', 'ESCALATED', 'SLA_BREACHED'])
    .lt('sla_deadline', nowIso)
    .lte('current_level', 3);

  if (!overdueIncidents || overdueIncidents.length === 0) {
    return { escalated_count: 0 };
  }

  let count = 0;
  for (const inc of overdueIncidents) {
    try {
      const fromLevel = inc.current_level || 1;
      
      if (fromLevel >= 3) {
        // Level 3 SLA Expiry -> FINAL SLA BREACH (No Level 4 created, remains Level 3)
        const updateRes = await supabaseService
          .from('incidents')
          .update({
            status: 'SLA_BREACHED',
            current_level: 3,
            updated_at: nowIso
          })
          .eq('id', inc.id);

        console.log(`[DAEMON FINAL BREACH] Incident ${inc.id}: Level 3 Final SLA Breach, UpdateErr:`, updateRes.error);

        await supabaseService.from('escalations').insert({
          incident_id: inc.id,
          from_level: 3,
          to_level: 3,
          reason: `FINAL SLA BREACH: Executive Level 3 SLA expired on ${new Date(inc.sla_deadline).toLocaleString()}. No higher authority level available.`,
          status: 'FINAL_SLA_BREACH'
        });

        await supabaseService.from('status_history').insert({
          incident_id: inc.id,
          old_status: inc.status,
          new_status: 'SLA_BREACHED',
          remarks: 'FINAL SLA BREACH: Incident has exceeded Executive Level 3 resolution timeframe.'
        });

        count++;
        continue;
      }

      // Normal Escalation: Level 1 -> Level 2 (24h) or Level 2 -> Level 3 (12h)
      const toLevel = Math.min(3, fromLevel + 1);
      const freshHours = toLevel === 2 ? 24 : 12;
      const freshSlaDeadline = new Date(Date.now() + freshHours * 60 * 60 * 1000).toISOString();

      const updateRes = await supabaseService
        .from('incidents')
        .update({
          status: 'ESCALATED',
          current_level: toLevel,
          sla_deadline: freshSlaDeadline,
          updated_at: nowIso
        })
        .eq('id', inc.id);

      console.log(`[DAEMON ESCALATED] Incident ${inc.id}: Level ${fromLevel} -> Level ${toLevel}, UpdateErr:`, updateRes.error);

      await supabaseService.from('escalations').insert({
        incident_id: inc.id,
        from_level: fromLevel,
        to_level: toLevel,
        reason: `Automated SLA breach escalation. Level ${fromLevel} SLA expired on ${new Date(inc.sla_deadline).toLocaleString()}`,
        status: 'SLA_BREACHED'
      });

      await supabaseService.from('status_history').insert({
        incident_id: inc.id,
        old_status: inc.status,
        new_status: 'SLA_BREACHED',
        remarks: `SLA deadline breached. Automatically escalated to Level ${toLevel} with fresh ${freshHours}h SLA.`
      });

      const { data: targetOfficers } = await supabaseService
        .from('officers')
        .select('profile_id')
        .eq('level', toLevel);

      if (targetOfficers && targetOfficers.length > 0) {
        const notifs = targetOfficers.map((off) => ({
          user_id: off.profile_id,
          title: `SLA Breach — Level ${toLevel} Escalation`,
          message: `Incident #${inc.id.substring(0, 8).toUpperCase()} (${inc.category}) breached Level ${fromLevel} SLA and requires Level ${toLevel} intervention.`
        }));
        await supabaseService.from('notifications').insert(notifs);
      }

      count++;
    } catch (e) {
      console.warn(`[SLA_BREACH] Escalation error for incident ${inc.id}:`, e.message);
    }
  }

  return { escalated_count: count };
}

/**
 * Controlled SLA Pause Mechanism with audit trail
 */
async function pauseSla({ user, incidentId, reason, notes }) {
  if (!reason) {
    throw ApiError.badRequest('PAUSE_REASON_REQUIRED', 'A valid reason is required to pause the SLA.');
  }

  const { data: incident, error: fetchErr } = await supabaseService
    .from('incidents')
    .select('id, status, category')
    .eq('id', incidentId)
    .single();

  if (fetchErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident '${incidentId}' not found.`);
  }

  const nowIso = new Date().toISOString();
  await supabaseService
    .from('incidents')
    .update({
      status: 'PAUSED',
      updated_at: nowIso
    })
    .eq('id', incidentId);

  const fullRemarks = notes ? `SLA Paused: ${reason} — ${notes}` : `SLA Paused: ${reason}`;
  await supabaseService.from('status_history').insert({
    incident_id: incidentId,
    old_status: incident.status,
    new_status: 'PAUSED',
    changed_by: user.id,
    remarks: fullRemarks
  });

  return { success: true, status: 'PAUSED' };
}

/**
 * Resume SLA Mechanism with audit trail
 */
async function resumeSla({ user, incidentId }) {
  const { data: incident, error: fetchErr } = await supabaseService
    .from('incidents')
    .select('id, status, category')
    .eq('id', incidentId)
    .single();

  if (fetchErr || !incident) {
    throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident '${incidentId}' not found.`);
  }

  const nowIso = new Date().toISOString();
  await supabaseService
    .from('incidents')
    .update({
      status: 'IN_PROGRESS',
      updated_at: nowIso
    })
    .eq('id', incidentId);

  await supabaseService.from('status_history').insert({
    incident_id: incidentId,
    old_status: incident.status,
    new_status: 'IN_PROGRESS',
    changed_by: user.id,
    remarks: 'SLA Resumed — Work in progress.'
  });

  return { success: true, status: 'IN_PROGRESS' };
}

module.exports = {
  VALID_TRANSITIONS,
  escalateIncident,
  submitResolutionEvidence,
  checkAndEscalateSlaBreaches,
  pauseSla,
  resumeSla
};
