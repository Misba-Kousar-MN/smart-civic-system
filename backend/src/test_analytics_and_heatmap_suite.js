const analyticsService = require('./services/analyticsService');
const analyticsController = require('./controllers/analyticsController');
const { supabaseService } = require('./config/supabase');

function mockReqRes(params = {}, query = {}, userRole = 'admin') {
  const req = {
    params,
    query,
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

async function runAnalyticsTestSuite() {
  console.log('==================================================');
  console.log(' MUNICIPAL ANALYTICS & GEOGRAPHIC HEATMAP TEST SUITE ');
  console.log('==================================================');

  let passed = 0;
  const total = 6;

  // TEST 1: Direct Service Call — Overview Analytics
  console.log('\n[TEST 1] Querying Real Municipal Overview Analytics...');
  try {
    const data = await analyticsService.getOverviewAnalytics();
    console.log(`  -> Total Reports in DB: ${data.totals.total_reports}`);
    console.log(`  -> Total Incidents in DB: ${data.totals.total_incidents}`);
    console.log(`  -> Open Incidents: ${data.totals.open_incidents}`);
    console.log(`  -> Escalated Incidents: ${data.totals.escalated_incidents}`);
    console.log(`  -> SLA Compliance Rate: ${data.sla.sla_compliance_rate}%`);
    console.log(`  -> Department Workload Rows: ${data.department_workload.length}`);
    
    if (typeof data.totals.total_reports === 'number' && typeof data.sla.sla_compliance_rate === 'number') {
      console.log('  -> PASSED: Real analytics overview computed cleanly from DB!');
      passed++;
    } else {
      console.error('  -> FAILED TEST 1: Unexpected response structure');
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 1: ${e.message}`);
  }

  // TEST 2: Direct Service Call — Heatmap Data
  console.log('\n[TEST 2] Querying Real Geographic Heatmap Points...');
  try {
    const heatData = await analyticsService.getHeatmapData();
    console.log(`  -> Total Map Points Returned: ${heatData.total_points}`);
    if (heatData.points.length > 0) {
      const sample = heatData.points[0];
      console.log(`  -> Sample Coordinate Point: (${sample.latitude}, ${sample.longitude}) - ${sample.category} [${sample.priority}]`);
      if (typeof sample.latitude === 'number' && typeof sample.longitude === 'number') {
        console.log('  -> PASSED: Heatmap coordinates are valid numbers!');
        passed++;
      } else {
        console.error('  -> FAILED TEST 2: Latitude/Longitude not numeric');
      }
    } else {
      console.log('  -> PASSED: Query returned 0 map points cleanly for empty set');
      passed++;
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 2: ${e.message}`);
  }

  // TEST 3: Controller Handler — Overview API
  console.log('\n[TEST 3] Testing Overview Analytics Controller Handler...');
  try {
    const mock = mockReqRes({}, { category: 'Pothole' });
    await analyticsController.getOverviewAnalytics(mock.req, mock.res, mock.next);
    const { statusCode, responseData } = mock.getResult();

    if (statusCode === 200 && responseData?.success && responseData?.data) {
      console.log(`  -> Filtered Pothole Incidents Count: ${responseData.data.totals.total_incidents}`);
      console.log('  -> PASSED: Controller overview endpoint answered successfully!');
      passed++;
    } else {
      console.error(`  -> FAILED TEST 3: Status ${statusCode}`, responseData);
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 3: ${e.message}`);
  }

  // TEST 4: Controller Handler — Heatmap API Filter
  console.log('\n[TEST 4] Testing Heatmap Controller Handler with Priority Filter...');
  try {
    const mock = mockReqRes({}, { priority: 'HIGH' });
    await analyticsController.getHeatmapData(mock.req, mock.res, mock.next);
    const { statusCode, responseData } = mock.getResult();

    if (statusCode === 200 && responseData?.success && responseData?.data) {
      console.log(`  -> HIGH Priority Heatmap Points: ${responseData.data.total_points}`);
      console.log('  -> PASSED: Controller heatmap filter answered successfully!');
      passed++;
    } else {
      console.error(`  -> FAILED TEST 4: Status ${statusCode}`, responseData);
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 4: ${e.message}`);
  }

  // TEST 5: Backend Filtering by Date Range
  console.log('\n[TEST 5] Testing Date Range Analytics Filtering...');
  try {
    const nowIso = new Date().toISOString();
    const mock = mockReqRes({}, { dateFrom: '2026-01-01T00:00:00.000Z', dateTo: nowIso });
    await analyticsController.getOverviewAnalytics(mock.req, mock.res, mock.next);
    const { statusCode, responseData } = mock.getResult();

    if (statusCode === 200 && responseData?.success) {
      console.log(`  -> Date Filtered Total Incidents: ${responseData.data.totals.total_incidents}`);
      console.log('  -> PASSED: Date range database filter operates cleanly!');
      passed++;
    } else {
      console.error(`  -> FAILED TEST 5: Status ${statusCode}`, responseData);
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 5: ${e.message}`);
  }

  // TEST 6: RBAC Middleware Role Enforcement
  console.log('\n[TEST 6] Verifying Server-Side Authorization for Analytics...');
  try {
    const authMiddleware = require('./middleware/authMiddleware');
    const citizenMock = mockReqRes({}, {}, 'citizen');

    let isBlocked = false;
    const authNext = (err) => {
      if (err && (err.statusCode === 403 || err.errorCode === 'ACCESS_DENIED')) {
        isBlocked = true;
      }
    };

    const authorizeFn = authMiddleware.authorize('admin', 'commissioner', 'aee', 'ward_officer');
    authorizeFn(citizenMock.req, citizenMock.res, authNext);

    if (isBlocked) {
      console.log('  -> PASSED: Citizen access strictly BLOCKED from municipal analytics (403 Forbidden)!');
      passed++;
    } else {
      console.error('  -> FAILED TEST 6: Citizen was not blocked from admin analytics!');
    }
  } catch (e) {
    console.error(`  -> FAILED TEST 6: ${e.message}`);
  }

  console.log('\n==================================================');
  console.log(`   ANALYTICS TEST SUITE: ${passed} / ${total} TESTS PASSED   `);
  console.log('==================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runAnalyticsTestSuite().catch((err) => {
  console.error('ANALYTICS TEST SUITE ERROR:', err);
  process.exit(1);
});
