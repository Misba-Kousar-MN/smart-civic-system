import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CivicLogo from '../components/CivicLogo';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user } = useAuth();
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!identifier || !password) {
      setError('Please enter both email/mobile and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7FBF8] flex items-center justify-center p-4 select-none">
      
      {/* Clean Card Container */}
      <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-[0_4px_20px_rgba(18,61,44,0.05)] border border-[#DDEBE2] p-6 sm:p-8 space-y-6">
        
        {/* Top Back Navigation & Logo Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="w-8 h-8 rounded-full bg-[#EAF7EF] border border-[#D5EBDD] text-[#237A52] flex items-center justify-center hover:bg-[#E5F3EA] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CivicLogo variant="symbol" size="sm" />
          <div className="w-8" />
        </div>

        {/* Title Block */}
        <div className="text-center space-y-1 pt-1">
          <h1 className="text-2xl font-bold text-[#163A2C] tracking-tight">
            Welcome Back!
          </h1>
          <p className="text-xs text-[#648274]">
            Login to continue reporting civic issues
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FBEDEC] text-[#C95C5C] border border-[#F5C6C6] rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider block mb-1">
              Email or Mobile Number
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or mobile number"
              className="civic-input text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#237A52] uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link will be sent to your registered email.')}
                className="text-[11px] font-semibold text-[#237A52] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={loading}
            className="btn-civic-primary w-full py-3 text-xs font-semibold rounded-xl mt-2"
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <div className="text-center pt-1 text-xs text-[#648274]">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-[#237A52] hover:underline">
            Register
          </Link>
        </div>

      </div>

    </div>
  );
};

export default LoginPage;
