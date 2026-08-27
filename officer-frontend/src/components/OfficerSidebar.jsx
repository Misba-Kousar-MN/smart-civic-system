import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Map as MapIcon,
  Bell,
  TrendingUp,
  User,
  Shield,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OfficerSidebar = ({ onToggleMap, isMapActive }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/officer/login');
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[240px] bg-[#1F5443] text-[#E6F4ED] flex flex-col z-50 shadow-lg hidden md:flex border-r border-[#2B6D58] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#2B6D58] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#349670] flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-sm tracking-wider text-white flex items-center gap-1 leading-none">
            SMART CIVIC
          </div>
          <div className="text-[10px] text-[#C8EAD9] font-bold uppercase tracking-wider mt-1">
            Officer Portal
          </div>
        </div>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6 custom-scrollbar">
        {/* SECTION 1: OPERATIONS */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold text-[#94BFA9] uppercase tracking-widest">
            OPERATIONS
          </div>

          <div className="space-y-1">
            <NavLink
              to="/officer/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive && !isMapActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Command Center</span>
            </NavLink>

            <NavLink
              to="/officer/incidents"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`
              }
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Incident Queue</span>
            </NavLink>

            {onToggleMap && (
              <button
                type="button"
                onClick={onToggleMap}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isMapActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`}
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span>Spatial Map</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 2: MONITORING */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold text-[#94BFA9] uppercase tracking-widest">
            MONITORING
          </div>

          <div className="space-y-1">
            <NavLink
              to="/officer/notifications"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all justify-between ${
                  isActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </div>
              <span className="w-4.5 h-4.5 rounded-full bg-[#349670] text-[10px] font-extrabold flex items-center justify-center text-white">
                3
              </span>
            </NavLink>

            <NavLink
              to="/officer/dashboard?tab=ESCALATED"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`
              }
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Escalations</span>
            </NavLink>
          </div>
        </div>

        {/* SECTION 3: ACCOUNT */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold text-[#94BFA9] uppercase tracking-widest">
            ACCOUNT
          </div>

          <div className="space-y-1">
            <NavLink
              to="/officer/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#349670] text-white shadow-md shadow-emerald-950/40 border border-[#5EB894]/40'
                    : 'text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white'
                }`
              }
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Officer Profile</span>
            </NavLink>

            <button
              onClick={() => alert('Smart Civic Officer Helpline — 1800-425-9999\nTechnical Support 24/7 active.')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#C8EAD9] hover:bg-[#2B6D58]/60 hover:text-white transition-all text-left"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Help & Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer User Info & Logout */}
      <div className="p-3.5 border-t border-[#2B6D58] bg-[#184637]/80 m-2.5 rounded-2xl border border-[#2B6D58]/60">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#349670] border border-[#5EB894]/40 flex items-center justify-center font-extrabold text-xs text-white shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-xs text-white truncate">
              {user.full_name || user.email || 'Municipal Officer'}
            </div>
            <div className="text-[10px] text-[#C8EAD9] font-semibold capitalize truncate">
              {user.role ? user.role.replace('_', ' ') : 'Ward Officer'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default OfficerSidebar;
