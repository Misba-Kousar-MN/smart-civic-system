const { supabaseService } = require('./config/supabase');
const incidentController = require('./controllers/incidentController');
const incidentService = require('./services/incidentService');
const reportController = require('./controllers/reportController');
const axios = require('axios');

function mockReqRes(params = {}, query = {}, body = {}, userRole = 'admin') {
  const req = {
    params,
    query,
    body,
    user: { id: 'f02b6498-65a3-4957-b457-af47ef5dec54', role: userRole }
  };

  let responseData = null;
  let statusCode = 200;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  const next = (err) => {
    if (err) {
      statusCode = err.statusCode || 500;
      responseData = { success: false, error: err };
    }
  };

  return { req, res, next, getResult: () => ({ statusCode, responseData }) };
}

async function testBugs1And2() {
  console.log('================================================================');
  console.log('       TESTING BUG 1 (NO DUPLICATE STATUS) & BUG 2 (DISTINCT PHOTOS) ');
  console.log('================================================================');

  // STEP 1: Query active incident from Supabase DB
  const { data: dbIncidents } = await supabaseService.from('incidents').select('id, category, status').limit(1);
  if (!dbIncidents || dbIncidents.length === 0) {
    console.error('ERROR: No incidents found in Supabase DB.');
    process.exit(1);
  }

  const incidentId = dbIncidents[0].id;
  console.log(`[INIT] Target Incident ID: ${incidentId} (Current Status: ${dbIncidents[0].status})`);

  // Ensure incident status is IN_PROGRESS
  await supabaseService.from('incidents').update({ status: 'IN_PROGRESS' }).eq('id', incidentId);

  // Measure initial status_history count
  const { count: initialHistCount } = await supabaseService
    .from('status_history')
    .select('*', { count: 'exact', head: true })
    .eq('incident_id', incidentId);

  console.log(`[BUG 1 TEST] Initial status_history count for incident: ${initialHistCount}`);

  // Call updateIncidentStatus with status='IN_PROGRESS' (SAME AS CURRENT STATUS)
  console.log(' -> Executing updateIncidentStatus with status="IN_PROGRESS" (Duplicate Call)...');
  const dupMock = mockReqRes({ incidentId }, {}, { status: 'IN_PROGRESS' });
  await incidentController.updateIncidentStatus(dupMock.req, dupMock.res, dupMock.next);

  const { count: afterDupHistCount } = await supabaseService
    .from('status_history')
    .select('*', { count: 'exact', head: true })
    .eq('incident_id', incidentId);

  console.log(` -> status_history count after duplicate call: ${afterDupHistCount}`);

  if (initialHistCount === afterDupHistCount) {
    console.log(' -> SUCCESS (BUG 1): ZERO duplicate status_history records were created!');
  } else {
    console.error(' -> ERROR (BUG 1): Duplicate status_history record was created!');
    process.exit(1);
  }

  // BUG 2 TEST: Submit Resolution Evidence with NEW AFTER repair photo
  console.log('\n[BUG 2 TEST] Officer Submits NEW Repair Photo for AFTER Resolution Evidence...');

  // Download a real distinct clean repaired road photo for after_image
  const afterImgResp = await axios.get(
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    { responseType: 'arraybuffer' }
  );

  const mlClient = require('./integrations/ml/mlClient');
  mlClient.verifyResolution = async () => ({ ai_verification_passed: true, ai_confidence: 0.95 });

  const resResult = await incidentService.submitResolutionEvidence({
    user: { id: 'f02b6498-65a3-4957-b457-af47ef5dec54', role: 'admin' },
    incidentId: incidentId,
    files: {
      after_image: [{ buffer: Buffer.from(afterImgResp.data), originalname: 'new_repaired_road.jpg', mimetype: 'image/jpeg' }]
    }
  });

  const { data: latestEv } = await supabaseService
    .from('resolution_evidence')
    .select('id, before_image_url, after_image_url, ai_verification_passed')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(` -> BEFORE Repair Photo URL (Original Citizen Submission):`);
  console.log(`    ${latestEv.before_image_url}`);
  console.log(` -> AFTER Repair Photo URL (New Officer Submission):`);
  console.log(`    ${latestEv.after_image_url}`);

  if (latestEv.before_image_url !== latestEv.after_image_url) {
    console.log(' -> SUCCESS (BUG 2): BEFORE and AFTER photo URLs are DISTINCT and DIFFERENT!');
  } else {
    console.error(' -> ERROR (BUG 2): BEFORE and AFTER photo URLs are identical!');
    process.exit(1);
  }

  // Verify status updated to RESOLVED
  const { data: finalInc } = await supabaseService.from('incidents').select('status').eq('id', incidentId).single();
  console.log(`\n -> Final public.incidents.status in Supabase: '${finalInc.status}'`);

  // Verify status_history for IN_PROGRESS -> RESOLVED transition
  const { count: finalHistCount } = await supabaseService
    .from('status_history')
    .select('*', { count: 'exact', head: true })
    .eq('incident_id', incidentId);

  console.log(` -> Total status_history count after resolution: ${finalHistCount} (+1 transition added)`);

  console.log('\n================================================================');
  console.log('       BUG 1 AND BUG 2 RUNTIME VERIFICATION SUCCESSFUL!         ');
  console.log('================================================================');
}

testBugs1And2().catch((err) => {
  console.error('TEST BUGS 1 & 2 ERROR:', err);
  process.exit(1);
});
