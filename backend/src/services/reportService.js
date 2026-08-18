const { v4: uuidv4 } = require('uuid');
const { supabaseService, createUserClient } = require('../config/supabase');
const env = require('../config/env');
const mlClient = require('../integrations/ml/mlClient');
const ApiError = require('../errors/apiError');

// Department mapping based on AI category
const CATEGORY_DEPARTMENT_MAP = {
  Pothole: 'ROADS',
  'Road Damage': 'ROADS',
  'Broken Footpath': 'ROADS',
  'Encroachment': 'ROADS',
  'Garbage Dump': 'SANITATION',
  'Drainage Blockage': 'UGD',
  'Water Leakage': 'UGD',
  'Manhole Uncovered': 'UGD',
  'Streetlight Failure': 'ELECTRICAL',
  'Tree Fall': 'ROADS',
  Other: 'ROADS'
};

/**
 * Upload buffer to Supabase Storage bucket (auto-creates bucket if missing)
 */
async function uploadToStorage(bucketName, filePath, buffer, mimeType) {
  try {
    await supabaseService.storage.createBucket(bucketName, { public: true });
  } catch (e) {
    // Bucket already exists or created
  }

  const { data, error } = await supabaseService.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.warn(`[STORAGE] Upload warning to ${bucketName}/${filePath}:`, error.message);
    return `${env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
  }

  const { data: publicUrlData } = supabaseService.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Submit a new civic issue report
 */
async function submitReport({ userId, token, files, latitude, longitude, voice_transcript }) {
  const reportId = uuidv4();

  if (!files || !files.image || !files.image[0]) {
    throw ApiError.badRequest('VALIDATION_REQUIRED_FIELD', 'An image file is required.', {
      image: 'An image file is required.'
    });
  }

  const imageFile = files.image[0];
  const voiceFile = files && files.voice_note ? files.voice_note[0] : null;

  // 1. Upload image to Supabase Storage
  const imagePath = `${userId}/${reportId}_image.${imageFile.mimetype.split('/')[1] || 'jpg'}`;
  const imageUrl = await uploadToStorage(
    env.SUPABASE_STORAGE_BUCKET_REPORTS,
    imagePath,
    imageFile.buffer,
    imageFile.mimetype
  );

  // Upload optional voice note
  let voiceNoteUrl = null;
  if (voiceFile) {
    const voicePath = `${userId}/${reportId}_voice.${voiceFile.mimetype.split('/')[1] || 'mp3'}`;
    voiceNoteUrl = await uploadToStorage(
      env.SUPABASE_STORAGE_BUCKET_REPORTS,
      voicePath,
      voiceFile.buffer,
      voiceFile.mimetype
    );
  }

  // 2. Call FastAPI ML service for civic issue detection
  const mlResult = await mlClient.detectCivicIssue(
    imageFile.buffer,
    imageFile.originalname,
    reportId
  );

  const pointWkt = `POINT(${longitude} ${latitude})`;
  const userClient = createUserClient(token);

  // 3. Insert report record using user client (satisfies RLS user_id = auth.uid())
  const { data: report, error: reportErr } = await userClient
    .from('reports')
    .insert({
      id: reportId,
      user_id: userId,
      image_url: imageUrl,
      voice_note_url: voiceNoteUrl,
      voice_transcript: voice_transcript || null,
      location: pointWkt,
      ai_category: null,
      ai_confidence: null
    })
    .select('id, user_id, image_url, voice_note_url, voice_transcript, ai_category, ai_confidence, created_at')
    .single();

  if (reportErr) {
    console.error('[DB] Report insert error:', reportErr);
    throw ApiError.internal('REPORT_SUBMIT_FAILED', `Failed to save report: ${reportErr.message}`);
  }

  // Update AI fields via service role if ML detected category
  if (mlResult.ai_category) {
    await supabaseService
      .from('reports')
      .update({
        ai_category: mlResult.ai_category,
        ai_confidence: mlResult.ai_confidence
      })
      .eq('id', reportId);

    report.ai_category = mlResult.ai_category;
    report.ai_confidence = mlResult.ai_confidence;
  }

  // Add parsed location object for contract response format
  report.location = { latitude, longitude };

  // 4. Spatial deduplication check (~50m radius) against open incidents
  const radiusMeters = env.SPATIAL_DEDUPLICATION_RADIUS_METERS || 50;

  let nearbyIncidents = null;
  try {
    const { data } = await supabaseService.rpc('st_dwithin_incidents', {
      p_longitude: longitude,
      p_latitude: latitude,
      p_radius_meters: radiusMeters
    });
    nearbyIncidents = data;
  } catch (e) {
    // RPC fallback
  }

  let linkedIncident = null;
  let isNew = false;

  if (nearbyIncidents && nearbyIncidents.length > 0) {
    // Linked to existing open incident
    linkedIncident = nearbyIncidents[0];
    await supabaseService.from('incident_reports').insert({
      incident_id: linkedIncident.id,
      report_id: reportId,
      is_primary: false
    });
    isNew = false;
  } else {
    // Create new incident
    isNew = true;
    const category = mlResult.ai_category || 'Other';
    const confidence = mlResult.ai_confidence || 50.0;
    const severity = confidence > 80 ? 'HIGH' : 'MEDIUM';
    const priorityScore = Math.min(100, Math.max(0, confidence * 0.9 + 10));
    const priorityLevel = priorityScore > 80 ? 'CRITICAL' : priorityScore > 60 ? 'HIGH' : priorityScore > 30 ? 'MEDIUM' : 'LOW';

    // Lookup SLA policy
    const { data: slaPolicy } = await supabaseService
      .from('sla_policies')
      .select('resolution_hours')
      .eq('priority_level', priorityLevel)
      .maybeSingle();

    const resHours = slaPolicy ? slaPolicy.resolution_hours : 24;
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + resHours * 60 * 60 * 1000);

    // Lookup department
    const deptCode = CATEGORY_DEPARTMENT_MAP[category] || 'ROADS';
    const { data: dept } = await supabaseService
      .from('departments')
      .select('id')
      .eq('code', deptCode)
      .maybeSingle();

    // Lookup zone (default first zone)
    const { data: zones } = await supabaseService.from('zones').select('id').limit(1);
    const defaultZoneId = zones && zones.length > 0 ? zones[0].id : null;

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
        zone_id: defaultZoneId,
        department_id: dept ? dept.id : null,
        current_level: 1,
        status: 'OPEN',
        sla_started_at: now.toISOString(),
        sla_deadline: slaDeadline.toISOString()
      })
      .select('id, category, severity, priority_level, status, current_level, sla_deadline, created_at')
      .single();

    if (incErr) {
      console.error('[DB] Incident insert error:', incErr);
      throw ApiError.internal('REPORT_SUBMIT_FAILED', `Failed to create incident: ${incErr.message}`);
    }

    // Link report as primary
    await supabaseService.from('incident_reports').insert({
      incident_id: incidentId,
      report_id: reportId,
      is_primary: true
    });

    // Create initial status history entry
    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: null,
      new_status: 'OPEN',
      changed_by: userId,
      remarks: 'Incident created from citizen report.'
    });

    linkedIncident = newIncident;
  }

  // 5. Dispatch notification to citizen
  await supabaseService.from('notifications').insert({
    user_id: userId,
    title: 'Report Submitted',
    message: isNew
      ? `Your civic report for ${mlResult.ai_category || 'civic issue'} has been submitted and registered.`
      : `Your report was merged with an existing active incident.`
  });

  return {
    report: report,
    incident: {
      id: linkedIncident.id,
      status: linkedIncident.status,
      priority_level: linkedIncident.priority_level || 'HIGH',
      sla_deadline: linkedIncident.sla_deadline,
      is_new: isNew
    }
  };
}

module.exports = {
  submitReport
};
