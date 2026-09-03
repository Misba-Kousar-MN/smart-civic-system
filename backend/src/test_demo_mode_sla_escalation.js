const assert = require('assert');
const axios = require('axios');
const { supabaseService } = require('./config/supabase');
const env = require('./config/env');

const BACKEND_URL = `http://localhost:${env.PORT}/api/v1`;

async function runDemoEscalationTestSuite() {
  console.log('================================================================');
  console.log('    TEST SUITE: DEMO MODE 3-LEVEL SLA ESCALATION WORKFLOW      ');
  console.log('================================================================');

  // 1. Authenticate Ward Officer
  const officerEmail = 'demo_officer@test.com';
  const officerPassword = 'Password123!';

  let officerAuth = await supabaseService.auth.signInWithPassword({
    email: officerEmail,
    password: officerPassword
  });

  if (officerAuth.error) {
    await supabaseService.auth.signUp({
      email: officerEmail,
      password: officerPassword,
      options: { data: { full_name: 'Demo Ward Officer' } }
    });
    officerAuth = await supabaseService.auth.signInWithPassword({
      email: officerEmail,
      password: officerPassword
    });
  }

  const officerToken = officerAuth.data?.session?.access_token;
  const officerUserId = officerAuth.data?.user?.id;
  assert(Boolean(officerToken), `Ward Officer must authenticate successfully`);

  await supabaseService
    .from('profiles')
    .update({ role: 'ward_officer' })
    .eq('id', officerUserId);

  console.log(`[AUTH] Authenticated as Ward Officer (ID: ${officerUserId})`);

  const authHeaders = {
    Authorization: `Bearer ${officerToken}`
  };

  // Get first department and zone
  const { data: dept } = await supabaseService.from('departments').select('id').limit(1).single();
  const { data: zone } = await supabaseService.from('zones').select('id').limit(1).single();

  // 2. Insert a clean test incident at Level 1 with 48h SLA
  const testIncidentId = '11111111-2222-3333-4444-555555555555';
  await supabaseService.from('resolution_evidence').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('status_history').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('escalations').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('incident_reports').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('incidents').delete().eq('id', testIncidentId);

  const initialSla = new Date(Date.now() + 48 * 3600000).toISOString();
  const { data: initialIncident, error: createErr } = await supabaseService
    .from('incidents')
    .insert({
      id: testIncidentId,
      category: 'Pothole',
      severity: 'MEDIUM',
      priority_score: 55.0,
      priority_level: 'MEDIUM',
      status: 'OPEN',
      current_level: 1,
      location: 'POINT(75.922 14.464)',
      address: 'Test Ward Main Road, Davangere',
      department_id: dept?.id || null,
      zone_id: zone?.id || null,
      sla_deadline: initialSla
    })
    .select('*')
    .single();

  assert.ifError(createErr);
  console.log(`\n[INIT] Test Incident Created: ID=${initialIncident.id}`);
  console.log(`  -> current_level: ${initialIncident.current_level}`);
  console.log(`  -> status:        ${initialIncident.status}`);
  console.log(`  -> sla_deadline:  ${initialIncident.sla_deadline}`);

  // -------------------------------------------------------------------------
  // TEST 1: SIMULATE SLA BREACH 1 (LEVEL 1 -> LEVEL 2)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 1] Triggering Simulate SLA Breach: L1 -> L2 ---');
  const res1 = await axios.post(
    `${BACKEND_URL}/incidents/${testIncidentId}/demo/simulate-sla-breach`,
    {},
    { headers: authHeaders }
  );

  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.data.success, true);
  assert.strictEqual(res1.data.data.from_level, 1);
  assert.strictEqual(res1.data.data.to_level, 2);
  assert.strictEqual(res1.data.data.is_final_breach, false);

  // Verify DB state for Level 2
  const { data: dbInc1 } = await supabaseService.from('incidents').select('*').eq('id', testIncidentId).single();
  assert.strictEqual(dbInc1.current_level, 2, 'DB current_level must be 2');
  assert.strictEqual(dbInc1.status, 'ESCALATED', 'DB status must be ESCALATED');

  // Verify fresh 24h SLA deadline
  const slaDiffHours1 = (new Date(dbInc1.sla_deadline).getTime() - Date.now()) / (3600 * 1000);
  assert(slaDiffHours1 > 23 && slaDiffHours1 <= 24.1, `Fresh SLA should be ~24 hours, got ${slaDiffHours1.toFixed(2)}h`);

  // Verify escalation audit row in public.escalations
  const { data: escRows1 } = await supabaseService.from('escalations').select('*').eq('incident_id', testIncidentId);
  assert.strictEqual(escRows1.length, 1, 'Must have exactly 1 escalation record');
  assert.strictEqual(escRows1[0].from_level, 1);
  assert.strictEqual(escRows1[0].to_level, 2);
  assert.strictEqual(escRows1[0].status, 'TRIGGERED');

  console.log('  -> PASS: Level 1 -> Level 2 genuine escalation persisted with fresh 24h SLA!');

  // -------------------------------------------------------------------------
  // TEST 2: SIMULATE SLA BREACH 2 (LEVEL 2 -> LEVEL 3)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 2] Triggering Simulate SLA Breach: L2 -> L3 ---');
  const res2 = await axios.post(
    `${BACKEND_URL}/incidents/${testIncidentId}/demo/simulate-sla-breach`,
    {},
    { headers: authHeaders }
  );

  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.data.success, true);
  assert.strictEqual(res2.data.data.from_level, 2);
  assert.strictEqual(res2.data.data.to_level, 3);
  assert.strictEqual(res2.data.data.is_final_breach, false);

  // Verify DB state for Level 3
  const { data: dbInc2 } = await supabaseService.from('incidents').select('*').eq('id', testIncidentId).single();
  assert.strictEqual(dbInc2.current_level, 3, 'DB current_level must be 3');
  assert.strictEqual(dbInc2.status, 'ESCALATED', 'DB status must be ESCALATED');

  // Verify fresh 12h SLA deadline
  const slaDiffHours2 = (new Date(dbInc2.sla_deadline).getTime() - Date.now()) / (3600 * 1000);
  assert(slaDiffHours2 > 11 && slaDiffHours2 <= 12.1, `Fresh SLA should be ~12 hours, got ${slaDiffHours2.toFixed(2)}h`);

  // Verify escalation audit row in public.escalations
  const { data: escRows2 } = await supabaseService.from('escalations').select('*').eq('incident_id', testIncidentId).order('to_level', { ascending: true });
  assert.strictEqual(escRows2.length, 2, 'Must have 2 escalation records');
  assert.strictEqual(escRows2[1].from_level, 2);
  assert.strictEqual(escRows2[1].to_level, 3);

  console.log('  -> PASS: Level 2 -> Level 3 genuine escalation persisted with fresh 12h SLA!');

  // -------------------------------------------------------------------------
  // TEST 3: SIMULATE SLA BREACH 3 (LEVEL 3 -> FINAL SLA BREACH, NO LEVEL 4)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 3] Triggering Simulate SLA Breach: L3 -> FINAL SLA BREACH ---');
  const res3 = await axios.post(
    `${BACKEND_URL}/incidents/${testIncidentId}/demo/simulate-sla-breach`,
    {},
    { headers: authHeaders }
  );

  assert.strictEqual(res3.status, 200);
  assert.strictEqual(res3.data.success, true);
  assert.strictEqual(res3.data.data.from_level, 3);
  assert.strictEqual(res3.data.data.to_level, 3);
  assert.strictEqual(res3.data.data.is_final_breach, true);

  // Verify DB state for Final Breach
  const { data: dbInc3 } = await supabaseService.from('incidents').select('*').eq('id', testIncidentId).single();
  assert.strictEqual(dbInc3.current_level, 3, 'DB current_level must strictly remain 3 (NO LEVEL 4!)');
  assert.strictEqual(dbInc3.status, 'ESCALATED', 'DB status remains ESCALATED within check constraint');

  // Verify status_history has Final SLA Breach record
  const { data: shRows } = await supabaseService.from('status_history').select('*').eq('incident_id', testIncidentId);
  const finalSh = shRows.find(sh => sh.remarks && sh.remarks.includes('FINAL SLA BREACH'));
  assert(finalSh, 'status_history must contain FINAL SLA BREACH audit record');

  console.log('  -> PASS: Level 3 capped at Level 3! Final SLA Breach logged in status_history (No Level 4 created).');

  // -------------------------------------------------------------------------
  // TEST 4: PREVENT ESCALATION AFTER FINAL BREACH (SAFETY)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 4] Attempting to escalate after Final SLA Breach (Should be rejected) ---');
  try {
    await axios.post(
      `${BACKEND_URL}/incidents/${testIncidentId}/demo/simulate-sla-breach`,
      {},
      { headers: authHeaders }
    );
    assert(false, 'Should throw error when already at Final SLA Breach');
  } catch (err) {
    assert.strictEqual(err.response?.status, 422, 'Must return 422 Unprocessable');
    assert.strictEqual(err.response?.data?.error?.code, 'FINAL_BREACH_ALREADY_REACHED');
    console.log('  -> PASS: Correctly rejected with FINAL_BREACH_ALREADY_REACHED!');
  }

  // -------------------------------------------------------------------------
  // TEST 5: VERIFY PRODUCTION RBAC - USER ROLE NEVER MODIFIED
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 5] Verifying Production RBAC Integrity ---');
  const { data: verifiedProfile } = await supabaseService
    .from('profiles')
    .select('id, role')
    .eq('id', officerUserId)
    .single();

  assert.strictEqual(verifiedProfile.role, 'ward_officer', 'Officer role in DB must remain strictly ward_officer');
  console.log(`  -> PASS: Ward Officer role untouched in database: '${verifiedProfile.role}'. Production RBAC fully preserved!`);

  // -------------------------------------------------------------------------
  // TEST 6: VERIFY INCIDENT DETAIL API WITH ESCALATIONS
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 6] Verifying GET /incidents/:id includes escalations ---');
  const detailRes = await axios.get(`${BACKEND_URL}/incidents/${testIncidentId}`, { headers: authHeaders });
  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailRes.data.data.incident.current_level, 3);
  assert.strictEqual(detailRes.data.data.escalations.length, 2);
  console.log(`  -> PASS: Incident details returned ${detailRes.data.data.escalations.length} escalation history records!`);

  // -------------------------------------------------------------------------
  // TEST 7: VERIFY LEVEL VIEW FILTERING (LEVEL 1, 2, 3)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 7] Verifying Operational Queue Level View Filtering ---');
  const qL3 = await axios.get(`${BACKEND_URL}/incidents?level=3`, { headers: authHeaders });
  assert.strictEqual(qL3.status, 200);
  const foundL3 = qL3.data.data.incidents.some(i => i.id === testIncidentId);
  assert(foundL3, 'Incident must appear in Level 3 queue view');

  const qL1 = await axios.get(`${BACKEND_URL}/incidents?level=1`, { headers: authHeaders });
  assert.strictEqual(qL1.status, 200);
  const foundL1 = qL1.data.data.incidents.some(i => i.id === testIncidentId);
  assert(!foundL1, 'Incident must NOT appear in Level 1 queue view');
  console.log('  -> PASS: Operational queue level view filtering operates accurately!');

  // Cleanup test data
  console.log('\n[CLEANUP] Removing test incident records...');
  await supabaseService.from('status_history').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('escalations').delete().eq('incident_id', testIncidentId);
  await supabaseService.from('incidents').delete().eq('id', testIncidentId);
  console.log('  -> Test records safely cleaned.');

  console.log('\n================================================================');
  console.log('       DEMO MODE 3-LEVEL SLA ESCALATION SUITE: ALL PASSED!      ');
  console.log('================================================================');
}

runDemoEscalationTestSuite().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
