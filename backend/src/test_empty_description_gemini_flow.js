const reportService = require('./services/reportService');
const { supabaseService } = require('./config/supabase');

async function createDummyImageBuffer() {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);
}

async function verifyEmptyDescriptionGeminiFlow() {
  console.log('================================================================================');
  console.log('       EMPTY DESCRIPTION -> GEMINI VISUAL DESCRIPTION GENERATION E2E TEST       ');
  console.log('================================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';
  const imgBuffer = await createDummyImageBuffer();

  const fileData = { image: [{ buffer: imgBuffer, originalname: 'pothole_empty_desc.jpg', mimetype: 'image/jpeg' }] };

  console.log('\n--- 1. Submitting Report with EMPTY description ---');
  const res = await reportService.submitReport({
    userId: citizenUserId,
    token: null,
    files: fileData,
    latitude: 14.478,
    longitude: 75.938,
    voice_transcript: null, // NO user text provided!
    category_hint: 'Pothole'
  });

  const reportId = res.report.id;
  console.log(` -> Created Report ID: ${reportId}`);
  console.log(` -> AI Category:       ${res.report.ai_category}`);
  console.log(` -> AI Confidence:     ${res.report.ai_confidence}%`);
  console.log(` -> Returned Description (voice_transcript): "${res.report.voice_transcript}"`);

  // Query Database to verify persistence
  const { data: dbReport } = await supabaseService
    .from('reports')
    .select('id, ai_category, ai_confidence, voice_transcript')
    .eq('id', reportId)
    .single();

  console.log('\n--- 2. Database Record Verification ---');
  console.log(` -> DB Report ID:         ${dbReport.id}`);
  console.log(` -> DB ai_category:       ${dbReport.ai_category}`);
  console.log(` -> DB ai_confidence:     ${dbReport.ai_confidence}`);
  console.log(` -> DB voice_transcript:  "${dbReport.voice_transcript}"`);

  const hasGeminiDesc = dbReport.voice_transcript && dbReport.voice_transcript !== 'No description text provided' && dbReport.voice_transcript.length > 0;
  console.log(` -> Verification Status: ${hasGeminiDesc ? 'PASS (Gemini visual description populated and persisted!)' : 'FAIL'}`);

  console.log('================================================================================');
}

verifyEmptyDescriptionGeminiFlow().catch(console.error);
