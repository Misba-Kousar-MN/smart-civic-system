import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Award,
  Settings,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

const ProfilePage = () => {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone_number || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!fullName || !fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.updateMyProfile({
        full_name: fullName.trim(),
        phone_number: phone ? phone.trim() : null
      });

      if (response?.success) {
        await refreshProfile();
        setSaved(true);
        setEditMode(false);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (err) {
      console.error('[PROFILE] Update error:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-[540px] mx-auto pb-16 px-3 sm:px-6 pt-3 select-none space-y-4">
      
      {/* 1. Header Profile Card */}
      <div className="bg-white p-6 rounded-[16px] border border-[#DDEBE2] shadow-xs text-center relative space-y-3">
        <button
          onClick={() => setEditMode(!editMode)}
          className="absolute top-4 right-4 text-[#8AA095] hover:text-[#237A52] p-1 cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 rounded-full bg-[#237A52] text-white flex items-center justify-center font-bold text-3xl mx-auto shadow-xs">
          {user?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>

        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-[#163A2C]">
            {user?.full_name || 'Citizen User'}
          </h1>
          <div className="text-xs text-[#648274]">{user?.email || 'citizen@email.com'}</div>
          <div className="text-xs text-[#8AA095]">{user?.phone_number || '+91 98765 43210'}</div>
        </div>

        {user?.role === 'citizen' && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF7EF] border border-[#D5EBDD] text-[#237A52] text-xs font-semibold mt-1">
            <Award className="w-4 h-4 text-[#237A52]" />
            <span>{user?.trust_score || 100} pts · Trusted Citizen</span>
          </div>
        )}
      </div>

      {/* Edit Form if Toggle active */}
      {editMode && (
        <div className="bg-white p-5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
          <div className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
            Edit Personal Information
          </div>
          {saved && <div className="text-xs text-[#237A52] font-semibold">Profile updated!</div>}
          {error && <div className="text-xs text-[#C95C5C] font-semibold">{error}</div>}
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[#8AA095] uppercase block mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="civic-input text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8AA095] uppercase block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="civic-input text-xs"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-civic-primary w-full py-2.5 text-xs font-semibold rounded-xl">
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* 2. Menu Rows List */}
      <div className="bg-white rounded-[16px] border border-[#DDEBE2] shadow-xs overflow-hidden divide-y divide-[#DDEBE2]">
        <button
          onClick={() => setEditMode(!editMode)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <User className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">Personal Information</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </button>

        <Link
          to="/citizen/my-reports"
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">My Reports</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </Link>

        <Link
          to="/notifications"
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">Notifications</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </Link>

        <button
          onClick={() => alert('Saved Locations: Home, Work')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">Saved Locations</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </button>

        <button
          onClick={() => alert('Smart Civic Helpline: 1800-425-9999')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </button>

        <button
          onClick={() => alert('Smart Civic System v2.0 — Municipal Corporation')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBFDFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Info className="w-4.5 h-4.5 text-[#237A52]" />
            <span className="text-xs font-semibold text-[#163A2C]">About System</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA095]" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FBEDEC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4.5 h-4.5 text-[#C95C5C]" />
            <span className="text-xs font-semibold text-[#C95C5C]">Sign Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C95C5C]" />
        </button>
      </div>

    </div>
  );
};

export default ProfilePage;
