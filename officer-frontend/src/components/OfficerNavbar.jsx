import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, User, Shield, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleLevelSelector from './RoleLevelSelector';

const ROLE_LABELS = {
  ward_officer: 'Ward Officer • Level 1',
  aee: 'AEE • Level 2',
  commissioner: 'Commissioner • Level 3',
  admin: 'System Admin'
};

const OfficerNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/officer/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/officer/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#E6F4ED] border-b border-[#B8E0CB] px-4 md:px-8 flex items-center justify-between select-none shadow-xs">
      {/* Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <Link to="/officer/dashboard" className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#349670] text-white flex items-center justify-center font-extrabold shadow-sm">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-[#174437] tracking-tight leading-none">
              SMART CIVIC
            </div>
            <div className="text-[9px] font-bold text-[#4A7365] tracking-wider uppercase mt-0.5">
              OFFICER PORTAL
            </div>
          </div>
        </Link>

        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center w-full max-w-md relative">
          <Search className="w-4 h-4 text-[#75998C] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, locations, report IDs..."
            className="w-full h-9 pl-9.5 pr-4 bg-[#DCF0E6] border border-[#B8E0CB] rounded-xl text-xs font-medium text-[#174437] placeholder-[#75998C] focus:outline-none focus:border-[#349670] focus:bg-white transition-all"
          />
        </form>
      </div>

      {/* Center/Right Status, Role/Level Selector & Controls */}
      {user ? (
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* System Online Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D5EFE1] border border-[#B8E0CB] text-[#216D51] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#349670] animate-pulse" />
            <span>System Operational</span>
          </div>

          {/* Notifications Icon */}
          <Link
            to="/officer/notifications"
            className="relative p-2 rounded-xl text-[#4A7365] hover:text-[#174437] hover:bg-[#DCF0E6] transition-all"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#349670] ring-2 ring-[#E6F4ED]" />
          </Link>

          {/* Compact Modern Role/Level View Selector */}
          <RoleLevelSelector />

          {/* Compact Profile Avatar Button */}
          <Link
            to="/officer/profile"
            className="w-9 h-9 rounded-xl border border-[#B8E0CB] bg-[#DCF0E6] hover:bg-[#CEEADA] flex items-center justify-center font-black text-xs text-[#1F5443] transition-all shadow-2xs"
            title={`Logged in as ${user.full_name || 'Officer'} (${user.role})`}
          >
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-[#349670]" />}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl border border-[#B8E0CB] text-[#4A7365] hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <Link to="/officer/login" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#349670] hover:bg-[#2B8260] shadow-xs">
          Sign In
        </Link>
      )}
    </header>
  );
};

export default OfficerNavbar;
