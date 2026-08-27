const assert = require('assert');
const { supabaseService } = require('./config/supabase');
const reportService = require('./services/reportService');

async function runDeduplicationTest() {
  console.log("\n==================================================");
  console.log("TESTING SPATIAL DEDUPLICATION & PRIORITY ESCALATION");
  console.log("==================================================");

  const { data: profiles } = await supabaseService.from('profiles').select('id').limit(1);
  const userId = profiles[0].id;

  // Generate unique lat/lon pair for this test run to avoid colliding with previous test runs
  const baseLat = 13.0000 + Math.random() * 0.01;
  const baseLon = 77.6000 + Math.random() * 0.01;

  console.log(`Test Location: (${baseLat.toFixed(6)}, ${baseLon.toFixed(6)})`);

  const fakeImgBuffer = Buffer.from('FAKE_JPEG_SPATIAL_DEDUPLICATION_TEST_BYTES');

  // Report 1: Create initial incident
  console.log("\n1. Submitting Report 1 (New Incident)...");
  const res1 = await reportService.submitReport({
    userId,
    token: null,
    files: { image: [{ originalname: 'rep1.jpg', mimetype: 'image/jpeg', buffer: fakeImgBuffer }] },
    latitude: baseLat,
    longitude: baseLon
  });

  console.log("Report 1 ID:", res1.report.id);
  console.log("Incident 1 ID:", res1.incident.id);
  console.log("Is New?:", res1.incident.is_new);
  assert.strictEqual(res1.incident.is_new, true, "First report must create a new incident");

  // Report 2: Submit nearby report within 10 meters (<50m threshold)
  console.log("\n2. Submitting Report 2 (Nearby ~15m away)...");
  const nearLat = baseLat + 0.0001; // ~11 meters offset
  const nearLon = baseLon + 0.0001;

  const res2 = await reportService.submitReport({
    userId,
    token: null,
    files: { image: [{ originalname: 'rep2.jpg', mimetype: 'image/jpeg', buffer: fakeImgBuffer }] },
    latitude: nearLat,
    longitude: nearLon
  });

  console.log("Report 2 ID:", res2.report.id);
  console.log("Linked Incident ID:", res2.incident.id);
  console.log("Is New?:", res2.incident.is_new);
  console.log("Updated Priority Level:", res2.incident.priority_level);

  assert.strictEqual(res2.incident.is_new, false, "Second report must merge into existing incident");
  assert.strictEqual(res2.incident.id, res1.incident.id, "Second report must link to same incident ID");

  console.log("\n==================================================");
  console.log("SPATIAL DEDUPLICATION & LINKED INCIDENT MERGE VERIFIED 100%!");
  console.log("==================================================");
}

if (require.main === module) {
  runDeduplicationTest();
}
