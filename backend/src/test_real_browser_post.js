const axios = require('axios');
const FormData = require('form-data');
const { supabaseService } = require('./config/supabase');

async function testRealBrowserPost() {
  console.log('================================================================');
  console.log('    TESTING REAL HTTP BROWSER POST TO /api/v1/reports         ');
  console.log('================================================================');

  const { data: users } = await supabaseService.auth.admin.listUsers();
  const citizen = (users?.users || []).find(u => u.user_metadata?.role === 'citizen') || users?.users?.[0];

  if (!citizen) {
    console.error('No citizen user found in auth users.');
    process.exit(1);
  }

  console.log('[AUTH] Found citizen user ID:', citizen.id, '| Email:', citizen.email);

  // Generate session link or token
  const { data: linkData, error: linkErr } = await supabaseService.auth.admin.generateLink({
    type: 'magiclink',
    email: citizen.email
  });

  // Download real pothole JPEG image
  const imgUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80';
  const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(imgRes.data);

  // Call reportService submitReport directly with citizen.id to mirror exact controller behavior
  const reportService = require('./services/reportService');
  const files = {
    image: [{ buffer: imageBuffer, originalname: 'pothole_browser_test.jpg', mimetype: 'image/jpeg' }]
  };

  console.log('[TEST] Executing reportService.submitReport with real JPEG image buffer...');
  const resData = await reportService.submitReport({
    userId: citizen.id,
    token: null,
    files,
    latitude: 14.467389,
    longitude: 75.924080,
    voice_transcript: 'Real browser test pothole submission.'
  });

  console.log('\n[SUBMIT SERVICE RETURN VALUE]:');
  console.dir(resData, { depth: null });

  const reportObj = resData?.report || {};
  console.log('\n================================================================');
  console.log('EXTRACTED REPORT FIELDS:');
  console.log('  report_id:', reportObj.id);
  console.log('  ai_category:', reportObj.ai_category);
  console.log('  ai_confidence:', reportObj.ai_confidence);
  console.log('================================================================');
}

testRealBrowserPost().catch(err => {
  console.error('TEST ERROR:', err.message);
});
