import React, { useState, useEffect } from 'react';
import { Building2, Shield, Users, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { masterDataApi } from '../api/masterDataApi';

const AdminDashboard = () => {
  const [officers, setOfficers] = useState([]);
  const [metrics, setMetrics] = useState({
    departments_count: 0,
    zones_count: 0,
    active_officers_count: 0,
    sla_compliance_rate: 100.0,
    total_resolved_incidents: 0,
    met_sla_incidents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      const [offRes, metRes] = await Promise.all([
        masterDataApi.getOfficers(),
        masterDataApi.getAdminMetrics()
      ]);

      if (offRes?.success && offRes?.data) {
        setOfficers(offRes.data.officers || []);
      }
      if (metRes?.success && metRes?.data) {
        setMetrics(metRes.data);
      }
    } catch (err) {
      console.warn('[ADMIN] Error loading real governance data:', err);
      setError(err.message || 'Access restricted. Admin or Commissioner authorization required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A192F] text-white flex items-center justify-center font-bold shadow-md">
            <Shield className="w-5 h-5 text-[#0B63E5]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Admin Governance Console
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Municipal officer directory, service departments, and real-time SLA governance.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 flex items-center gap-2 transition-all self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Governance Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards (All Real Database Calculations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-[#0B63E5] tracking-tight">
              {loading ? '...' : metrics.departments_count}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1">Service Departments</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0B63E5] border border-blue-100 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight">
              {loading ? '...' : metrics.zones_count}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1">Municipal Zones</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              {loading ? '...' : metrics.active_officers_count}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1">Active Officers</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {loading ? '...' : `${metrics.sla_compliance_rate}%`}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1">SLA Compliance Rate</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Directory Table (Real Database Officers) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-extrabold text-slate-900 text-sm flex items-center justify-between">
          <span>Active Municipal Officers Directory</span>
          <span className="text-xs text-slate-500 font-medium">({officers.length} Officers Registered)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Officer Name</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">Loading officers directory...</td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500 font-medium">No officers provisioned in database directory.</td>
                </tr>
              ) : (
                officers.map((off) => (
                  <tr key={off.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{off.full_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B63E5] font-extrabold text-[10px] border border-blue-200">
                        Level {off.level} ({off.role})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{off.department_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{off.zone_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
