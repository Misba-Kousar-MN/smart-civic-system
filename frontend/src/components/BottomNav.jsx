import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Plus, Search, User, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isOfficer = ['ward_officer', 'aee', 'commissioner', 'admin'].includes(user.role);

  if (isOfficer) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F7FBF8] border-t border-[#DDEBE2] shadow-[0_-2px_10px_rgba(35,122,82,0.05)] px-2 py-1.5 select-none">
        <div className="flex items-center justify-around">
          <NavLink
            to="/officer/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </NavLink>

          <NavLink
            to="/officer/incidents"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
              }`
            }
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Incidents</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
              }`
            }
          >
            <Search className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Analytics</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
              }`
            }
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Profile</span>
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F7FBF8] border-t border-[#DDEBE2] shadow-[0_-2px_12px_rgba(35,122,82,0.08)] px-2 py-1 select-none">
      <div className="flex items-center justify-around relative">
        {/* 1. Home */}
        <NavLink
          to="/citizen/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* 2. Reports */}
        <NavLink
          to="/citizen/my-reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive && !location.search.includes('tab=track') ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
            }`
          }
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Reports</span>
        </NavLink>

        {/* 3. Central FAB Plus Button */}
        <NavLink
          to="/citizen/submit-report"
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-[#237A52] text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 border-2 border-white hover:bg-[#185C3E] transition-transform active:scale-95">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
        </NavLink>

        {/* 4. Track */}
        <NavLink
          to="/citizen/my-reports?tab=track"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              location.search.includes('tab=track') ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
            }`
          }
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Track</span>
        </NavLink>

        {/* 5. Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-[#237A52] font-bold' : 'text-[#8AA095] font-medium hover:text-[#163A2C]'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
