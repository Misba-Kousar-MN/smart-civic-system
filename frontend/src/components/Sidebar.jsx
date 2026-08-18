import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Search,
  Bell,
  User,
  Shield,
  HelpCircle,
  Settings,
  LogOut,
  Award,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isOfficer = ['ward_officer', 'aee', 'commissioner'].includes(user.role);
  const isAdmin = user.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[240px] bg-gradient-to-b from-[#0D4775] via-[#0A395E] to-[#082F52] text-white flex flex-col z-50 shadow-xl hidden md:flex border-r border-blue-900/40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-blue-800/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1769AA] flex items-center justify-center text-white shadow-md shadow-blue-500/20 border border-blue-400/30">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-sm tracking-wider text-white flex items-center gap-1">
            SMART CIVIC
          </div>
          <div className="text-[11px] text-blue-200/70 font-medium">
            Municipal Service Portal
          </div>
        </div>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 custom-scrollbar">
        {/* MAIN Group */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-blue-300/60 uppercase tracking-widest">
            MAIN
          </div>

          <div className="space-y-1">
            {!isOfficer && !isAdmin && (
              <>
                <NavLink
                  to="/citizen/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/citizen/submit-report"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Submit Report</span>
                </NavLink>

                <NavLink
                  to="/citizen/my-reports"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>My Submissions</span>
                </NavLink>

                <NavLink
                  to="/citizen/my-reports?tab=track"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Track Report</span>
                </NavLink>
              </>
            )}

            {(isOfficer || isAdmin) && (
              <>
                <NavLink
                  to="/officer/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Officer Dashboard</span>
                </NavLink>

                <NavLink
                  to="/officer/incidents"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                        : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Incident Command</span>
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                      : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </NavLink>
            )}

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all justify-between ${
                  isActive
                    ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                    : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </div>
              <span className="w-4 h-4 rounded-full bg-blue-500 text-[10px] font-extrabold flex items-center justify-center text-white">
                3
              </span>
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1769AA] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                    : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <User className="w-4 h-4 shrink-0" />
              <span>My Profile</span>
            </NavLink>
          </div>
        </div>

        {/* OTHER Group */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-blue-300/60 uppercase tracking-widest">
            OTHER
          </div>

          <div className="space-y-1">
            <button
              onClick={() => alert('Smart Civic Support Portal — 24/7 Helpline: 1800-425-9999')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-100/75 hover:bg-white/10 hover:text-white transition-all text-left"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Help & Support</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-100/75 hover:bg-white/10 hover:text-white transition-all text-left"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-300/80 hover:bg-red-500/20 hover:text-red-200 transition-all text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="p-3 border-t border-blue-800/40 bg-black/20 m-2 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1769AA] border border-blue-300/40 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-xs text-white truncate">
              {user.full_name || user.email || 'Test Citizen'}
            </div>
            <div className="text-[11px] text-blue-300/70 capitalize truncate">
              {user.role === 'citizen' ? 'Citizen' : user.role?.replace('_', ' ')}
            </div>
          </div>
        </div>

        {user.role === 'citizen' && (
          <div className="bg-blue-950/60 rounded-xl p-2.5 border border-blue-400/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px] font-bold text-blue-100">
                {user.trust_score || 100} PTS
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Excellent
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
