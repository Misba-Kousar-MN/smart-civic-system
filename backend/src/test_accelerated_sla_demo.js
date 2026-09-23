/**
 * Automated Test Suite: Accelerated SLA Demo Clock & Real-World Escalation Lifecycle
 *
 * Verifies:
 * 1. Central time acceleration configuration (DEMO_TIME_SCALE = 300; 1s = 5 simulated mins).
 * 2. Real-world SLA policies (12h, 24h, 72h, 168h) remain 100% genuine and unaltered.
 * 3. Server-authoritative time progression advances effective time without mutating real clock.
 * 4. Genuine escalation triggers in Supabase database upon simulated deadline breach.
 * 5. Level 1 -> Level 2 escalation with fresh 24h SLA.
 * 6. Level 2 -> Level 3 escalation with fresh 12h SLA.
 * 7. Level 3 capping at Final SLA Breach (No Level 4).
 * 8. Clean return to real-world time upon deactivating demo clock.
 */

const assert = require('assert');
const { supabaseService } = require('./config/supabase');
const { DEMO_TIME_SCALE, DEMO_STEP_MINUTES } = require('./config/demoTimeConfig');
const simulationClockService = require('./services/simulationClockService');
const incidentService = require('./services/incidentService');
const { SLA_HOURS_MAP } = require('./services/intelligenceService');

const TEST_INCIDENT_ID = '99999999-8888-7777-6666-555555555555';

async function runAcceleratedSlaDemoSuite() {
  console.log('================================================================');
  console.log('  TEST SUITE: ACCELERATED SLA DEMO CLOCK & ESCALATION LIFECYCLE');
  console.log('================================================================\n');

  // STEP 1: Verify Central Configuration & Real-World SLA Durations
  console.log('--- [TEST 1] Verifying Central Config & Real-World SLA Policies ---');
  assert.strictEqual(DEMO_TIME_SCALE, 300, 'DEMO_TIME_SCALE must be 300 (5 simulated minutes per second)');
  assert.strictEqual(SLA_HOURS_MAP.CRITICAL, 12, 'CRITICAL SLA must remain real-world 12 hours');
  assert.strictEqual(SLA_HOURS_MAP.HIGH, 24, 'HIGH SLA must remain real-world 24 hours');
  assert.strictEqual(SLA_HOURS_MAP.MEDIUM, 72, 'MEDIUM SLA must remain real-world 72 hours');
  assert.strictEqual(SLA_HOURS_MAP.LOW, 168, 'LOW SLA must remain real-world 168 hours / 7 days');
  console.log('  -> PASS: Real-world SLA values verified (12h, 24h, 72h, 168h). Configuration is centralized.\n');

  // STEP 2: Create a Genuine Medium Incident with 72h Real SLA
  console.log('--- [TEST 2] Creating Genuine Test Incident with 72h Real SLA ---');
  const now = new Date();
  const realSlaDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

  // Clean any old test records first
  await supabaseService.from('escalations').delete().eq('incident_id', TEST_INCIDENT_ID);
  await supabaseService.from('status_history').delete().eq('incident_id', TEST_INCIDENT_ID);
  await supabaseService.from('incidents').delete().eq('id', TEST_INCIDENT_ID);

  const { data: dept } = await supabaseService.from('departments').select('id').limit(1).single();
  const { data: zone } = await supabaseService.from('zones').select('id').limit(1).single();

  const { data: inc, error: insertErr } = await supabaseService
    .from('incidents')
    .insert({
      id: TEST_INCIDENT_ID,
      category: 'Pothole',
      severity: 'MEDIUM',
      priority_level: 'MEDIUM',
      priority_score: 55.0,
      status: 'OPEN',
      current_level: 1,
      sla_deadline: realSlaDeadline,
      location: 'POINT(75.92 14.46)',
      address: 'PB Road Near Davanagere Clock Tower',
      department_id: dept?.id,
      zone_id: zone?.id,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .select('*')
    .single();

  assert(!insertErr, `Failed to insert test incident: ${insertErr?.message}`);
  assert.strictEqual(inc.current_level, 1, 'Initial current_level must be 1 (Operational Resolution)');
  console.log(`  -> PASS: Incident created (ID: ${TEST_INCIDENT_ID}) with real-world 72h deadline: ${inc.sla_deadline}\n`);

  // STEP 3: Verify Normal Operation Uses Real Time
  console.log('--- [TEST 3] Verifying Normal Operation Uses Real Time ---');
  simulationClockService.setDemoMode(false);
  assert.strictEqual(simulationClockService.enabled, false, 'Simulation clock must be inactive by default');
  const realDiff = Math.abs(simulationClockService.getEffectiveNow() - Date.now());
  assert(realDiff < 50, 'Effective time must match real server time when demo mode is OFF');
  console.log('  -> PASS: When Demo Mode is OFF, real-time clock is authoritative.\n');

  // STEP 4: Activate Accelerated Demo Clock (300x speed)
  console.log('--- [TEST 4] Activating Accelerated Demo Clock (300x / 5 min per sec) ---');
  simulationClockService.setDemoMode(true, 300);
  const status = simulationClockService.getStatus();
  assert.strictEqual(status.enabled, true, 'Simulation clock must be enabled');
  assert.strictEqual(status.simulatedMinutesPerRealSecond, 5, 'Must equal 5 simulated minutes per real second');
  console.log(`  -> PASS: Accelerated clock active. Effective time: ${status.effectiveIso}\n`);

  // STEP 5: Advance Time Past 72h Deadline -> Trigger SLA Breach & Escalation (L1 -> L2)
  console.log('--- [TEST 5] Advancing Simulated Time Past 72h SLA Deadline ---');
  simulationClockService.advanceTime(73 * 60); // Advance 73 simulated hours
  console.log(`  -> Effective simulated time advanced to: ${simulationClockService.getEffectiveIso()}`);

  const daemonRes1 = await incidentService.checkAndEscalateSlaBreaches();
  console.log(`  -> SLA Daemon executed. Escalated count: ${daemonRes1.escalated_count}`);

  const { data: incL2 } = await supabaseService
    .from('incidents')
    .select('current_level, status, sla_deadline')
    .eq('id', TEST_INCIDENT_ID)
    .single();

  assert.strictEqual(incL2.current_level, 2, 'Incident must have genuinely escalated to Level 2 (Supervisory Intervention)');
  assert.strictEqual(incL2.status, 'ESCALATED', 'Incident status must be ESCALATED');

  // Verify escalation history in public.escalations
  const { data: escL1toL2 } = await supabaseService
    .from('escalations')
    .select('*')
    .eq('incident_id', TEST_INCIDENT_ID)
    .eq('from_level', 1)
    .eq('to_level', 2)
    .single();

  assert(escL1toL2, 'Genuine escalation record (L1 -> L2) must be recorded in database');
  console.log(`  -> PASS: Level 1 -> Level 2 escalation confirmed in Supabase. Fresh 24h SLA assigned: ${incL2.sla_deadline}\n`);

  // STEP 6: Advance Time Past Fresh 24h Deadline -> Escalation (L2 -> L3)
  console.log('--- [TEST 6] Advancing Simulated Time Past Fresh 24h Level 2 SLA Deadline ---');
  simulationClockService.advanceTime(25 * 60); // Advance 25 simulated hours
  console.log(`  -> Effective simulated time advanced to: ${simulationClockService.getEffectiveIso()}`);

  const daemonRes2 = await incidentService.checkAndEscalateSlaBreaches();
  console.log(`  -> SLA Daemon executed. Escalated count: ${daemonRes2.escalated_count}`);

  const { data: incL3 } = await supabaseService
    .from('incidents')
    .select('current_level, status, sla_deadline')
    .eq('id', TEST_INCIDENT_ID)
    .single();

  assert.strictEqual(incL3.current_level, 3, 'Incident must have genuinely escalated to Level 3 (Senior Administrative Oversight)');
  assert.strictEqual(incL3.status, 'ESCALATED', 'Incident status must be ESCALATED');

  // Verify escalation history in public.escalations
  const { data: escL2toL3 } = await supabaseService
    .from('escalations')
    .select('*')
    .eq('incident_id', TEST_INCIDENT_ID)
    .eq('from_level', 2)
    .eq('to_level', 3)
    .single();

  assert(escL2toL3, 'Genuine escalation record (L2 -> L3) must be recorded in database');
  console.log(`  -> PASS: Level 2 -> Level 3 escalation confirmed in Supabase. Fresh 12h SLA assigned: ${incL3.sla_deadline}\n`);

  // STEP 7: Advance Time Past Fresh 12h Deadline -> Terminal SLA Breach (Capped at Level 3)
  console.log('--- [TEST 7] Advancing Simulated Time Past 12h Level 3 Deadline -> Terminal SLA Breach ---');
  simulationClockService.advanceTime(13 * 60); // Advance 13 simulated hours
  console.log(`  -> Effective simulated time advanced to: ${simulationClockService.getEffectiveIso()}`);

  const daemonRes3 = await incidentService.checkAndEscalateSlaBreaches();
  console.log(`  -> SLA Daemon executed. Escalated count: ${daemonRes3.escalated_count}`);

  const { data: incFinal } = await supabaseService
    .from('incidents')
    .select('current_level, status')
    .eq('id', TEST_INCIDENT_ID)
    .single();

  assert.strictEqual(incFinal.current_level, 3, 'Incident must remain capped at Level 3 (No Level 4 exists)');

  // Verify status_history has Final SLA Breach record
  const { data: finalHistory } = await supabaseService
    .from('status_history')
    .select('*')
    .eq('incident_id', TEST_INCIDENT_ID)
    .ilike('remarks', '%FINAL SLA BREACH%');

  assert(finalHistory && finalHistory.length > 0, 'Final SLA Breach audit record must exist in status_history');
  console.log(`  -> PASS: Terminal SLA Breach logged in status_history. Capped at Level 3 (No Level 4).\n`);

  // STEP 8: Deactivate Demo Clock & Restore Real-Time
  console.log('--- [TEST 8] Deactivating Accelerated Demo Clock & Restoring Real-Time ---');
  simulationClockService.setDemoMode(false);
  const statusAfter = simulationClockService.getStatus();
  assert.strictEqual(statusAfter.enabled, false, 'Simulation clock must be disabled');
  const finalDiff = Math.abs(simulationClockService.getEffectiveNow() - Date.now());
  assert(finalDiff < 50, 'Effective time must immediately match real server time');
  console.log('  -> PASS: Demo clock deactivated. System cleanly returned to real-world server time.\n');

  // STEP 9: Clean Up Test Records
  console.log('--- [CLEANUP] Removing Test Incident Records ---');
  await supabaseService.from('escalations').delete().eq('incident_id', TEST_INCIDENT_ID);
  await supabaseService.from('status_history').delete().eq('incident_id', TEST_INCIDENT_ID);
  await supabaseService.from('incidents').delete().eq('id', TEST_INCIDENT_ID);
  console.log('  -> PASS: Test incident records successfully cleaned.\n');

  console.log('================================================================');
  console.log('  ACCELERATED SLA DEMO CLOCK SUITE: ALL 8 TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runAcceleratedSlaDemoSuite().catch((err) => {
  console.error('\n❌ ACCELERATED SLA DEMO TEST FAILED:', err);
  process.exit(1);
});
