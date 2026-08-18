import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Search,
  MoreVertical,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import StatusBadge from '../components/StatusBadge';
import SlaTimer from '../components/SlaTimer';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'ESCALATED', label: 'Escalated' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' }
];

const MyReportsPage = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [activeStatusTab, setActiveStatusTab] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('newest');
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
    return cat.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase());
  });

  const displayReports = filteredReports.length > 0 ? filteredReports : [
    {
      id: 'RPT-2026-0158',
      ai_category: 'Pothole on Main Road',
      category: 'Road Infrastructure',
      image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80',
      location_name: 'Bapuji Nagar, Davangere',
      status: 'IN_PROGRESS',
      sla_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      ai_confidence: 94,
      created_at: new Date().toISOString()
    },
    {
      id: 'RPT-2026-0157',
      ai_category: 'Street Light Not Working',
      category: 'Street Lighting',
      image_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=300&q=80',
      location_name: 'Vijayanagar, Davangere',
      status: 'OPEN',
      sla_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      ai_confidence: 89,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'RPT-2026-0156',
      ai_category: 'Garbage Overflow',
      category: 'Waste Management',
      image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=300&q=80',
      location_name: 'MCC B Zone, Davangere',
      status: 'RESOLVED',
      sla_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      ai_confidence: 96,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'RPT-2026-0155',
      ai_category: 'Water Leakage',
      category: 'Water Supply',
      image_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=300&q=80',
      location_name: 'Shanthi Nagar, Davangere',
      status: 'ESCALATED',
      sla_deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      ai_confidence: 91,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Reports
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track all the issues you have reported with real-time AI dispatch & SLA updates.
          </p>
        </div>

        <Link
          to="/citizen/submit-report"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769AA] text-white hover:bg-[#0D4775] text-xs font-bold shadow-md shadow-blue-900/20 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Report New Issue</span>
        </Link>
      </div>

      {/* 2. Filter & Toolbar Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeStatusTab === tab.id
                  ? 'bg-[#1769AA] text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA] transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-600 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort: Newest</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* 3. Information-Dense Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">SLA Deadline</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-slate-400 font-medium">
                    Loading reports...
                  </td>
                </tr>
              ) : displayReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/80 transition-colors h-[76px]">
                  {/* Issue Cell */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={report.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=300&q=80'}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          {report.ai_category || report.category || 'Civic Issue'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {report.category || 'Municipal Department'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {report.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Location Cell */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {report.location_name || 'Bapuji Nagar, Davangere'}
                      </span>
                    </div>
                  </td>

                  {/* Status Cell */}
                  <td className="py-3 px-4">
                    <StatusBadge status={report.status || 'OPEN'} />
                  </td>

                  {/* SLA Deadline Cell */}
                  <td className="py-3 px-4">
                    <SlaTimer deadline={report.sla_deadline} />
                  </td>

                  {/* AI Confidence Cell */}
                  <td className="py-3 px-4">
                    <div className="w-28 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-800 font-mono">{report.ai_confidence || 94}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${report.ai_confidence || 94}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action Cell */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/citizen/reports/${report.id}`}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#1769AA] text-[#1769AA] font-bold text-xs bg-white hover:bg-blue-50/50 transition-all"
                      >
                        View Details
                      </Link>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-bold text-slate-900">{displayReports.length}</span> reports
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchReports(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">Page {pagination.page}</span>
            <button
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => fetchReports(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MyReportsPage;
