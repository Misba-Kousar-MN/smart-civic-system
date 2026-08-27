const { supabaseService } = require('./config/supabase');

async function checkRecentReports() {
  console.log('=== CHECKING RECENT REPORTS & INCIDENTS ===');

  const { data: reports } = await supabaseService
    .from('reports')
    .select('*, incident_reports(incident_id, incidents(*))')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(JSON.stringify(reports, null, 2));
}

checkRecentReports().catch(console.error);
