const { supabaseService } = require('../config/supabase');
const { parseLocationPoint } = require('./intelligenceService');

/**
 * Helper to apply database query filters based on req query params
 */
function applyFilters(query, { dateFrom, dateTo, category, departmentId, zoneId, priority, severity, status }) {
  let filteredQuery = query;

  if (dateFrom) {
    filteredQuery = filteredQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    filteredQuery = filteredQuery.lte('created_at', dateTo);
  }
  if (category) {
    filteredQuery = filteredQuery.eq('category', category);
  }
  if (departmentId) {
    filteredQuery = filteredQuery.eq('department_id', departmentId);
  }
  if (zoneId) {
    filteredQuery = filteredQuery.eq('zone_id', zoneId);
  }
  if (priority) {
    filteredQuery = filteredQuery.eq('priority_level', priority);
  }
  if (severity) {
    filteredQuery = filteredQuery.eq('severity', severity);
  }
  if (status) {
    filteredQuery = filteredQuery.eq('status', status);
  }

  return filteredQuery;
}

/**
 * Compute real municipal analytics overview from PostgreSQL data
 */
async function getOverviewAnalytics(filters = {}) {
  // Query 1: Reports count
  let reportsQuery = supabaseService.from('reports').select('id, created_at', { count: 'exact' });
  if (filters.dateFrom) reportsQuery = reportsQuery.gte('created_at', filters.dateFrom);
  if (filters.dateTo) reportsQuery = reportsQuery.lte('created_at', filters.dateTo);
  if (filters.category) reportsQuery = reportsQuery.eq('ai_category', filters.category);
  const { count: totalReports } = await reportsQuery;

  // Query 2: Incidents full dataset with filters
  let incidentsQuery = supabaseService
    .from('incidents')
    .select(`
      id,
      category,
      severity,
      priority_level,
      priority_score,
      status,
      created_at,
      resolved_at,
      sla_deadline,
      department_id,
      zone_id,
      departments (id, name, code),
      zones (id, name, code)
    `);

  incidentsQuery = applyFilters(incidentsQuery, filters);
  const { data: incidents, error: incErr } = await incidentsQuery;

  if (incErr) {
    console.error('[ANALYTICS] Error fetching incidents data:', incErr);
    throw new Error(`Failed to load analytics: ${incErr.message}`);
  }

  const dataset = incidents || [];
  const totalIncidents = dataset.length;

  // Status counters
  const statusCounts = {
    OPEN: 0,
    IN_PROGRESS: 0,
    ESCALATED: 0,
    RESOLVED: 0,
    CLOSED: 0
  };

  // Distribution maps
  const categoryDist = {};
  const severityDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const priorityDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const departmentWorkloadMap = {};
  const zoneDistMap = {};

  let totalResolutionTimeHours = 0;
  let resolvedCount = 0;
  let metSlaCount = 0;
  let breachedSlaCount = 0;

  const resolutionTimeDist = {
    under_12h: 0,
    h12_to_24: 0,
    h24_to_72: 0,
    over_72h: 0
  };

  const now = new Date();

  dataset.forEach((inc) => {
    // Status distribution
    if (statusCounts[inc.status] !== undefined) {
      statusCounts[inc.status]++;
    }

    // Category distribution
    const cat = inc.category || 'Other';
    categoryDist[cat] = (categoryDist[cat] || 0) + 1;

    // Severity distribution
    if (inc.severity && severityDist[inc.severity] !== undefined) {
      severityDist[inc.severity]++;
    }

    // Priority distribution
    if (inc.priority_level && priorityDist[inc.priority_level] !== undefined) {
      priorityDist[inc.priority_level]++;
    }

    // Department workload
    const deptName = inc.departments?.name || 'Unassigned Department';
    if (!departmentWorkloadMap[deptName]) {
      departmentWorkloadMap[deptName] = { total: 0, resolved: 0, open: 0, escalated: 0 };
    }
    departmentWorkloadMap[deptName].total++;
    if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') {
      departmentWorkloadMap[deptName].resolved++;
    } else if (inc.status === 'ESCALATED') {
      departmentWorkloadMap[deptName].escalated++;
    } else {
      departmentWorkloadMap[deptName].open++;
    }

    // Zone distribution
    const zoneName = inc.zones?.name || 'Unassigned Zone';
    zoneDistMap[zoneName] = (zoneDistMap[zoneName] || 0) + 1;

    // SLA & Resolution Time calculations
    if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') {
      resolvedCount++;
      if (inc.resolved_at && inc.created_at) {
        const createdDate = new Date(inc.created_at);
        const resolvedDate = new Date(inc.resolved_at);
        const hours = Math.max(0, (resolvedDate - createdDate) / (1000 * 60 * 60));
        totalResolutionTimeHours += hours;

        if (hours <= 12) resolutionTimeDist.under_12h++;
        else if (hours <= 24) resolutionTimeDist.h12_to_24++;
        else if (hours <= 72) resolutionTimeDist.h24_to_72++;
        else resolutionTimeDist.over_72h++;

        if (inc.sla_deadline && resolvedDate <= new Date(inc.sla_deadline)) {
          metSlaCount++;
        } else {
          breachedSlaCount++;
        }
      } else {
        metSlaCount++;
      }
    } else {
      // Active incident SLA check
      if (inc.sla_deadline && now > new Date(inc.sla_deadline)) {
        breachedSlaCount++;
      } else {
        metSlaCount++;
      }
    }
  });

  const totalSlaEvaluated = metSlaCount + breachedSlaCount;
  const slaComplianceRate = totalSlaEvaluated > 0
    ? parseFloat(((metSlaCount / totalSlaEvaluated) * 100).toFixed(1))
    : 100.0;

  const avgResolutionHours = resolvedCount > 0
    ? parseFloat((totalResolutionTimeHours / resolvedCount).toFixed(1))
    : 0.0;

  // Format department workload as array
  const departmentWorkload = Object.keys(departmentWorkloadMap).map((dept) => ({
    department: dept,
    ...departmentWorkloadMap[dept]
  }));

  // Format category distribution as array
  const categoryDistribution = Object.keys(categoryDist).map((cat) => ({
    category: cat,
    count: categoryDist[cat]
  })).sort((a, b) => b.count - a.count);

  // Format zone distribution as array
  const zoneDistribution = Object.keys(zoneDistMap).map((z) => ({
    zone: z,
    count: zoneDistMap[z]
  })).sort((a, b) => b.count - a.count);

  return {
    totals: {
      total_reports: totalReports || 0,
      total_incidents: totalIncidents,
      open_incidents: statusCounts.OPEN,
      in_progress_incidents: statusCounts.IN_PROGRESS,
      escalated_incidents: statusCounts.ESCALATED,
      resolved_incidents: statusCounts.RESOLVED + statusCounts.CLOSED
    },
    status_counts: statusCounts,
    sla: {
      sla_compliance_rate: slaComplianceRate,
      met_sla_count: metSlaCount,
      breached_sla_count: breachedSlaCount,
      avg_resolution_hours: avgResolutionHours,
      resolution_time_distribution: resolutionTimeDist
    },
    category_distribution: categoryDistribution,
    severity_distribution: severityDist,
    priority_distribution: priorityDist,
    department_workload: departmentWorkload,
    zone_distribution: zoneDistribution
  };
}

/**
 * Fetch real geographic heatmap coordinates for incidents and reports
 */
async function getHeatmapData(filters = {}) {
  let query = supabaseService
    .from('incidents')
    .select(`
      id,
      category,
      severity,
      priority_level,
      status,
      location,
      address,
      created_at,
      departments (name),
      zones (name)
    `);

  query = applyFilters(query, filters);
  const { data: incidents, error } = await query;

  if (error) {
    console.error('[HEATMAP] Error fetching heatmap points:', error);
    throw new Error(`Failed to load heatmap data: ${error.message}`);
  }

  const points = (incidents || [])
    .map((inc) => {
      const pt = parseLocationPoint(inc.location);
      if (!pt || !pt.latitude || !pt.longitude) return null;

      // Weight multiplier based on priority level for intensity heat visual
      const weightMap = { CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25 };
      const weight = weightMap[inc.priority_level] || 0.5;

      return {
        id: inc.id,
        latitude: pt.latitude,
        longitude: pt.longitude,
        weight: weight,
        category: inc.category,
        severity: inc.severity,
        priority: inc.priority_level,
        status: inc.status,
        address: inc.address || `Location (${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)})`,
        created_at: inc.created_at,
        department_name: inc.departments?.name || 'Unassigned',
        zone_name: inc.zones?.name || 'Unassigned'
      };
    })
    .filter(Boolean);

  return {
    total_points: points.length,
    points: points
  };
}

module.exports = {
  getOverviewAnalytics,
  getHeatmapData
};
