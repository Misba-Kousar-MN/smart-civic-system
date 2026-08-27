import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Award, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import CivicLogo from './CivicLogo';

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
    <header className="sticky top-0 z-40 h-15 bg-[#F7FBF8] border-b border-[#DDEBE2] px-4 md:px-6 flex items-center justify-between shadow-[0_2px_8px_rgba(35,122,82,0.03)] select-none">
      {/* Left Brand & Global Search */}
      <div className="flex items-center gap-5 flex-1 max-w-xl">
        {/* Mobile Brand Title */}
        <Link to="/" className="md:hidden flex items-center">
          <CivicLogo variant="compact" size="sm" showTagline={false} />
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center w-full max-w-md relative">
          <Search className="w-4 h-4 text-[#8AA095] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports, locations..."
            className="w-full h-9 pl-9.5 pr-14 bg-[#FBFDFC] border border-[#D8E8DE] rounded-xl text-xs font-normal text-[#163A2C] placeholder-[#8AA095] focus:outline-none focus:border-[#237A52] focus:bg-white transition-all"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#648274] bg-white border border-[#DDEBE2] rounded shadow-xs">
            Ctrl+K
          </kbd>
        </form>
      </div>

      {/* Right User Actions */}
      {user ? (
        <div className="flex items-center gap-2.5 md:gap-3">
          {/* Trust Points Badge */}
          {user.role === 'citizen' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF7EF] border border-[#D5EBDD] text-[#237A52] text-xs font-semibold shadow-xs">
              <Award className="w-3.5 h-3.5 text-[#237A52] shrink-0" />
              <span>{user.trust_score || 100} PTS</span>
            </div>
          )}

          {/* Notification Bell */}
          <NotificationDropdown />

          {/* User Profile Badge */}
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1 pr-3 rounded-full border border-[#DDEBE2] hover:border-[#237A52] bg-[#F1FAF4] hover:bg-[#EAF7EF] transition-all shadow-xs"
          >
            <div className="w-7 h-7 rounded-full bg-[#237A52] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden lg:block text-left pr-1">
              <div className="text-xs font-bold text-[#163A2C] leading-tight">
                {user.full_name || user.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-[10px] text-[#648274] font-medium">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-8.5 h-8.5 rounded-xl border border-[#DDEBE2] text-[#648274] hover:text-[#C95C5C] hover:bg-[#FBEDEC] hover:border-red-200 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 rounded-xl text-xs font-semibold text-[#237A52] hover:bg-[#EAF7EF]">
            Log In
          </Link>
          <Link to="/register" className="btn-civic-primary py-2 px-4 text-xs font-bold">
            Register
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
