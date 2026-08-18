import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (['ward_officer', 'aee', 'commissioner', 'admin'].includes(user.role)) {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!fullName || !email || !password) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await register(email, password, fullName);
      if (res?.session) {
        setSuccessMsg('Account created and signed in! Redirecting...');
      } else {
        setSuccessMsg('Account created successfully! Please sign in.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* LEFT PANEL: Deep Navy Branding (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0D4775] via-[#0A395E] to-[#082F52] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1769AA] text-white flex items-center justify-center font-extrabold shadow-md border border-blue-400/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-wider">SMART CIVIC</div>
                <div className="text-[11px] text-blue-200/70 font-medium">Municipal Service Portal</div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Join your city's<br />civic portal.
              </h2>
              <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
                Create a citizen account to report issues, view live workorder progress, and earn community trust rewards.
              </p>
            </div>

            <div className="space-y-3 pt-4 text-xs font-semibold text-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Instant AI Image Classification</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span>Precise GPS Map Pinpoint</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Earn Citizen Reputation Trust Score</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] text-blue-300/60 font-medium border-t border-blue-800/40 relative z-10">
            Davanagere City Corporation • Citizen Registration
          </div>
        </div>

        {/* RIGHT PANEL: Registration Form (7 Cols) */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full space-y-6">
            
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
              <p className="text-xs text-slate-500 font-medium">
                Register to report and track civic issues in your ward.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Test Citizen"
                    className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA] focus:bg-white transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@davanagere.gov.in"
                    className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA] focus:bg-white transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA] focus:bg-white transition-all"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#1769AA] hover:bg-[#0D4775] text-white font-bold text-xs shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
              >
                <span>{loading ? 'Creating Account...' : 'Create Citizen Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 font-medium pt-2">
              <span>Already registered? </span>
              <Link to="/login" className="font-bold text-[#1769AA] hover:underline">
                Sign In Here
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
