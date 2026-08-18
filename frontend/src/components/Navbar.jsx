import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Award, LogOut, User, Shield, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const ROLE_LABELS = {
  citizen: 'Citizen',
  ward_officer: 'Level 1 Ward Officer',
  aee: 'Level 2 AEE Officer',
  commissioner: 'Level 3 Commissioner',
  admin: 'System Admin'
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/citizen/my-reports?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-xs select-none">
      {/* Left Mobile Brand / Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <Link to="/" className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1769AA] text-white flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-[#0D4775]">SMART CIVIC</span>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center w-full max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports, locations..."
            className="w-full h-10 pl-9 pr-14 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA] focus:bg-white transition-all"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            Ctrl+K
          </kbd>
        </form>
      </div>

      {/* Right User Actions */}
      {user ? (
        <div className="flex items-center gap-3 md:gap-4">
          {/* Trust Score Badge */}
          {user.role === 'citizen' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-bold shadow-2xs">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{user.trust_score || 100} PTS</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 uppercase">
                Excellent
              </span>
            </div>
          )}

          {/* Notification Bell */}
          <NotificationDropdown />

          {/* User Profile Badge */}
          <Link to="/profile" className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 transition-all">
            <div className="w-8 h-8 rounded-full bg-[#1769AA] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden lg:block text-left pr-1">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user.full_name || user.email?.split('@')[0] || 'Test Citizen'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Log In
          </Link>
          <Link to="/register" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1769AA] hover:bg-[#0D4775]">
            Register
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
