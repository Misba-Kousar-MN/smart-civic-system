import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import CivicLogo from './CivicLogo';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Bell,
  User,
  Shield,
  HelpCircle,
  Settings,
  LogOut,
  AlertTriangle,
  BarChart2
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
    <aside className="fixed top-0 left-0 bottom-0 w-[230px] bg-[#F7FBF8] text-[#163A2C] flex flex-col z-50 shadow-[0_2px_10px_rgba(35,122,82,0.04)] hidden md:flex border-r border-[#DDEBE2] select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#DDEBE2] flex items-center justify-center bg-[#F7FBF8]">
        <CivicLogo variant="compact" size="md" showTagline={false} />
      </div>

      {/* Nav Items Scroll Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold text-[#648274] uppercase tracking-wider">
            MAIN NAVIGATION
          </div>

          <div className="space-y-1">
            {!isOfficer && !isAdmin && (
              <>
                <NavLink
                  to="/citizen/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/citizen/submit-report"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <PlusCircle className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>Report Issue</span>
                </NavLink>

                <NavLink
                  to="/citizen/my-reports"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>My Reports</span>
                </NavLink>
              </>
            )}

            {(isOfficer || isAdmin) && (
              <>
                <NavLink
                  to="/officer/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>Officer Command</span>
                </NavLink>

                <NavLink
                  to="/officer/incidents"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <AlertTriangle className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>Incident Feed</span>
                </NavLink>

                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                        : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                    }`
                  }
                >
                  <BarChart2 className="w-4 h-4 text-[#237A52] shrink-0" />
                  <span>Analytics & Heatmap</span>
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                      : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                  }`
                }
              >
                <Shield className="w-4 h-4 text-[#237A52] shrink-0" />
                <span>Admin Console</span>
              </NavLink>
            )}

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all justify-between ${
                  isActive
                    ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                    : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#237A52] shrink-0" />
                <span>Notifications</span>
              </div>
              <span className="w-4 h-4 rounded-full bg-[#237A52] text-[10px] font-extrabold flex items-center justify-center text-white">
                3
              </span>
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] shadow-xs'
                    : 'text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C]'
                }`
              }
            >
              <User className="w-4 h-4 text-[#237A52] shrink-0" />
              <span>Profile</span>
            </NavLink>
          </div>
        </div>

        {/* SYSTEM Group */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold text-[#648274] uppercase tracking-wider">
            SYSTEM & SUPPORT
          </div>

          <div className="space-y-1">
            <button
              onClick={() => alert('Smart Civic Support Helpline: 1800-425-9999')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C] transition-all text-left cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#237A52] shrink-0" />
              <span>Help & Support</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#648274] hover:bg-[#F1FAF4] hover:text-[#163A2C] transition-all text-left cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#237A52] shrink-0" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#C95C5C] hover:bg-[#FBEDEC] transition-all text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Soft Mint Standing Card */}
      <div className="p-3 bg-[#EAF7EF] border border-[#D5EBDD] m-3 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#237A52] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-xs text-[#163A2C] truncate">
              {user.full_name || user.email || 'Smart Civic User'}
            </div>
            <div className="text-[10px] text-[#648274] font-medium capitalize truncate">
              {user.role === 'citizen' ? 'Citizen Account' : user.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
