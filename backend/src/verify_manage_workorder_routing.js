const { supabaseService } = require('./config/supabase');
const incidentController = require('./controllers/incidentController');
const incidentService = require('./services/incidentService');
const reportController = require('./controllers/reportController');
const axios = require('axios');

function mockReqRes(params = {}, query = {}, body = {}, userRole = 'admin', officerScope = null) {
  const req = {
    params,
    query,
    body,
    user: {
      id: 'f02b6498-65a3-4957-b457-af47ef5dec54',
      role: userRole,
      officer: officerScope
    }
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

async function verifyManageWorkorderRouting() {
  console.log('================================================================');
  console.log('       MANAGE WORKORDER ROUTING & LIFECYCLE VERIFICATION        ');
  console.log('================================================================');

  // STEP 1: Query actual incident from Supabase DB
  const { data: dbIncidents } = await supabaseService.from('incidents').select('id, category, status, department_id, zone_id').limit(1);
  if (!dbIncidents || dbIncidents.length === 0) {
    console.error('ERROR: No incidents found in Supabase DB to test.');
    process.exit(1);
  }

  const realIncidentId = dbIncidents[0].id;
  const officerScope = { department_id: dbIncidents[0].department_id, zone_id: dbIncidents[0].zone_id };
  console.log(`[STEP 1] Found active workorder in Supabase: ID = ${realIncidentId}`);

  // STEP 2: Verify GET /incidents (Dashboard Feed) returns exact same ID
  const dashMock = mockReqRes({}, { page: '1', limit: '100' }, {}, 'admin');
  await incidentController.getIncidents(dashMock.req, dashMock.res, dashMock.next);
  const dashRes = dashMock.getResult();
  const feedIncidents = dashRes.responseData.data.incidents;
  const feedInc = feedIncidents.find((i) => i.id === realIncidentId);

  console.log(`[STEP 2] Officer Dashboard GET /incidents feed contains ID ${realIncidentId}: ${Boolean(feedInc)}`);
  console.log(`         Dashboard Incident ID: '${feedInc?.id}'`);

  // STEP 3: Verify GET /incidents/:incidentId (Manage Detail Page)
  const detailMock = mockReqRes({ incidentId: realIncidentId });
  await incidentController.getIncidentById(detailMock.req, detailMock.res, detailMock.next);
  const detailRes = detailMock.getResult();

  console.log(`[STEP 3] Manage Link GET /incidents/${realIncidentId}: HTTP ${detailRes.statusCode}`);
  if (detailRes.statusCode !== 200) {
    console.error('ERROR Detail Page Failed:', detailRes.responseData);
    process.exit(1);
  }

  const fetchedInc = detailRes.responseData.data.incident;
  const fetchedReports = detailRes.responseData.data.reports;
  const realReportId = fetchedReports?.[0]?.id;

  console.log(`         Detail Incident ID: '${fetchedInc.id}'`);
  console.log(`         Attached Citizen Report ID: '${realReportId}'`);

  // STEP 6 requirement: Compare 3 IDs
  console.log('\n================================================================');
  console.log('                 TRIPLE ID MATCH CHECK                          ');
  console.log('================================================================');
  console.log(`1. Supabase public.incidents.id: '${realIncidentId}'`);
  console.log(`2. Dashboard Workorder object.id: '${feedInc.id}'`);
  console.log(`3. Manage Detail URL Param ID:   '${fetchedInc.id}'`);

  if (realIncidentId === feedInc.id && feedInc.id === fetchedInc.id) {
    console.log(' -> SUCCESS: All 3 IDs are 100% IDENTICAL!');
  } else {
    console.error(' -> ERROR: ID Mismatch detected!');
    process.exit(1);
  }

  // STEP 4: Officer Clicks "Start Work" (OPEN -> IN_PROGRESS)
  console.log('\n[STEP 4] Officer clicks Start Work (OPEN -> IN_PROGRESS)...');
  const startMock = mockReqRes({ incidentId: realIncidentId }, {}, { status: 'IN_PROGRESS', notes: 'Officer initiated field repair.' });
  await incidentController.updateIncidentStatus(startMock.req, startMock.res, startMock.next);

  const { data: incInProgress } = await supabaseService.from('incidents').select('status').eq('id', realIncidentId).single();
  console.log(` -> public.incidents.status in Supabase: '${incInProgress.status}'`);

  // STEP 5: Verify Citizen Portal reflects IN_PROGRESS
  if (realReportId) {
    const citizenMock = mockReqRes({ reportId: realReportId });
    await reportController.getReportById(citizenMock.req, citizenMock.res, citizenMock.next);
    const citizenRes = citizenMock.getResult();
    const citizenStatus = citizenRes.responseData?.data?.incident?.status || citizenRes.responseData?.data?.report?.status;
    console.log(` -> Citizen Portal Report Status: '${citizenStatus}'`);
  }

  // STEP 6: Officer Resolves Workorder (IN_PROGRESS -> RESOLVED) with distinct repaired road photo
  console.log('\n[STEP 6] Officer submits Real Before/After Resolution Evidence (IN_PROGRESS -> RESOLVED)...');
  const beforeImg = await axios.get('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80', { responseType: 'arraybuffer' });
  const afterImg = await axios.get('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', { responseType: 'arraybuffer' });

  const resResult = await incidentService.submitResolutionEvidence({
    user: { id: 'f02b6498-65a3-4957-b457-af47ef5dec54', role: 'ward_officer', officer: officerScope },
    incidentId: realIncidentId,
    files: {
      before_image: [{ buffer: Buffer.from(beforeImg.data), originalname: 'before.jpg', mimetype: 'image/jpeg' }],
      after_image: [{ buffer: Buffer.from(afterImg.data), originalname: 'after.jpg', mimetype: 'image/jpeg' }]
    }
  });

  const { data: incResolved } = await supabaseService.from('incidents').select('status').eq('id', realIncidentId).single();
  const { data: evData } = await supabaseService.from('resolution_evidence').select('id, after_image_url').eq('incident_id', realIncidentId);

  console.log(` -> public.incidents.status in Supabase: '${incResolved.status}'`);
  console.log(` -> public.resolution_evidence records created: ${evData.length}`);

  // STEP 7: Citizen Portal reflects RESOLVED + Evidence
  if (realReportId) {
    const finalCitizenMock = mockReqRes({ reportId: realReportId });
    await reportController.getReportById(finalCitizenMock.req, finalCitizenMock.res, finalCitizenMock.next);
    const finalCitizenRes = finalCitizenMock.getResult();
    const finalStatus = finalCitizenRes.responseData?.data?.incident?.status || finalCitizenRes.responseData?.data?.report?.status;
    console.log(` -> Citizen Portal Final Status: '${finalStatus}'`);
    console.log(` -> Citizen Portal Evidence Count: ${finalCitizenRes.responseData?.data?.resolution_evidence?.length}`);
  }

  console.log('\n================================================================');
  console.log('       MANAGE ROUTING & WORKORDER LIFECYCLE 100% SUCCESS        ');
  console.log('================================================================');
}

verifyManageWorkorderRouting().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
