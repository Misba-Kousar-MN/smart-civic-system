import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  MapPin,
  Bell,
  ChevronRight,
  Award,
  Compass,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { reportApi } from '../api/reportApi';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import InteractiveMap from '../components/InteractiveMap';
import { parseCoordinates } from '../utils/locationUtils';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getReports({ limit: 15 });
      if (res?.success && res?.data) {
        const list = res.data.reports || [];
        setReports(list);

        if (res.data.status_counts) {
          setStats({
            total: res.data.status_counts.total || 0,
            open: res.data.status_counts.open || 0,
            inProgress: res.data.status_counts.inProgress || 0,
            resolved: res.data.status_counts.resolved || 0
          });
        } else {
          const total = res.data.pagination?.total || list.length || 0;
          const open = list.filter((r) => r.status === 'OPEN' || r.status === 'ASSIGNED').length;
          const inProgress = list.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'ESCALATED' || r.status === 'PAUSED' || r.status === 'REOPENED').length;
          const resolved = list.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length;

          setStats({
            total: total,
            open: open,
            inProgress: inProgress,
            resolved: resolved
          });
        }
      }
    } catch (err) {
      console.warn('[DASHBOARD] Error loading user reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, []);

  useEffect(() => {
    if (lastEvent && (lastEvent.table === 'incidents' || lastEvent.table === 'reports' || lastEvent.table === 'resolution_evidence')) {
      fetchUserReports();
    }
  }, [lastEvent]);

  const userName = user?.full_name || user?.email?.split('@')[0] || 'Citizen';
  const activeReportsList = reports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS' || r.status === 'ESCALATED');

  // Map markers format
  const mapMarkers = reports.map(r => {
    const coords = parseCoordinates(r.location);
    return {
      id: r.id,
      latitude: coords ? coords.lat : 14.467389,
      longitude: coords ? coords.lng : 75.924080,
      title: r.ai_category || r.category || 'Civic Report',
      category: r.ai_category || r.category || 'Other',
      status: r.status || 'OPEN'
    };
  });

  return (
    <div className="max-w-[1200px] mx-auto pb-16 px-3 sm:px-6 pt-3 select-none">
      
      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* LEFT COLUMN: Greeting, Banner, Actions, Stats, Active Reports */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 1. Header Greeting */}
          <div className="flex items-center justify-between bg-white p-4.5 rounded-[16px] border border-[#DDEBE2] shadow-xs">
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#163A2C] tracking-tight">
                Hello, {userName} 👋
              </h1>
              <p className="text-xs text-[#648274] font-normal">
                Let's make our city better today.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF7EF] border border-[#D5EBDD] text-[#237A52] text-xs font-semibold shadow-xs">
                <Award className="w-3.5 h-3.5 text-[#237A52] shrink-0" />
                <span>{user?.trust_score || 100} PTS</span>
              </div>

              <Link
                to="/notifications"
                className="w-9 h-9 rounded-xl bg-[#F1FAF4] border border-[#DDEBE2] text-[#237A52] flex items-center justify-center relative hover:bg-[#EAF7EF] transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#237A52] ring-2 ring-white" />
              </Link>
            </div>
          </div>

          {/* 2. Highlight Banner: "See an issue?" Soft Mint Feature Card */}
          <div className="bg-[#EAF7EF] p-5 rounded-[16px] border border-[#D5EBDD] flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-[#237A52] tracking-tight">
                See an issue?
              </h2>
              <p className="text-xs text-[#163A2C] font-normal">
                Report it in just a few taps
              </p>
            </div>

            <Link
              to="/citizen/submit-report"
              className="btn-civic-primary py-2.5 px-5 text-xs font-semibold shrink-0 rounded-xl"
            >
              <span>Report Now →</span>
            </Link>
          </div>

          {/* 3. Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            <Link
              to="/citizen/submit-report"
              className="p-3 rounded-[16px] bg-white border border-[#DDEBE2] hover:border-[#237A52] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F1FAF4] text-[#237A52] group-hover:bg-[#237A52] group-hover:text-white flex items-center justify-center transition-colors">
                <PlusCircle className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#163A2C] group-hover:text-[#237A52] transition-colors leading-tight">
                Report Issue
              </span>
            </Link>

            <Link
              to="/citizen/my-reports"
              className="p-3 rounded-[16px] bg-white border border-[#DDEBE2] hover:border-[#237A52] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F1FAF4] text-[#237A52] group-hover:bg-[#237A52] group-hover:text-white flex items-center justify-center transition-colors">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#163A2C] group-hover:text-[#237A52] transition-colors leading-tight">
                My Reports
              </span>
            </Link>

            <Link
              to="/citizen/my-reports?tab=track"
              className="p-3 rounded-[16px] bg-white border border-[#DDEBE2] hover:border-[#237A52] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F1FAF4] text-[#237A52] group-hover:bg-[#237A52] group-hover:text-white flex items-center justify-center transition-colors">
                <Compass className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#163A2C] group-hover:text-[#237A52] transition-colors leading-tight">
                Track Issues
              </span>
            </Link>

            <Link
              to="/citizen/my-reports?tab=map"
              className="p-3 rounded-[16px] bg-white border border-[#DDEBE2] hover:border-[#237A52] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F1FAF4] text-[#237A52] group-hover:bg-[#237A52] group-hover:text-white flex items-center justify-center transition-colors">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#163A2C] group-hover:text-[#237A52] transition-colors leading-tight">
                Nearby Issues
              </span>
            </Link>
          </div>

          {/* 4. Live Status Overview */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
                Live Status Overview
              </span>
              <Link to="/citizen/my-reports" className="text-[11px] font-semibold text-[#237A52] hover:underline">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Open */}
              <div className="p-3 rounded-xl bg-[#F1FAF4] border border-[#DDEBE2]">
                <div className="flex items-center justify-center gap-1 text-[#237A52] text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#237A52]" />
                  <span>Open</span>
                </div>
                <div className="text-xl font-bold text-[#163A2C] font-mono mt-0.5">
                  {loading ? '...' : stats.open}
                </div>
              </div>

              {/* In Progress */}
              <div className="p-3 rounded-xl bg-[#FEF7EA] border border-[#FCE8C5]">
                <div className="flex items-center justify-center gap-1 text-[#D49A32] text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#D49A32]" />
                  <span>In Progress</span>
                </div>
                <div className="text-xl font-bold text-[#163A2C] font-mono mt-0.5">
                  {loading ? '...' : stats.inProgress}
                </div>
              </div>

              {/* Resolved */}
              <div className="p-3 rounded-xl bg-[#EAF7EF] border border-[#D5EBDD]">
                <div className="flex items-center justify-center gap-1 text-[#2D8A5B] text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#2D8A5B]" />
                  <span>Resolved</span>
                </div>
                <div className="text-xl font-bold text-[#237A52] font-mono mt-0.5">
                  {loading ? '...' : stats.resolved}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Active Reports Section */}
          <div className="bg-white p-4.5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
                Your Active Reports ({activeReportsList.length})
              </span>
              <Link to="/citizen/my-reports" className="text-[11px] font-semibold text-[#237A52] hover:underline">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="p-6 text-center text-[#8AA095] text-xs">Loading active reports...</div>
            ) : activeReportsList.length === 0 ? (
              <EmptyState
                title="No Active Reports"
                description="You currently have no open or in-progress civic reports."
                actionText="Report an Issue"
                onAction={() => window.location.href = '/citizen/submit-report'}
              />
            ) : (
              <div className="space-y-2.5">
                {activeReportsList.slice(0, 3).map((report) => (
                  <Link
                    key={report.id}
                    to={`/citizen/reports/${report.id}`}
                    className="p-3 rounded-xl border border-[#DDEBE2] hover:border-[#237A52] bg-[#FBFDFC] hover:bg-white transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={report.image_url}
                        alt="Evidence"
                        className="w-12 h-12 rounded-lg object-cover border border-[#DDEBE2] shrink-0 bg-white"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-[#163A2C] group-hover:text-[#237A52] transition-colors truncate">
                          {report.ai_category || report.category || 'Pothole on Main Street'}
                        </div>
                        <div className="text-[11px] text-[#648274] truncate mt-0.5">
                          {report.location_name || 'Davangere Municipal Zone'}
                        </div>
                        {report.report_count > 1 && (
                          <div className="text-[10px] font-semibold text-[#237A52] flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3 text-[#237A52]" />
                            <span>{report.report_count} citizens reported this issue</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={report.status || 'OPEN'} />
                      <ChevronRight className="w-4 h-4 text-[#8AA095] group-hover:text-[#237A52]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Civic Map & Recent Submissions */}
        <div className="space-y-4">
          
          {/* Civic Map Card */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#237A52]" />
                <span>Nearby Civic Issues</span>
              </span>
              <span className="text-[11px] font-semibold text-[#648274]">{reports.length} Mapped</span>
            </div>

            <div className="h-56 rounded-xl overflow-hidden border border-[#DDEBE2]">
              <InteractiveMap
                markers={mapMarkers}
                center={[14.467389, 75.924080]}
                zoom={13}
                height="100%"
              />
            </div>
          </div>

          {/* Recent Submissions List */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
                Recent Reports
              </span>
              <Link to="/citizen/my-reports" className="text-[11px] font-semibold text-[#237A52] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {reports.slice(0, 4).map((r) => (
                <Link
                  key={r.id}
                  to={`/citizen/reports/${r.id}`}
                  className="p-2.5 rounded-xl border border-[#DDEBE2] hover:border-[#237A52] bg-[#FBFDFC] hover:bg-white transition-all flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={r.image_url}
                      alt="Thumbnail"
                      className="w-10 h-10 rounded-lg object-cover border border-[#DDEBE2] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#163A2C] group-hover:text-[#237A52] truncate">
                        {r.ai_category || r.category || 'Pothole'}
                      </div>
                      <div className="text-[10px] text-[#8AA095]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8AA095] group-hover:text-[#237A52] shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CitizenDashboard;
