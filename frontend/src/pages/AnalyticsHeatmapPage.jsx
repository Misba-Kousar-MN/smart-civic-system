import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  MapPin,
  Clock,
  Shield,
  Filter,
  RefreshCw,
  AlertCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';
import { masterDataApi } from '../api/masterDataApi';
import InteractiveMap from '../components/InteractiveMap';

const AnalyticsHeatmapPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);

  // Master Data Filter Options
  const [departments, setDepartments] = useState([]);
  const [zones, setZones] = useState([]);

  // Filter States
  const [filters, setFilters] = useState({
    dateRange: 'ALL', // 7D, 30D, ALL
    category: '',
    departmentId: '',
    zoneId: '',
    priority: '',
    severity: '',
    status: ''
  });

  const categories = [
    'Pothole',
    'Road Damage',
    'Garbage Dump',
    'Drainage Blockage',
    'Streetlight Failure',
    'Water Leakage',
    'Broken Footpath',
    'Encroachment',
    'Tree Fall',
    'Manhole Uncovered',
    'Other'
  ];

  const fetchMasterFilters = async () => {
    try {
      const [deptRes, zoneRes] = await Promise.all([
        masterDataApi.getDepartments(),
        masterDataApi.getZones()
      ]);
      if (deptRes?.success) setDepartments(deptRes.data.departments || []);
      if (zoneRes?.success) setZones(zoneRes.data.zones || []);
    } catch (e) {
      console.warn('[ANALYTICS] Master filter fetch warning:', e.message);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      let dateFrom = null;
      const now = new Date();
      if (filters.dateRange === '7D') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === '30D') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const queryParams = {
        dateFrom: dateFrom || undefined,
        category: filters.category || undefined,
        departmentId: filters.departmentId || undefined,
        zoneId: filters.zoneId || undefined,
        priority: filters.priority || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined
      };

      const [overviewRes, mapRes] = await Promise.all([
        analyticsApi.getOverview(queryParams),
        analyticsApi.getHeatmap(queryParams)
      ]);

      if (overviewRes?.success) {
        setAnalytics(overviewRes.data);
      }
      if (mapRes?.success) {
        setHeatmapData(mapRes.data.points || []);
      }
    } catch (err) {
      console.error('[ANALYTICS] Error loading analytics data:', err);
      setError(err.message || 'Failed to load real municipal analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterFilters();
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'ALL',
      category: '',
      departmentId: '',
      zoneId: '',
      priority: '',
      severity: '',
      status: ''
    });
  };

  const mapMarkers = heatmapData.map((pt) => ({
    id: pt.id,
    position: { lat: pt.latitude, lng: pt.longitude },
    title: `${pt.category} (${pt.priority})`,
    status: pt.status,
    priority: pt.priority,
    address: pt.address,
    detailsUrl: `/officer/incidents/${pt.id}`
  }));

  const mapCenter = heatmapData.length > 0
    ? { lat: heatmapData[0].latitude, lng: heatmapData[0].longitude }
    : { lat: 14.467389, lng: 75.92408 };

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A192F] text-white flex items-center justify-center font-bold shadow-md">
            <BarChart2 className="w-5 h-5 text-[#0B63E5]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Municipal Analytics & Geographic Heatmap
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real database metrics, SLA governance analytics, and geographic incident density mapping.
            </p>
          </div>
        </div>

        <button
          onClick={loadAnalyticsData}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 flex items-center gap-2 transition-all self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0B63E5]" />
            <span>Database Filter Controls</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-[11px] text-[#0B63E5] hover:underline font-bold"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Timeframe</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => handleFilterChange('departmentId', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zone</label>
            <select
              value={filters.zoneId}
              onChange={(e) => handleFilterChange('zoneId', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0B63E5]"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-[#0B63E5] tracking-tight">
            {loading ? '...' : analytics?.totals?.total_reports || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">Total Reports</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-purple-600 tracking-tight">
            {loading ? '...' : analytics?.totals?.total_incidents || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">Total Incidents</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-blue-600 tracking-tight">
            {loading ? '...' : analytics?.totals?.open_incidents || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">Open Incidents</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-red-600 tracking-tight">
            {loading ? '...' : analytics?.totals?.escalated_incidents || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">Escalated</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-emerald-600 tracking-tight">
            {loading ? '...' : analytics?.totals?.resolved_incidents || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">Resolved</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xl font-extrabold text-amber-600 tracking-tight">
            {loading ? '...' : `${analytics?.sla?.sla_compliance_rate || 100}%`}
          </div>
          <div className="text-[11px] font-bold text-slate-600 mt-0.5">SLA Compliance</div>
        </div>
      </div>

      {/* Leaflet Geographic Incident Density Map */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
            <MapPin className="w-4 h-4 text-[#0B63E5]" />
            <span>Geographic Incident Density & Location Heatmap</span>
          </div>
          <div className="text-xs font-bold text-slate-500">
            {heatmapData.length} Real Database Map Pins Plotted
          </div>
        </div>

        <InteractiveMap
          center={mapCenter}
          zoom={13}
          height="420px"
          interactive={false}
          markers={mapMarkers}
        />
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Workload Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-extrabold text-slate-900 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0B63E5]" />
              <span>Department Workload & Performance</span>
            </div>
          </div>
          <div className="p-4 space-y-3 text-xs">
            {loading ? (
              <div className="text-center text-slate-400 py-6">Loading department metrics...</div>
            ) : analytics?.department_workload?.length === 0 ? (
              <div className="text-center text-slate-500 py-6">No department data recorded.</div>
            ) : (
              analytics?.department_workload?.map((dept) => (
                <div key={dept.department} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{dept.department}</span>
                    <span className="text-slate-500">{dept.total} Total Incidents</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                    <span className="text-emerald-600">{dept.resolved} Resolved</span> •
                    <span className="text-blue-600">{dept.open} Open</span> •
                    <span className="text-red-600">{dept.escalated} Escalated</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category & Severity Distributions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-extrabold text-slate-900 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0B63E5]" />
              <span>Category & Severity Distribution</span>
            </div>
          </div>
          <div className="p-4 space-y-4 text-xs">
            {loading ? (
              <div className="text-center text-slate-400 py-6">Loading distribution data...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="font-bold text-slate-700 uppercase text-[10px]">Issue Categories</div>
                  <div className="space-y-1.5">
                    {analytics?.category_distribution?.slice(0, 5).map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{cat.category}</span>
                        <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md">
                          {cat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="font-bold text-slate-700 uppercase text-[10px]">Severity Levels</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-red-50 rounded-xl border border-red-200">
                      <div className="font-extrabold text-red-700">{analytics?.severity_distribution?.CRITICAL || 0}</div>
                      <div className="text-[9px] font-bold text-red-600 uppercase">Critical</div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="font-extrabold text-orange-700">{analytics?.severity_distribution?.HIGH || 0}</div>
                      <div className="text-[9px] font-bold text-orange-600 uppercase">High</div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="font-extrabold text-blue-700">{analytics?.severity_distribution?.MEDIUM || 0}</div>
                      <div className="text-[9px] font-bold text-blue-600 uppercase">Medium</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-extrabold text-slate-700">{analytics?.severity_distribution?.LOW || 0}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Low</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHeatmapPage;
