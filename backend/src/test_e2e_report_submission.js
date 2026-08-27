const assert = require('assert');
const { supabaseService } = require('./config/supabase');
const reportService = require('./services/reportService');

async function runE2eTest() {
  console.log("\n==================================================");
  console.log("TESTING END-TO-END REPORT SUBMISSION PIPELINE");
  console.log("==================================================");

  // Fetch real profile from Supabase
  const { data: profiles, error: profErr } = await supabaseService
    .from('profiles')
    .select('id, full_name, role')
    .limit(1);

  if (profErr || !profiles || profiles.length === 0) {
    console.error("Could not fetch test profile:", profErr);
    process.exit(1);
  }

  const mockUserId = profiles[0].id;
  console.log(`Using real test profile ID: ${mockUserId} (${profiles[0].full_name})`);

  // Create mock image buffer
  const sampleImageBuffer = Buffer.from('FAKE_JPEG_IMAGE_DATA_HEADER_BYTES_12345');
  const testLat = 12.9716;
  const testLon = 77.5946;

  try {
    const res = await reportService.submitReport({
      userId: mockUserId,
      token: null,
      files: {
        image: [{
          originalname: 'test_pothole.jpg',
          mimetype: 'image/jpeg',
          buffer: sampleImageBuffer
        }]
      },
      latitude: testLat,
      longitude: testLon,
      voice_transcript: 'Pothole on main road near bus stand.'
    });

    console.log("\n--- E2E REPORT SUBMISSION SUCCESS ---");
    console.log("Report ID:", res.report.id);
    console.log("Incident ID:", res.incident.id);
    console.log("Status:", res.incident.status);
    console.log("Priority Level:", res.incident.priority_level);
    console.log("SLA Deadline:", res.incident.sla_deadline);
    console.log("Is New Incident?:", res.incident.is_new);

    assert.ok(res.report.id, "Report ID should exist");
    assert.ok(res.incident.id, "Incident ID should exist");
    assert.ok(res.incident.priority_level, "Priority level should exist");
    assert.ok(res.incident.sla_deadline, "SLA deadline should exist");

    console.log("\n==================================================");
    console.log("E2E REPORT SUBMISSION PIPELINE VERIFIED 100%!");
    console.log("==================================================");
  } catch (err) {
    console.error("E2E Test Error:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runE2eTest();
}
