const reportService = require('./services/reportService');
const { supabaseService } = require('./config/supabase');
const axios = require('axios');

async function testGeminiPipeline() {
  console.log('================================================================');
  console.log('       TESTING END-TO-END GEMINI IMAGE ANALYSIS PIPELINE        ');
  console.log('================================================================');

  const citizenUserId = '402e2178-5f6b-4df9-aae7-a1fb0c1802b8';

  // Download real pothole photo buffer
  console.log('Fetching real civic issue photo (Pothole)...');
  const imgResp = await axios.get(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80',
    { responseType: 'arraybuffer' }
  );
  const imageBuffer = Buffer.from(imgResp.data);

  const files = {
    image: [{ buffer: imageBuffer, originalname: 'pothole_inspection_test.jpg', mimetype: 'image/jpeg' }]
  };

  console.log('STEP 1: Submitting Real Pothole Photo to backend reportService...');
  const result = await reportService.submitReport({
    userId: citizenUserId,
    token: null,
    files,
    latitude: 14.4673,
    longitude: 75.9241,
    voice_transcript: 'Gemini pipeline test: Severe road damage with deep asphalt breakdown.'
  });

  const reportId = result.report.id;
  const incidentId = result.incident.id;

  console.log(` -> Report ID: ${reportId}`);
  console.log(` -> Incident ID: ${incidentId}`);

  console.log('\nSTEP 2: Verifying public.reports AI Columns in Supabase DB...');
  const { data: dbReport } = await supabaseService
    .from('reports')
    .select('id, ai_category, ai_confidence, image_url')
    .eq('id', reportId)
    .single();

  console.log(` -> public.reports.ai_category:   '${dbReport.ai_category}'`);
  console.log(` -> public.reports.ai_confidence: ${dbReport.ai_confidence}%`);

  console.log('\nSTEP 3: Verifying public.incidents Category in Supabase DB...');
  const { data: dbIncident } = await supabaseService
    .from('incidents')
    .select('id, category, priority_level, status')
    .eq('id', incidentId)
    .single();

  console.log(` -> public.incidents.category:    '${dbIncident.category}'`);
  console.log(` -> public.incidents.priority:    '${dbIncident.priority_level}'`);

  console.log('\nSTEP 4: Verifying Officer API Feed Mapping...');
  const { data: officerInc } = await supabaseService
    .from('incidents')
    .select('id, category, priority_level, incident_reports(reports(id, image_url, ai_category, ai_confidence))')
    .eq('id', incidentId)
    .single();

  const incRepObj = Array.isArray(officerInc.incident_reports) ? officerInc.incident_reports[0] : officerInc.incident_reports;
  const repAi = incRepObj?.reports;

  console.log(` -> Officer Feed AI Category:   '${repAi?.ai_category}'`);
  console.log(` -> Officer Feed AI Confidence: ${repAi?.ai_confidence}%`);

  console.log('\n================================================================');
  if (dbReport.ai_category && dbReport.ai_confidence) {
    console.log('       GEMINI IMAGE ANALYSIS PIPELINE VERIFIED SUCCESS!         ');
  } else {
    console.warn('       WARNING: AI fields were empty. Check Gemini API key/logs.');
  }
  console.log('================================================================');
}

testGeminiPipeline().catch((err) => {
  console.error('GEMINI PIPELINE ERROR:', err);
  process.exit(1);
});
