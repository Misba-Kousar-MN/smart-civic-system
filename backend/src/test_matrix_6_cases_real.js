const axios = require('axios');
const reportService = require('./services/reportService');
const { supabaseService } = require('./config/supabase');

async function downloadImageBuffer(url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    responseType: 'arraybuffer',
    maxRedirects: 5
  });
  const buf = Buffer.from(res.data);
  if (buf.length < 1000) {
    throw new Error(`Invalid image payload (${buf.length} bytes) returned from ${url}`);
  }
  return buf;
}

async function run6RealCasesMatrix() {
  console.log('================================================================');
  console.log('      RUNNING 6-CASE REAL AI REPORT MATRIX (NO DESCRIPTION)     ');
  console.log('================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';

  const cases = [
    {
      id: 1,
      name: '1. Pothole',
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: true
    },
    {
      id: 2,
      name: '2. Strong Garbage',
      url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: true
    },
    {
      id: 3,
      name: '3. Weak Garbage',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: false
    },
    {
      id: 4,
      name: '4. Water Leakage',
      url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: false
    },
    {
      id: 5,
      name: '5. Open Drainage',
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: false
    },
    {
      id: 6,
      name: '6. Unknown / Non-Civic',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
      expectedYoloQualify: false
    }
  ];

  const summaryResults = [];

  for (const c of cases) {
    console.log(`\n================================================================`);
    console.log(` CASE ${c.id}: ${c.name}`);
    console.log(`================================================================`);

    try {
      const imgBuffer = await downloadImageBuffer(c.url);
      console.log(`[IMAGE] Downloaded real image buffer (${imgBuffer.length} bytes)`);

      const files = {
        image: [{ buffer: imgBuffer, originalname: `real_case_${c.id}.jpg`, mimetype: 'image/jpeg' }]
      };

      // Submit WITHOUT description or voice transcript to test no-description flow
      const submitRes = await reportService.submitReport({
        userId: citizenUserId,
        token: null,
        files,
        latitude: 14.467 + c.id * 0.001,
        longitude: 75.924 + c.id * 0.001,
        voice_transcript: null
      });

      const reportId = submitRes.report.id;

      // Query complete row from PostgreSQL DB
      const { data: dbReport } = await supabaseService
        .from('reports')
        .select('id, image_url, voice_transcript, ai_category, ai_confidence, created_at')
        .eq('id', reportId)
        .single();

      console.log(`\n--- CASE ${c.id} VERIFICATION METRICS ---`);
      console.log(`1. Report ID:           ${dbReport.id}`);
      console.log(`2. Final AI Category:   ${dbReport.ai_category}`);
      console.log(`3. Final Confidence:    ${dbReport.ai_confidence}%`);
      console.log(`4. Generated Description (Persisted in DB):`);
      console.log(`   "${dbReport.voice_transcript}"`);

      summaryResults.push({
        caseId: c.id,
        name: c.name,
        category: dbReport.ai_category,
        confidence: `${dbReport.ai_confidence}%`,
        descriptionLength: (dbReport.voice_transcript || '').length,
        status: dbReport.ai_category && dbReport.voice_transcript ? 'PASS' : 'FAIL'
      });

    } catch (err) {
      console.error(`❌ ERROR IN CASE ${c.id}:`, err.message);
      summaryResults.push({
        caseId: c.id,
        name: c.name,
        category: 'ERROR',
        confidence: 'N/A',
        descriptionLength: 0,
        status: 'FAIL'
      });
    }
  }

  console.log('\n================================================================');
  console.log('             COMPLETE REAL 6-CASE MATRIX RESULTS                ');
  console.log('================================================================');
  console.table(summaryResults);
}

run6RealCasesMatrix().catch(console.error);
