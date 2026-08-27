const { supabaseService } = require('./config/supabase');
const reportService = require('./services/reportService');
const incidentService = require('./services/incidentService');

async function runManualVerification() {
  console.log('================================================================');
  console.log('       MANUAL VERIFICATION OF SINGLE REAL CITIZEN REPORT        ');
  console.log('================================================================');

  const testCitizenId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8'; // Authenticated test citizen user ID

  // A. CITIZEN SUBMITS REPORT
  console.log('\n[A] Submitting real citizen report to database...');
  const lat = 14.4680;
  const lng = 75.9260;
  const dummyBuffer = Buffer.from('fake-pothole-photo-data-manual-test');
  const files = {
    image: [{ buffer: dummyBuffer, originalname: 'manual_pothole_test.jpg', mimetype: 'image/jpeg' }]
  };

  const submitRes = await reportService.submitReport({
    userId: testCitizenId,
    token: null,
    files,
    latitude: lat,
    longitude: lng,
    voice_transcript: 'Manual verification: Water leak reported on Church Road.'
  });

  const reportId = submitRes.report.id;
  const incidentId = submitRes.incident.id;

  console.log(` -> Submitted Report ID: ${reportId}`);
  console.log(` -> Created Incident ID: ${incidentId}`);

  // B. VERIFY DATABASE ROWS
  console.log('\n[B] Verifying Database Rows in Supabase...');
  const { data: dbReport } = await supabaseService.from('reports').select('*').eq('id', reportId).single();
  console.log(` -> public.reports: FOUND | ID: ${dbReport.id} | Image: ${dbReport.image_url}`);

  const { data: dbIncident } = await supabaseService.from('incidents').select('*').eq('id', incidentId).single();
  console.log(` -> public.incidents: FOUND | ID: ${dbIncident.id} | Status: ${dbIncident.status}`);

  const { data: dbJunction } = await supabaseService.from('incident_reports').select('*').eq('report_id', reportId).single();
  console.log(` -> public.incident_reports: FOUND | Incident ID: ${dbJunction.incident_id} | Primary: ${dbJunction.is_primary}`);

  // C. OFFICER DASHBOARD FETCHES INCIDENT
  console.log('\n[C] Officer Dashboard Queries Workorder Feed...');
  const { data: rawIncList } = await supabaseService
    .from('incidents')
    .select('id, status, category, priority_level, incident_reports(reports(id, image_url))')
    .eq('id', incidentId)
    .single();
  console.log(` -> Officer Command Feed Match: ${rawIncList.id === incidentId ? 'SUCCESS' : 'FAILED'}`);
  console.log(` -> Workorder Status in Officer Feed: ${rawIncList.status}`);

  // D. OFFICER STARTS WORK (OPEN -> IN_PROGRESS)
  console.log('\n[D] Officer Clicks Start Work (OPEN -> IN_PROGRESS)...');
  await supabaseService
    .from('incidents')
    .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
    .eq('id', incidentId);

  await supabaseService.from('status_history').insert({
    incident_id: incidentId,
    old_status: 'OPEN',
    new_status: 'IN_PROGRESS',
    changed_by: testCitizenId,
    remarks: 'Officer initiated field repair work.'
  });

  const { data: incInProgress } = await supabaseService.from('incidents').select('status').eq('id', incidentId).single();
  console.log(` -> Updated Supabase incidents.status: ${incInProgress.status}`);

  // E. CITIZEN MY REPORTS & DETAILS REFLECT IN_PROGRESS
  console.log('\n[E] Citizen Queries Report Details Endpoint...');
  const { data: rawCitizenReport } = await supabaseService
    .from('reports')
    .select('id, user_id, image_url, voice_transcript, ai_category, ai_confidence, created_at, incident_reports(incident_id, is_primary, incidents(id, status, priority_level, sla_deadline, category, current_level, created_at))')
    .eq('id', reportId)
    .single();

  const incRepObj = Array.isArray(rawCitizenReport.incident_reports) ? rawCitizenReport.incident_reports[0] : rawCitizenReport.incident_reports;
  const reflectedStatus = incRepObj?.incidents?.status || 'OPEN';
  console.log(` -> Citizen Reflected Status: ${reflectedStatus}`);

  // F. OFFICER RESOLVES CASE WITH EVIDENCE
  console.log('\n[F] Officer Resolves Workorder (IN_PROGRESS -> RESOLVED)...');
  const nowIso = new Date().toISOString();
  await supabaseService
    .from('incidents')
    .update({ status: 'RESOLVED', resolved_at: nowIso, updated_at: nowIso })
    .eq('id', incidentId);

  await supabaseService.from('status_history').insert({
    incident_id: incidentId,
    old_status: 'IN_PROGRESS',
    new_status: 'RESOLVED',
    changed_by: testCitizenId,
    remarks: 'Water pipe leak repaired and asphalt patched.'
  });

  const { data: dbEvidence } = await supabaseService
    .from('resolution_evidence')
    .insert({
      incident_id: incidentId,
      before_image_url: dbReport.image_url,
      after_image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      ai_verification_passed: true,
      ai_confidence: 96.5,
      submitted_by: testCitizenId
    })
    .select('*')
    .single();

  console.log(` -> Resolution Evidence Record Created | ID: ${dbEvidence.id}`);
  console.log(` -> After Photo URL: ${dbEvidence.after_image_url}`);

  // G. CITIZEN & OFFICER FINAL REFLECTION
  console.log('\n[G] Citizen & Officer Final Reflection Verification...');
  const { data: finalReportView } = await supabaseService
    .from('reports')
    .select('id, incident_reports(incident_id, incidents(status))')
    .eq('id', reportId)
    .single();

  const finalIncRep = Array.isArray(finalReportView.incident_reports) ? finalReportView.incident_reports[0] : finalReportView.incident_reports;
  console.log(` -> Citizen Final Reflected Status: ${finalIncRep?.incidents?.status}`);

  const { data: finalEvidenceCheck } = await supabaseService
    .from('resolution_evidence')
    .select('*')
    .eq('incident_id', incidentId)
    .single();

  console.log(` -> Citizen Sees Before Photo: ${finalEvidenceCheck.before_image_url}`);
  console.log(` -> Citizen Sees After Photo: ${finalEvidenceCheck.after_image_url}`);

  console.log('\n================================================================');
  console.log('   MANUAL VERIFICATION OF SINGLE REAL CITIZEN REPORT SUCCESS   ');
  console.log('================================================================');
}

runManualVerification().catch((err) => {
  console.error('MANUAL VERIFICATION ERROR:', err);
  process.exit(1);
});
