import React, { useState, useEffect } from 'react';
import { Building2, Shield, Users, Clock, MapPin, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';
import { masterDataApi } from '../api/masterDataApi';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [zones, setZones] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [zRes, dRes] = await Promise.all([
        masterDataApi.getZones(),
        masterDataApi.getDepartments()
      ]);
      if (zRes?.success) setZones(zRes.data.zones || []);
      if (dRes?.success) setDepartments(dRes.data.departments || []);
    } catch (err) {
      console.warn('[ADMIN] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const sampleOfficers = [
    { id: 'off-1', full_name: 'Rajesh Kumar', level: 1, department_name: 'Public Works', zone_name: 'Davangere Zone 1', email: 'r.kumar@davangere.gov.in' },
    { id: 'off-2', full_name: 'Priya Sharma', level: 2, department_name: 'Electrical & Lighting', zone_name: 'Davangere Zone 2', email: 'p.sharma@davangere.gov.in' },
    { id: 'off-3', full_name: 'Anil Deshmukh', level: 3, department_name: 'Waste Management', zone_name: 'Davangere Main Corporation', email: 'a.deshmukh@davangere.gov.in' }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      
      {/* Admin Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D4775] text-white flex items-center justify-center font-bold shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Admin Governance Console
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure municipal zones, service departments, SLA policies & officer directory.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Governance Data</span>
        </button>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-[#1769AA] tracking-tight">{departments.length || 6}</div>
            <div className="text-xs font-bold text-slate-700 mt-1">Service Departments</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight">{zones.length || 4}</div>
            <div className="text-xs font-bold text-slate-700 mt-1">Municipal Zones</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">14</div>
            <div className="text-xs font-bold text-slate-700 mt-1">Active Officers</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">96.4%</div>
            <div className="text-xs font-bold text-slate-700 mt-1">SLA Compliance Rate</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-[#1769AA] text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Governance Overview
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'officers'
              ? 'bg-[#1769AA] text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Officer Directory
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Departments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1769AA]" /> Municipal Service Departments
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] border border-blue-200">
                Active
              </span>
            </div>

            <div className="space-y-3">
              {(departments.length > 0 ? departments : [
                { id: '1', name: 'Public Works Department (Roads)', sla_hours: 24 },
                { id: '2', name: 'Electrical & Street Lighting', sla_hours: 12 },
                { id: '3', name: 'Waste Management & Sanitation', sla_hours: 24 },
                { id: '4', name: 'Water Supply & Sewerage Board', sla_hours: 48 }
              ]).map((dept) => (
                <div key={dept.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs block">{dept.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Dept ID: {dept.id}</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    SLA Target: {dept.sla_hours || 24}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Zones */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" /> Municipal Wards & Zones
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Active Jurisdiction
              </span>
            </div>

            <div className="space-y-3">
              {(zones.length > 0 ? zones : [
                { id: 'z1', name: 'Zone 1 - Bapuji Nagar & Central Business Ward', code: 'Z-01' },
                { id: 'z2', name: 'Zone 2 - Vijayanagar & North Industrial Ward', code: 'Z-02' },
                { id: 'z3', name: 'Zone 3 - MCC B Zone & South Residential Ward', code: 'Z-03' },
                { id: 'z4', name: 'Zone 4 - Shanthi Nagar & East Commercial Ward', code: 'Z-04' }
              ]).map((zone) => (
                <div key={zone.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs block">{zone.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Code: {zone.code || `ZONE-${zone.id}`}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Active Coverage
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'officers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Registered Ward Officers Directory
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Total Officers: {sampleOfficers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Role Level</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Ward / Zone</th>
                  <th className="py-3 px-4">Contact Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleOfficers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-50/80 transition-colors h-[64px]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1769AA] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          {officer.full_name.charAt(0)}
                        </div>
                        <span className="font-extrabold text-slate-900">{officer.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#1769AA] font-bold text-[10px] border border-blue-200">
                        Level {officer.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{officer.department_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{officer.zone_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{officer.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
