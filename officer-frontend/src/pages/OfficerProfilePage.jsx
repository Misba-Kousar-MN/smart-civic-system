import React from 'react';
import { User, Shield, Building2, MapPin, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OfficerProfilePage = () => {
  const { user } = useAuth();

  const roleTitle = user?.role === 'ward_officer'
    ? 'Level 1 Ward Officer'
    : user?.role === 'aee'
    ? 'Level 2 Assistant Executive Engineer (AEE)'
    : user?.role === 'commissioner'
    ? 'Level 3 Municipal Commissioner'
    : 'Municipal Officer';

  return (
    <div className="bg-[#F0F8F5] min-h-screen space-y-6 max-w-[1000px] mx-auto pb-12 select-none">
      
      {/* Header */}
      <div className="bg-[#E6F4ED] p-6 rounded-2xl border border-[#B8E0CB] shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1F5443] tracking-tight">
            Officer Profile & Credentials
          </h1>
          <p className="text-xs text-[#4A7365] font-medium mt-1">
            Municipal officer identity, department jurisdiction & operational standing.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-[#D5EFE1] text-[#216D51] text-xs font-extrabold border border-[#B8E0CB]">
          PORT 5174 • ACTIVE
        </span>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols) */}
        <div className="md:col-span-5 bg-[#E6F4ED] p-6 rounded-2xl border border-[#B8E0CB] shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-3xl bg-[#349670] text-white flex items-center justify-center font-extrabold text-3xl shadow-xl shadow-emerald-950/20 border-2 border-[#5EB894]">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-[#1F5443]">{user?.full_name || 'Municipal Officer'}</h2>
            <div className="text-xs font-bold text-[#349670] mt-0.5">{roleTitle}</div>
            <div className="text-xs text-[#4A7365] font-medium mt-1">{user?.email}</div>
          </div>

          <div className="w-full pt-4 border-t border-[#B8E0CB] grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <div className="text-xl font-extrabold text-[#216D51]">98%</div>
              <div className="text-[10px] font-bold text-[#4A7365] uppercase mt-0.5">SLA Compliance</div>
            </div>

            <div className="p-3 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <div className="text-xl font-extrabold text-[#349670]">42</div>
              <div className="text-[10px] font-bold text-[#4A7365] uppercase mt-0.5">Resolved Issues</div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols) */}
        <div className="md:col-span-7 bg-[#E6F4ED] p-6 rounded-2xl border border-[#B8E0CB] shadow-xs space-y-5">
          <div className="font-extrabold text-[#1F5443] text-base border-b border-[#B8E0CB] pb-3">
            Municipal Jurisdiction Details
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3.5 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <Building2 className="w-5 h-5 text-[#349670] shrink-0" />
              <div>
                <div className="font-extrabold text-[#1F5443]">Department Jurisdiction</div>
                <div className="text-[#174437] font-medium">Public Works & Road Infrastructure</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <MapPin className="w-5 h-5 text-[#9C621E] shrink-0" />
              <div>
                <div className="font-extrabold text-[#1F5443]">Assigned Municipal Zone</div>
                <div className="text-[#174437] font-medium">Zone 4 — Davangere Municipal Corporation</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <Award className="w-5 h-5 text-[#216D51] shrink-0" />
              <div>
                <div className="font-extrabold text-[#1F5443]">Authority Authorization Status</div>
                <div className="text-[#174437] font-medium">Verified Active Municipal Officer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerProfilePage;
