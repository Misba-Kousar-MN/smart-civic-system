import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CivicLogo from '../components/CivicLogo';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!fullName || !email || !password) {
      setError('Full name, email, and password are required.');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms & Conditions to proceed.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await register(email, password, fullName, 'citizen', { mobile: mobileNumber });

      if (res?.session) {
        setSuccessMsg('Account created successfully! Redirecting...');
      } else {
        setSuccessMsg('Account created! Please login with your credentials.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7FBF8] flex items-center justify-center p-4 select-none">
      
      {/* Clean Card Container */}
      <div className="w-full max-w-[440px] bg-white rounded-[16px] shadow-[0_4px_20px_rgba(18,61,44,0.05)] border border-[#DDEBE2] p-6 sm:p-8 space-y-5">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="w-8 h-8 rounded-full bg-[#EAF7EF] border border-[#D5EBDD] text-[#237A52] flex items-center justify-center hover:bg-[#E5F3EA] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CivicLogo variant="symbol" size="sm" />
          <div className="w-8" />
        </div>

        {/* Title Block */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[#163A2C] tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-[#648274]">
            Join us in making our city better
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FBEDEC] text-[#C95C5C] border border-[#F5C6C6] rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD] rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="civic-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider block mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter your mobile number"
              className="civic-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="civic-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider block mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="civic-input text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#8AA095] hover:text-[#237A52]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 rounded text-[#237A52] focus:ring-[#237A52]"
            />
            <label htmlFor="terms" className="text-[11px] text-[#648274]">
              I agree to the <span className="font-bold text-[#237A52]">Terms & Conditions</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-civic-primary w-full py-3 text-xs font-semibold rounded-xl mt-2"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="text-center pt-1 text-xs text-[#648274]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#237A52] hover:underline">
            Login
          </Link>
        </div>

      </div>

    </div>
  );
};

export default RegisterPage;
