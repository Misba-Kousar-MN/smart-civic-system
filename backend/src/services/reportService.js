const { v4: uuidv4 } = require('uuid');
const { supabaseService, createUserClient } = require('../config/supabase');
const env = require('../config/env');
const mlClient = require('../integrations/ml/mlClient');
const ApiError = require('../errors/apiError');
const {
  determineSeverity,
  calculatePriorityScore,
  calculateSlaDeadline,
  resolveDepartmentCode,
  haversineDistanceMeters,
  parseLocationPoint
} = require('./intelligenceService');

/**
 * Upload buffer to Supabase Storage bucket (auto-creates bucket if missing)
 */
async function uploadToStorage(bucketName, filePath, buffer, mimeType) {
  try {
    await supabaseService.storage.createBucket(bucketName, { public: true });
  } catch (e) {
    // Bucket already exists or created
  }

  let attempts = 0;
  let lastError = null;
  while (attempts < 3) {
    try {
      attempts++;
      const { data, error } = await supabaseService.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.warn(`[STORAGE] Upload warning to ${bucketName}/${filePath} (attempt ${attempts}):`, error.message);
        lastError = error;
      } else {
        const { data: publicUrlData } = supabaseService.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn(`[STORAGE] Network warning (attempt ${attempts}):`, err.message);
      lastError = err;
    }
    if (attempts < 3) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}

/**
 * Submit a new civic issue report with optional audio upload & Whisper speech-to-text
 */
async function submitReport({ userId, token, files, latitude, longitude, voice_transcript, category_hint }) {
  const reportId = uuidv4();

  if (!files || !files.image || !files.image[0]) {
    throw ApiError.badRequest('VALIDATION_REQUIRED_FIELD', 'An image file is required.', {
      image: 'An image file is required.'
    });
  }

  const imageFile = files.image[0];
  const voiceFile = files && files.voice_note ? files.voice_note[0] : null;

  console.log(`[REPORT] report_id = ${reportId}`);
  console.log(`[REPORT] image_filename = ${imageFile.originalname}, bytes = ${imageFile.buffer ? imageFile.buffer.length : 0}`);

  // 1. Upload image to Supabase Storage
  const imagePath = `${userId}/${reportId}_image.${imageFile.mimetype.split('/')[1] || 'jpg'}`;
  const imageUrl = await uploadToStorage(
    env.SUPABASE_STORAGE_BUCKET_REPORTS,
    imagePath,
    imageFile.buffer,
    imageFile.mimetype
  );

  // Upload optional voice note & run Whisper speech-to-text transcription
  let voiceNoteUrl = null;
  let finalTranscript = voice_transcript || null;

  if (voiceFile) {
    const cleanMime = (voiceFile.mimetype || 'audio/webm').split(';')[0].toLowerCase().trim();
    const rawSub = cleanMime.split('/')[1] || 'webm';
    const ext = rawSub.replace('x-', '').replace('mpeg', 'mp3');
    const cleanOriginalName = (voiceFile.originalname || `voice.${ext}`).split(';')[0].trim();
    const voicePath = `${userId}/${reportId}_voice.${ext}`;

    voiceNoteUrl = await uploadToStorage(
      env.SUPABASE_STORAGE_BUCKET_REPORTS,
      voicePath,
      voiceFile.buffer,
      cleanMime
    );

    try {
      const transcribeRes = await mlClient.transcribeAudio(voiceFile.buffer, cleanOriginalName);
      if (transcribeRes && transcribeRes.success && transcribeRes.transcript) {
        finalTranscript = transcribeRes.transcript;
        console.log(`[WHISPER] Audio transcribed successfully: "${finalTranscript}"`);
      }
    } catch (sttErr) {
      console.warn('[WHISPER] Speech-to-text warning:', sttErr.message);
    }
  }

  // 2. Call FastAPI ML service for civic issue detection (YOLO26 + Gemini Hybrid)
  console.log(`[ML] Requesting AI detection for report_id = ${reportId}...`);
  const mlResult = await mlClient.detectCivicIssue(
    imageFile.buffer,
    imageFile.originalname,
    reportId,
    category_hint
  );
  console.log(`[ML] Detection result: detected = ${mlResult.detected}, category = '${mlResult.ai_category}', conf = ${mlResult.ai_confidence}%, desc = '${mlResult.description}', version = '${mlResult.model_version}'`);

  // Real AI Confidence & Category Resolution (4 Distinct Cases):
  let resolvedCategory = 'Other';
  let resolvedConfidence = null;

  if (mlResult.detected && mlResult.ai_category) {
    // CASE 1: Successful detection of civic issue
    resolvedCategory = mlResult.ai_category;
    resolvedConfidence = typeof mlResult.ai_confidence === 'number' ? mlResult.ai_confidence : null;
  } else if (mlResult.error === 'RATE_LIMIT_EXHAUSTED' || mlResult.error === 'AI_UNAVAILABLE') {
    // CASE 4: Rate limit / Quota / Service Unavailable
    resolvedCategory = category_hint || 'Other';
    resolvedConfidence = null;
  } else {
    // CASE 2 & 3: Non-civic image or unclassified -> Category 'Other', confidence null
    resolvedCategory = category_hint || 'Other';
    resolvedConfidence = null;
  }

  // Requirement 10: If citizen description is empty, use Gemini-generated description or factual visual summary
  if ((!finalTranscript || !finalTranscript.trim() || finalTranscript === 'null') && mlResult.description && mlResult.description !== 'null') {
    finalTranscript = mlResult.description.trim();
    console.log(`[DESCRIPTION] Empty citizen description. Using Gemini generated description: "${finalTranscript}"`);
  } else if (!finalTranscript || !finalTranscript.trim() || finalTranscript === 'null') {
    finalTranscript = `Factual visual inspection: ${resolvedCategory} issue reported at location (${latitude}, ${longitude}).`;
    console.log(`[DESCRIPTION] Empty citizen description. Generated visual summary: "${finalTranscript}"`);
  }

  console.log(`[AI_RESOLUTION] Final Category: '${resolvedCategory}', Confidence: ${resolvedConfidence !== null ? resolvedConfidence + '%' : 'null'}`);

  const pointWkt = `POINT(${longitude} ${latitude})`;
  const userClient = (token && typeof token === 'string' && token.split('.').length === 3) ? createUserClient(token) : supabaseService;

  // 3. Insert report record using user client
  console.log(`[DB] Inserting report ${reportId}...`);
  const { data: report, error: reportErr } = await userClient
    .from('reports')
    .insert({
      id: reportId,
      user_id: userId,
      image_url: imageUrl,
      voice_note_url: voiceNoteUrl,
      voice_transcript: finalTranscript,
      location: pointWkt
    })
    .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at')
    .single();

  if (reportErr) {
    console.error('[DB] Report insert error:', reportErr);
    throw ApiError.internal('REPORT_SUBMIT_FAILED', `Failed to save report: ${reportErr.message}`);
  }

  // Always update AI fields via service_role to ensure PostgreSQL persistence
  console.log(`[DB] Updating report ${reportId} via service_role with ai_category = '${resolvedCategory}', conf = ${resolvedConfidence}...`);
  const { error: updateAiErr } = await supabaseService
    .from('reports')
    .update({
      ai_category: resolvedCategory,
      ai_confidence: resolvedConfidence,
      voice_transcript: finalTranscript
    })
    .eq('id', reportId);

  if (updateAiErr) {
    console.error('[DB] Failed to update AI category via service_role:', updateAiErr);
  }

  report.ai_category = resolvedCategory;
  report.ai_confidence = resolvedConfidence;
  report.voice_transcript = finalTranscript;

  // Add parsed location object for contract response format
  report.location = { latitude, longitude };

  // 4. Fetch Citizen Trust Score from Profile (default 100)
  let citizenTrustScore = 100;
  try {
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('trust_score')
      .eq('id', userId)
      .single();
    if (profile && typeof profile.trust_score === 'number') {
      citizenTrustScore = profile.trust_score;
    }
  } catch (e) {
    // Fall back to 100
  }

function areCategoriesCompatible(cat1, cat2) {
  if (!cat1 || !cat2) return false;
  const c1 = cat1.toLowerCase().trim();
  const c2 = cat2.toLowerCase().trim();
  if (c1 === c2) return true;
  if ((c1.includes('garbage') || c1.includes('trash') || c1.includes('sanitation')) &&
      (c2.includes('garbage') || c2.includes('trash') || c2.includes('sanitation'))) {
    return true;
  }
  if ((c1.includes('drain') || c1.includes('sewage') || c1.includes('gutter')) &&
      (c2.includes('drain') || c2.includes('sewage') || c2.includes('gutter'))) {
    return true;
  }
  if ((c1.includes('road') || c1.includes('pothole')) &&
      (c2.includes('road') || c2.includes('pothole'))) {
    return true;
  }
  if ((c1.includes('water') || c1.includes('pipe') || c1.includes('leak')) &&
      (c2.includes('water') || c2.includes('pipe') || c2.includes('leak'))) {
    return true;
  }
  return false;
}

  // 5. Spatial Deduplication Check (~50m radius) against open incidents with compatible category
  const radiusMeters = env.SPATIAL_DEDUPLICATION_RADIUS_METERS || 50;

  let linkedIncident = null;
  let isNew = false;

  // Query open active incidents
  try {
    const { data: openIncidents } = await supabaseService
      .from('incidents')
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS', 'REOPENED', 'ESCALATED']);

    if (openIncidents && openIncidents.length > 0) {
      for (const inc of openIncidents) {
        if (areCategoriesCompatible(inc.category, resolvedCategory)) {
          const pt = parseLocationPoint(inc.location);
          if (pt) {
            const dist = haversineDistanceMeters(latitude, longitude, pt.latitude, pt.longitude);
            if (dist <= radiusMeters) {
              linkedIncident = inc;
              break;
            }
          }
        }
      }
    }
  } catch (dedupErr) {
    console.warn('[DEDUPLICATION] Spatial check warning:', dedupErr.message);
  }

  if (linkedIncident) {
    // LINK TO EXISTING INCIDENT
    isNew = false;
    await supabaseService.from('incident_reports').insert({
      incident_id: linkedIncident.id,
      report_id: reportId,
      is_primary: false
    });

    const { data: linkedReports } = await supabaseService
      .from('incident_reports')
      .select('id')
      .eq('incident_id', linkedIncident.id);

    const relatedReportsCount = linkedReports ? linkedReports.length : 1;

    const { priorityScore, priorityLevel } = calculatePriorityScore({
      severity: linkedIncident.severity,
      relatedReportsCount: relatedReportsCount,
      locationImpact: 50,
      createdAt: linkedIncident.created_at,
      trustScore: citizenTrustScore
    });

    const { slaDeadline } = calculateSlaDeadline(priorityLevel, linkedIncident.created_at);

    const { data: updatedInc } = await supabaseService
      .from('incidents')
      .update({
        priority_score: priorityScore,
        priority_level: priorityLevel,
        sla_deadline: slaDeadline,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkedIncident.id)
      .select('id, status, priority_level, sla_deadline')
      .single();

    if (updatedInc) {
      linkedIncident = updatedInc;
    }
  } else {
    // CREATE NEW INCIDENT
    isNew = true;
    const category = resolvedCategory;
    const severity = determineSeverity(category);

    const { priorityScore, priorityLevel } = calculatePriorityScore({
      severity: severity,
      relatedReportsCount: 1,
      locationImpact: 50,
      createdAt: new Date(),
      trustScore: citizenTrustScore
    });

    const now = new Date();
    const { slaDeadline } = calculateSlaDeadline(priorityLevel, now);

    const deptCode = resolveDepartmentCode(category);
    let dept = null;
    if (deptCode) {
      const { data: deptData } = await supabaseService
        .from('departments')
        .select('id')
        .eq('code', deptCode)
        .maybeSingle();
      dept = deptData;
    }

    let zoneId = null;
    try {
      const { data: zoneRpcData } = await supabaseService.rpc('find_zone_for_location', {
        p_longitude: longitude,
        p_latitude: latitude
      });
      if (zoneRpcData) {
        zoneId = zoneRpcData;
      }
    } catch (e) {
      // Fall back to first available zone
    }

    if (!zoneId) {
      const { data: zones } = await supabaseService.from('zones').select('id').limit(1);
      if (zones && zones.length > 0) {
        zoneId = zones[0].id;
      }
    }

    const incidentId = uuidv4();

    const { data: newIncident, error: incErr } = await supabaseService
      .from('incidents')
      .insert({
        id: incidentId,
        category: category,
        severity: severity,
        priority_score: priorityScore,
        priority_level: priorityLevel,
        location: pointWkt,
        address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        zone_id: zoneId,
        department_id: dept ? dept.id : null,
        current_level: 1,
        status: 'OPEN',
        sla_started_at: now.toISOString(),
        sla_deadline: slaDeadline
      })
      .select('id, category, severity, priority_level, status, current_level, sla_deadline, created_at')
      .single();

    if (incErr) {
      console.error('[DB] Incident insert error:', incErr);
      throw ApiError.internal('REPORT_SUBMIT_FAILED', `Failed to create incident: ${incErr.message}`);
    }

    await supabaseService.from('incident_reports').insert({
      incident_id: incidentId,
      report_id: reportId,
      is_primary: true
    });

    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: null,
      new_status: 'OPEN',
      changed_by: userId,
      remarks: 'Incident created from citizen report.'
    });

    linkedIncident = newIncident;
  }

  // 6. Dispatch notification to citizen
  await supabaseService.from('notifications').insert({
    user_id: userId,
    title: 'Report Submitted',
    message: isNew
      ? `Your civic report for ${resolvedCategory} has been submitted and registered.`
      : `Your report was merged with an existing active incident.`
  });

  console.log(`[API] Returning response for report_id = ${reportId}, ai_category = '${report.ai_category}', ai_confidence = ${report.ai_confidence}`);

  return {
    report: report,
    incident: {
      id: linkedIncident.id,
      status: linkedIncident.status,
      priority_level: linkedIncident.priority_level || 'MEDIUM',
      sla_deadline: linkedIncident.sla_deadline,
      is_new: isNew
    }
  };
}

module.exports = {
  submitReport
};
