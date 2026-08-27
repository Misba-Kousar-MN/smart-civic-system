import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import client from '../api/client';

const OfficerRegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [officerRole, setOfficerRole] = useState('ward_officer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/officer/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!fullName || !email || !password) {
      setError('All officer registration fields are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      // 1. Sign up user in Supabase Auth
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (signUpErr) throw signUpErr;

      if (data?.user && data?.session) {
        try {
          await client.post('/profile/provision-officer', { role: officerRole });
        } catch (provErr) {
          console.warn('[OFFICER PROVISIONING] Warning:', provErr);
        }

        if (data.session) {
          setSuccessMsg('Officer account provisioned successfully! Redirecting to command center...');
          setTimeout(() => {
            navigate('/officer/dashboard', { replace: true });
          }, 1200);
        } else {
          setSuccessMsg('Officer account registered successfully! Please sign in.');
          setTimeout(() => {
            navigate('/officer/login', { replace: true });
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to register officer account. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* LEFT PANEL: Deep Navy Branding (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0A192F] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B63E5] text-white flex items-center justify-center font-extrabold shadow-lg shadow-blue-900/40 border border-blue-400/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-wider text-white">SMART CIVIC</div>
                <div className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider">Officer Registration (Port 5174)</div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight">
                Provision Officer<br />Credentials
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Register an official municipal officer account for field workorder dispatch and SLA resolution.
              </p>
            </div>

            <div className="space-y-3 pt-4 text-xs font-semibold text-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>Level 1, Level 2 (AEE), or Level 3 Tier Selection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Real-Time Citizen Issue Pipeline Access</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Direct Supabase Auth & Audit Log Persistence</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] text-slate-400 font-medium border-t border-slate-800 relative z-10">
            Davanagere City Corporation • Municipal Operations
          </div>
        </div>

        {/* RIGHT PANEL: Officer Registration Form (7 Cols) */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white space-y-5">
          <div className="space-y-1">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#0B63E5] text-[10px] font-extrabold uppercase border border-blue-200 mb-1">
              OFFICER PROVISIONING
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Officer Account
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Register your official municipal officer credentials.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer Rajesh Kumar"
                  className="w-full h-10.5 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B63E5]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@davangere.gov.in"
                  className="w-full h-10.5 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B63E5]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Role Tier</label>
              <select
                value={officerRole}
                onChange={(e) => setOfficerRole(e.target.value)}
                className="w-full h-10.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B63E5]"
              >
                <option value="ward_officer">Level 1 — Ward Officer (Field Workorders)</option>
                <option value="aee">Level 2 — Assistant Executive Engineer (AEE)</option>
                <option value="commissioner">Level 3 — Municipal Commissioner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10.5 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B63E5]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#0B63E5] hover:bg-[#0046B8] text-white font-extrabold text-xs shadow-md shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                <span>{loading ? 'Creating Officer Account...' : 'Register Officer Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="text-center text-xs text-slate-500 font-medium">
            Already registered?{' '}
            <Link to="/officer/login" className="font-extrabold text-[#0B63E5] hover:underline">
              Officer Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OfficerRegisterPage;
