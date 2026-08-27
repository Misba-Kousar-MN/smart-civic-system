const { supabaseService } = require('./config/supabase');

async function cleanupTestData() {
  console.log('================================================================');
  console.log('       SAFE CLEANUP OF TEST REPORT & INCIDENT DATA              ');
  console.log('================================================================');

  // 1. Delete resolution_evidence
  console.log('\n[1/5] Deleting resolution_evidence rows...');
  const { error: evErr } = await supabaseService.from('resolution_evidence').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (evErr) console.error('Error deleting resolution_evidence:', evErr.message);

  // 2. Delete status_history
  console.log('[2/5] Deleting status_history rows...');
  const { error: shErr } = await supabaseService.from('status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (shErr) console.error('Error deleting status_history:', shErr.message);

  // Delete escalations if any exist
  await supabaseService.from('escalations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Delete incident_reports junction rows
  console.log('[3/5] Deleting incident_reports junction rows...');
  const { error: irErr } = await supabaseService.from('incident_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (irErr) console.error('Error deleting incident_reports:', irErr.message);

  // 4. Delete incidents
  console.log('[4/5] Deleting incidents rows...');
  const { error: incErr } = await supabaseService.from('incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (incErr) console.error('Error deleting incidents:', incErr.message);

  // 5. Delete reports
  console.log('[5/5] Deleting reports rows...');
  const { error: repErr } = await supabaseService.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (repErr) console.error('Error deleting reports:', repErr.message);

  // Optional: clear notifications & trust_history
  await supabaseService.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseService.from('trust_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('\n================================================================');
  console.log('       VERIFYING ZERO COUNT IN ALL TARGET TABLES                ');
  console.log('================================================================');

  const { count: cReports } = await supabaseService.from('reports').select('*', { count: 'exact', head: true });
  const { count: cIncidents } = await supabaseService.from('incidents').select('*', { count: 'exact', head: true });
  const { count: cIncReports } = await supabaseService.from('incident_reports').select('*', { count: 'exact', head: true });
  const { count: cStatusHist } = await supabaseService.from('status_history').select('*', { count: 'exact', head: true });
  const { count: cResolutionEv } = await supabaseService.from('resolution_evidence').select('*', { count: 'exact', head: true });

  console.log(` -> public.reports count: ${cReports}`);
  console.log(` -> public.incidents count: ${cIncidents}`);
  console.log(` -> public.incident_reports count: ${cIncReports}`);
  console.log(` -> public.status_history count: ${cStatusHist}`);
  console.log(` -> public.resolution_evidence count: ${cResolutionEv}`);

  if (
    cReports === 0 &&
    cIncidents === 0 &&
    cIncReports === 0 &&
    cStatusHist === 0 &&
    cResolutionEv === 0
  ) {
    console.log('\nSUCCESS: Database successfully reset to 0 test records.');
  } else {
    console.warn('\nWARNING: Some tables still contain records.');
  }
}

cleanupTestData().catch((err) => {
  console.error('CLEANUP ERROR:', err);
  process.exit(1);
});
