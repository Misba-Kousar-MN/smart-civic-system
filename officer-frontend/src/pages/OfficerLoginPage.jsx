import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OfficerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/officer/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email || !password) {
      setError('Please enter both officer email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify officer credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F8F5] flex items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-5xl bg-[#E6F4ED] rounded-3xl shadow-xl border border-[#B8E0CB] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* LEFT PANEL: Soft Botanical Green Branding (5 Cols) */}
        <div className="lg:col-span-5 bg-[#1F5443] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-8 relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#349670] text-white flex items-center justify-center font-extrabold shadow-md border border-[#5EB894]/40">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-wider text-white">SMART CIVIC</div>
                <div className="text-[10px] text-[#C8EAD9] font-bold uppercase tracking-wider">Officer Portal</div>
              </div>
            </div>

            {/* Slogan */}
            <div className="space-y-3 pt-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight">
                Officer Command &<br />Dispatch Console
              </h2>
              <p className="text-xs text-[#C8EAD9] leading-relaxed font-medium">
                Manage citizen reported issues, monitor SLA deadlines, start workorders, and submit resolution evidence.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#E6F4ED]">
                <CheckCircle2 className="w-4 h-4 text-[#5EB894] shrink-0" />
                <span>Category-aware municipal department routing</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-[#E6F4ED]">
                <CheckCircle2 className="w-4 h-4 text-[#5EB894] shrink-0" />
                <span>3-Tier automatic SLA breach escalation</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-[#E6F4ED]">
                <CheckCircle2 className="w-4 h-4 text-[#5EB894] shrink-0" />
                <span>AI BEFORE/AFTER repair verification check</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#2B6D58] relative z-10 text-[11px] font-semibold text-[#C8EAD9]">
            Davangere Municipal Corporation • Officer Operations
          </div>
        </div>

        {/* RIGHT PANEL: Soft Pastel Mint Form (7 Cols) */}
        <div className="lg:col-span-7 bg-[#DCF0E6] p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#1F5443] tracking-tight">
                Officer Sign In
              </h1>
              <p className="text-xs font-semibold text-[#4A7365] mt-1">
                Enter your authorized municipal email & password to access your ward.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] text-xs font-bold text-[#A6473D]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#174437] uppercase tracking-wider block">
                  Officer Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#75998C] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@example.com"
                    className="w-full h-10 pl-10 pr-4 bg-[#E6F4ED] border border-[#B8E0CB] rounded-xl text-xs font-semibold text-[#174437] placeholder-[#75998C] focus:outline-none focus:border-[#349670]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#174437] uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#75998C] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-10 bg-[#E6F4ED] border border-[#B8E0CB] rounded-xl text-xs font-semibold text-[#174437] placeholder-[#75998C] focus:outline-none focus:border-[#349670]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#75998C] hover:text-[#174437]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs font-semibold text-[#4A7365]">New municipal officer? </span>
              <Link to="/officer/register" className="text-xs font-bold text-[#349670] hover:underline">
                Register Officer Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerLoginPage;
