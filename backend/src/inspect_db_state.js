const { supabaseService } = require('./config/supabase');

async function inspectDb() {
  console.log('=== INSPECTING CURRENT SUPABASE DATABASE STATE ===');

  const { data: reports, error: rErr } = await supabaseService.from('reports').select('*');
  console.log(`\n--- REPORTS (${reports ? reports.length : 0}) ---`);
  if (rErr) console.error('Error fetching reports:', rErr);
  else console.log(JSON.stringify(reports, null, 2));

  const { data: incidents, error: iErr } = await supabaseService.from('incidents').select('*');
  console.log(`\n--- INCIDENTS (${incidents ? incidents.length : 0}) ---`);
  if (iErr) console.error('Error fetching incidents:', iErr);
  else console.log(JSON.stringify(incidents, null, 2));

  const { data: junction, error: jErr } = await supabaseService.from('incident_reports').select('*');
  console.log(`\n--- INCIDENT_REPORTS JUNCTION (${junction ? junction.length : 0}) ---`);
  if (jErr) console.error('Error fetching junction:', jErr);
  else console.log(JSON.stringify(junction, null, 2));

  const { data: profiles, error: pErr } = await supabaseService.from('profiles').select('*');
  console.log(`\n--- PROFILES (${profiles ? profiles.length : 0}) ---`);
  if (pErr) console.error('Error fetching profiles:', pErr);
  else console.log(JSON.stringify(profiles, null, 2));

  const { data: officers, error: oErr } = await supabaseService.from('officers').select('*');
  console.log(`\n--- OFFICERS (${officers ? officers.length : 0}) ---`);
  if (oErr) console.error('Error fetching officers:', oErr);
  else console.log(JSON.stringify(officers, null, 2));
}

inspectDb().catch(console.error);
