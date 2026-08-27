import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Users
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const STATUS_TABS = [
  { id: '', label: 'All', count: 12 },
  { id: 'OPEN', label: 'Open', count: 4 },
  { id: 'IN_PROGRESS', label: 'In Progress', count: 5 },
  { id: 'RESOLVED', label: 'Resolved', count: 3 }
];

const MyReportsPage = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [activeStatusTab, setActiveStatusTab] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 10 };
      if (activeStatusTab) params.status = activeStatusTab;

      const res = await reportApi.getReports(params);
      if (res?.success && res?.data) {
        setReports(res.data.reports || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0 });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [activeStatusTab]);

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const cat = (r.ai_category || r.category || '').toLowerCase();
    const id = (r.id || '').toLowerCase();
    const loc = (r.location_name || '').toLowerCase();
    return cat.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase()) || loc.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-[880px] mx-auto pb-16 px-3 sm:px-6 pt-3 select-none space-y-4">
      
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between bg-white p-4.5 rounded-[16px] border border-[#DDEBE2] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#163A2C] tracking-tight">
            My Reports
          </h1>
          <p className="text-xs text-[#648274] font-normal mt-0.5">
            Track all submitted civic issues and live operational status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8AA095] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-36 sm:w-48 h-9 pl-9 pr-3 bg-[#FBFDFC] border border-[#D8E8DE] rounded-xl text-xs text-[#163A2C] focus:outline-none focus:border-[#237A52]"
            />
          </div>
          <Link to="/citizen/submit-report" className="btn-civic-primary py-2 px-3.5 text-xs font-semibold shrink-0 rounded-xl">
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Report</span>
          </Link>
        </div>
      </div>

      {/* 2. Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveStatusTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === tab.id
                ? 'bg-[#237A52] text-white shadow-xs'
                : 'bg-[#EEF6F1] text-[#237A52] hover:bg-[#EAF7EF] border border-[#D5EBDD]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 3. Report List Cards */}
      {loading ? (
        <div className="p-8 text-center text-[#8AA095] text-xs font-medium bg-white rounded-[16px] border border-[#DDEBE2]">
          Loading reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No Reports Found"
          description="See something that needs attention? Your report can help make a difference."
          actionText="Report an Issue"
          onAction={() => window.location.href = '/citizen/submit-report'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredReports.map((report) => (
            <Link
              key={report.id}
              to={`/citizen/reports/${report.id}`}
              className="p-3.5 rounded-[16px] border border-[#DDEBE2] hover:border-[#237A52] bg-white hover:bg-[#FBFDFC] transition-all flex items-center justify-between gap-3 group shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={report.image_url}
                  alt="Thumbnail"
                  className="w-13 h-13 rounded-xl object-cover border border-[#DDEBE2] bg-[#FBFDFC] shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-xs text-[#163A2C] group-hover:text-[#237A52] transition-colors truncate">
                    {report.ai_category || report.category || 'Pothole on Main Street'}
                  </div>
                  <div className="text-[10px] font-mono text-[#8AA095]">
                    RPT-2025-{report.id.substring(0, 6)}
                  </div>
                  {report.report_count > 1 && (
                    <div className="text-[10px] font-semibold text-[#237A52] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#237A52]" />
                      <span>{report.report_count} citizens reported this issue</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={report.status || 'OPEN'} />
                <span className="text-[10px] text-[#8AA095]">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
};

export default MyReportsPage;
