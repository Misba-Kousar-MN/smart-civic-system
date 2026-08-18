import React, { useState } from 'react';
import {
  Award,
  User,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Save,
  FileText,
  MapPin,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || 'Test Citizen');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [location, setLocation] = useState('Davangere, Karnataka');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 select-none">
      
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          My Profile & Standing
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Manage your account information and view your municipal trust standing score.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully.</span>
        </div>
      )}

      {/* Main 2-Column Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Profile Overview & Trust Meter (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Profile Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#1769AA] text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-md border-4 border-slate-50">
              {user?.full_name?.charAt(0).toUpperCase() || 'T'}
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {user?.full_name || 'Test Citizen'}
              </h2>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-blue-50 text-[#1769AA] text-[10px] font-extrabold uppercase border border-blue-200">
                {user?.role || 'CITIZEN'}
              </span>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-2 border-t border-slate-100 text-left">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user?.email || 'test.citizen@email.com'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* Trust Score Card */}
          <div className="bg-gradient-to-br from-amber-50/80 via-white to-slate-50 p-6 rounded-2xl border border-amber-200 shadow-2xs text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
              <Award className="w-6 h-6" />
            </div>

            <div>
              <div className="text-3xl font-extrabold text-amber-800 tracking-tight">
                {user?.trust_score || 100} PTS
              </div>
              <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Excellent Standing</span>
              </div>
            </div>

            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(user?.trust_score || 100, 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Your score increases when you submit verified reports with high AI confidence & clear location coordinates.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Account Settings Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Account Information
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={user?.email || 'test.citizen@email.com'}
                  readOnly
                  className="w-full h-11 pl-9 pr-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#1769AA] hover:bg-[#0D4775] text-white font-bold text-xs shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Trust & Reputation Metrics Bottom Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Trust & Reputation Metrics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="text-2xl font-extrabold text-slate-900">12</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Reports</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="text-2xl font-extrabold text-emerald-600">7</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Resolved Reports</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="text-2xl font-extrabold text-[#1769AA]">92%</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Avg. AI Confidence</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="text-2xl font-extrabold text-purple-600">Aug 2026</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Member Since</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;
