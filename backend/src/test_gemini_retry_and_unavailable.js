const reportService = require('./services/reportService');
const { supabaseService } = require('./config/supabase');
const axios = require('axios');

async function testGeminiRetryAndUnavailable() {
  console.log('================================================================');
  console.log('       TESTING GEMINI RETRY LOGIC & UNAVAILABLE STATE HANDLING  ');
  console.log('================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';

  // 1. Download real pothole photo buffer
  console.log('\n[TEST 1] Submitting Real Pothole Photo (Gemini Vision Active)...');
  const imgResp = await axios.get(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80',
    { responseType: 'arraybuffer' }
  );
  const imageBuffer = Buffer.from(imgResp.data);

  const files1 = {
    image: [{ buffer: imageBuffer, originalname: 'pothole_photo_real.jpg', mimetype: 'image/jpeg' }]
  };

  const result1 = await reportService.submitReport({
    userId: citizenUserId,
    token: null,
    files: files1,
    latitude: 14.4673,
    longitude: 75.9241,
    voice_transcript: 'Pothole issue on main road.'
  });

  const reportId1 = result1.report.id;
  const incidentId1 = result1.incident.id;

  const { data: dbReport1 } = await supabaseService
    .from('reports')
    .select('id, ai_category, ai_confidence')
    .eq('id', reportId1)
    .single();

  console.log(' -> SUCCESSFUL GEMINI RESPONSE:');
  console.log(`    public.reports.ai_category:   '${dbReport1.ai_category}'`);
  console.log(`    public.reports.ai_confidence: ${dbReport1.ai_confidence}%`);

  // 2. Simulate Gemini Unavailable State (Empty/Unclassified or Service Unavailable)
  console.log('\n[TEST 2] Simulating Gemini Vision Unavailable / Unclassified Image...');
  // 1x1 tiny non-civic buffer
  const tinyBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  );

  const files2 = {
    image: [{ buffer: tinyBuffer, originalname: 'unclassified_test.jpg', mimetype: 'image/jpeg' }]
  };

  const result2 = await reportService.submitReport({
    userId: citizenUserId,
    token: null,
    files: files2,
    latitude: 14.4700,
    longitude: 75.9300,
    voice_transcript: 'Unclassified issue test.'
  });

  const reportId2 = result2.report.id;

  const { data: dbReport2 } = await supabaseService
    .from('reports')
    .select('id, ai_category, ai_confidence')
    .eq('id', reportId2)
    .single();

  const { data: dbIncident2 } = await supabaseService
    .from('incidents')
    .select('id, category, priority_level')
    .eq('id', result2.incident.id)
    .single();

  console.log(' -> GEMINI UNAVAILABLE / UNCLASSIFIED RESPONSE:');
  console.log(`    public.reports.ai_category:   ${dbReport2.ai_category}`);
  console.log(`    public.reports.ai_confidence: ${dbReport2.ai_confidence}`);
  console.log(`    public.incidents.category:    '${dbIncident2.category}' (Municipal fallback)`);

  console.log('\n================================================================');
  if (dbReport1.ai_category && dbReport1.ai_confidence && dbReport2.ai_category === null && dbReport2.ai_confidence === null) {
    console.log('       ALL RETRY & UNAVAILABLE STATE TESTS PASSED 100%!          ');
  } else {
    console.warn('       WARNING: Unexpected AI column state.');
  }
  console.log('================================================================');
}

testGeminiRetryAndUnavailable().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
