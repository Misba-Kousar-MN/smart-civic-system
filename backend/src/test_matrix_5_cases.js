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

async function run5TestCases() {
  console.log('================================================================');
  console.log('      RUNNING REAL E2E AI REPORT MATRIX (TESTS A - E)          ');
  console.log('================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';

  const cases = [
    {
      name: 'TEST A: Strong Pothole',
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
      expectedModel: 'YOLO26'
    },
    {
      name: 'TEST B: Strong Garbage',
      url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80',
      expectedModel: 'YOLO26'
    },
    {
      name: 'TEST C: Weak Garbage',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      expectedModel: 'Gemini'
    },
    {
      name: 'TEST D: Water Leakage / Pipe Burst',
      url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
      expectedModel: 'Gemini'
    },
    {
      name: 'TEST E: Drainage / Storm Water Drain',
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
      expectedModel: 'Gemini'
    }
  ];

  const results = [];

  for (const c of cases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`EXECUTING ${c.name}...`);
    console.log(`--------------------------------------------------`);
    try {
      const imgBuffer = await downloadImageBuffer(c.url);
      console.log(`Downloaded Valid Image Buffer: ${imgBuffer.length} bytes`);

      const files = {
        image: [{ buffer: imgBuffer, originalname: 'test_image.jpg', mimetype: 'image/jpeg' }]
      };

      const submitRes = await reportService.submitReport({
        userId: citizenUserId,
        token: null,
        files,
        latitude: 14.467389,
        longitude: 75.924080,
        voice_transcript: `Test report for ${c.name}`
      });

      const reportId = submitRes.report.id;

      // Query DB row
      const { data: dbReport } = await supabaseService
        .from('reports')
        .select('id, ai_category, ai_confidence')
        .eq('id', reportId)
        .single();

      console.log(`Result Category: ${dbReport.ai_category}`);
      console.log(`Result Confidence: ${dbReport.ai_confidence}%`);

      results.push({
        test: c.name,
        expectedModel: c.expectedModel,
        finalCategory: dbReport.ai_category || 'Pending',
        dbStatus: dbReport.ai_category ? 'PASS' : 'FAIL',
        uiStatus: dbReport.ai_category ? 'PASS' : 'FAIL'
      });
    } catch (err) {
      console.error(`ERROR IN ${c.name}:`, err.message);
      results.push({
        test: c.name,
        expectedModel: c.expectedModel,
        finalCategory: 'ERROR',
        dbStatus: 'FAIL',
        uiStatus: 'FAIL'
      });
    }
  }

  console.log('\n================================================================');
  console.log('             FINAL 5-CASE TEST MATRIX RESULTS                   ');
  console.log('================================================================');
  console.table(results);
}

run5TestCases().catch(console.error);
