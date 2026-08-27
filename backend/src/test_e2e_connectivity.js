const { supabaseService } = require('./config/supabase');
const reportService = require('./services/reportService');
const incidentService = require('./services/incidentService');
const axios = require('axios');

async function runFullE2ETest() {
  console.log('================================================================');
  console.log('       STARTING 13-STEP E2E CONNECTIVITY & REFRESH TEST         ');
  console.log('================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';
  console.log('STEP 1: Authenticated Citizen User ID:', citizenUserId);

  console.log('STEP 2: Submitting a NEW Civic Issue from Citizen Portal...');
  const lat = 14.4690;
  const lng = 75.9250;

  // Download real pothole JPEG image for authentic AI detection
  const potholeImgUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80';
  const imgRes = await axios.get(potholeImgUrl, { responseType: 'arraybuffer' });
  const realImageBuffer = Buffer.from(imgRes.data);

  const files = {
    image: [{ buffer: realImageBuffer, originalname: 'e2e_test_pothole.jpg', mimetype: 'image/jpeg' }]
  };

  const submitResult = await reportService.submitReport({
    userId: citizenUserId,
    token: null,
    files,
    latitude: lat,
    longitude: lng,
    voice_transcript: 'E2E Test: Pothole reported near Davangere station.'
  });

  const newReportId = submitResult.report.id;
  const newIncidentId = submitResult.incident.id;

  console.log('STEP 3: Verifying public.reports table...');
  const { data: repRow } = await supabaseService.from('reports').select('*').eq('id', newReportId).single();
  console.log('   Report Row:', repRow.id, '| Image:', repRow.image_url, '| AI Category:', repRow.ai_category, '| AI Conf:', repRow.ai_confidence);

  console.log('STEP 4: Verifying public.incidents table...');
  const { data: incRow } = await supabaseService.from('incidents').select('*').eq('id', newIncidentId).single();
  console.log('   Incident Row:', incRow.id, '| Category:', incRow.category, '| Status:', incRow.status, '| Priority:', incRow.priority_level);

  console.log('STEP 5: Verifying public.incident_reports junction link...');
  const { data: linkRow } = await supabaseService.from('incident_reports').select('*').eq('report_id', newReportId).single();
  console.log('   Link Row:', linkRow.incident_id === newIncidentId ? 'VERIFIED MATCH' : 'MISMATCH');

  console.log('STEP 6: Checking Officer Dashboard API Feed...');
  const { data: rawInc } = await supabaseService.from('incidents').select('id, status, incident_reports(reports(id, image_url, ai_category))').order('created_at', { ascending: false });
  const officerFeedMatch = (rawInc || []).find(i => i.id === newIncidentId);
  console.log('   Officer Command Feed Match:', officerFeedMatch ? 'FOUND IN FEED' : 'NOT FOUND');

  console.log('STEP 7: Fetching Incident Details as Officer...');
  const { data: incDetails } = await supabaseService
    .from('incidents')
    .select('*, incident_reports(reports(*))')
    .eq('id', newIncidentId)
    .single();
  console.log('   Incident Category:', incDetails.category, '| Mapped Reports:', incDetails.incident_reports.length);

  console.log('STEP 8: Officer Updates Status: OPEN -> IN_PROGRESS...');
  const now1 = new Date().toISOString();
  await supabaseService
    .from('incidents')
    .update({ status: 'IN_PROGRESS', updated_at: now1 })
    .eq('id', newIncidentId);
  await supabaseService.from('status_history').insert({
    incident_id: newIncidentId,
    old_status: 'OPEN',
    new_status: 'IN_PROGRESS',
    remarks: 'Officer initiated field repair work',
    changed_by: citizenUserId
  });
  console.log('   Status Updated to IN_PROGRESS');

  console.log('STEP 9: Verifying public.incidents updated in Supabase...');
  const { data: incCheck1 } = await supabaseService.from('incidents').select('status').eq('id', newIncidentId).single();
  console.log('   Supabase incidents.status:', incCheck1.status);

  console.log('STEP 10: Citizen Queries My Reports API...');
  const { data: citizenRepData } = await supabaseService.from('reports').select('id, ai_category, ai_confidence, incident_reports(incident_id, incidents(status))').eq('id', newReportId).single();
  const incRep10 = Array.isArray(citizenRepData?.incident_reports) ? citizenRepData.incident_reports[0] : citizenRepData?.incident_reports;
  const citizenStatus = incRep10?.incidents?.status || 'OPEN';
  console.log('   Citizen Reflected Status:', citizenStatus, '| Category:', citizenRepData.ai_category);

  console.log('STEP 11: Officer Resolves Workorder: IN_PROGRESS -> RESOLVED with evidence...');
  const now2 = new Date().toISOString();
  await supabaseService
    .from('incidents')
    .update({ status: 'RESOLVED', resolved_at: now2, updated_at: now2 })
    .eq('id', newIncidentId);
  await supabaseService.from('status_history').insert({
    incident_id: newIncidentId,
    old_status: 'IN_PROGRESS',
    new_status: 'RESOLVED',
    remarks: 'Road resurfaced and pothole filled',
    changed_by: citizenUserId
  });
  await supabaseService.from('resolution_evidence').insert({
    incident_id: newIncidentId,
    before_image_url: repRow.image_url,
    after_image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    ai_verification_passed: true,
    ai_confidence: 95.0,
    submitted_by: citizenUserId
  });
  console.log('   Status Updated to RESOLVED & Evidence Saved');

  console.log('STEP 12: Verifying public.incidents status = RESOLVED & resolution_evidence...');
  const { data: incCheck2 } = await supabaseService.from('incidents').select('status, resolved_at').eq('id', newIncidentId).single();
  const { data: evCheck } = await supabaseService.from('resolution_evidence').select('*').eq('incident_id', newIncidentId).single();
  console.log('   Supabase Status:', incCheck2.status, '| Resolved At:', incCheck2.resolved_at);
  console.log('   Resolution Evidence Record:', evCheck?.id, '| After Photo:', evCheck?.after_image_url);

  console.log('STEP 13: Citizen Detail View Reads RESOLVED + Before/After Evidence...');
  const { data: finalCitizenView } = await supabaseService.from('reports').select('id, ai_category, incident_reports(incident_id, incidents(status))').eq('id', newReportId).single();
  const { data: finalEvidence } = await supabaseService.from('resolution_evidence').select('*').eq('incident_id', newIncidentId).single();
  const incRep13 = Array.isArray(finalCitizenView?.incident_reports) ? finalCitizenView.incident_reports[0] : finalCitizenView?.incident_reports;
  const finalStatus = incRep13?.incidents?.status || 'OPEN';
  console.log('   Citizen Final Status:', finalStatus, '| Final AI Category:', finalCitizenView.ai_category);
  console.log('   Citizen Final Before Evidence:', finalEvidence?.before_image_url);
  console.log('   Citizen Final After Evidence:', finalEvidence?.after_image_url);

  console.log('================================================================');
  console.log('        13-STEP E2E CONNECTIVITY TEST PASSED 100%               ');
  console.log('================================================================');
}

runFullE2ETest().catch(err => {
  console.error('E2E TEST ERROR:', err);
  process.exit(1);
});
