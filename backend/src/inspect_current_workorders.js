const { supabaseService } = require('./config/supabase');

async function inspectWorkorders() {
  console.log('=== INSPECTING CURRENT WORKORDERS IN DATABASE ===');

  const { data: incidents, error: incErr } = await supabaseService
    .from('incidents')
    .select('id, category, status, priority_level, created_at');

  console.log('Incidents count:', incidents ? incidents.length : 0);
  if (incidents) {
    incidents.forEach((inc, idx) => {
      console.log(`[Incident ${idx + 1}] ID: ${inc.id} | Status: ${inc.status} | Category: ${inc.category}`);
    });
  }

  const { data: reports, error: repErr } = await supabaseService
    .from('reports')
    .select('id, user_id, image_url, ai_category, ai_confidence');

  console.log('\nReports count:', reports ? reports.length : 0);
  if (reports) {
    reports.forEach((rep, idx) => {
      console.log(`[Report ${idx + 1}] ID: ${rep.id} | User: ${rep.user_id} | AI: ${rep.ai_category}`);
    });
  }

  const { data: incReps, error: irErr } = await supabaseService
    .from('incident_reports')
    .select('id, incident_id, report_id, is_primary');

  console.log('\nIncident_Reports Junction count:', incReps ? incReps.length : 0);
  if (incReps) {
    incReps.forEach((ir, idx) => {
      console.log(`[Junction ${idx + 1}] Junction ID: ${ir.id} | Incident ID: ${ir.incident_id} | Report ID: ${ir.report_id}`);
    });
  }
}

inspectWorkorders().catch(console.error);
