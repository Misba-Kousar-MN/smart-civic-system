import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  MapPin,
  Mic,
  Brain
} from 'lucide-react';
import CivicLogo from '../components/CivicLogo';
import CivicLandscapeHero from '../components/CivicLandscapeHero';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7FBF8] flex flex-col justify-between select-none">
      
      {/* Main Screen Container */}
      <div className="max-w-[480px] sm:max-w-[540px] mx-auto w-full px-4 pt-6 pb-12 flex flex-col justify-between min-h-[90vh]">
        
        {/* Top Logo */}
        <div className="flex justify-center pt-2">
          <CivicLogo variant="full" size="md" showTagline={true} />
        </div>

        {/* Hero Section */}
        <div className="space-y-3 text-center my-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#163A2C] tracking-tight leading-tight">
            Better Cities<br />Start with You
          </h1>
          <p className="text-xs sm:text-sm text-[#648274] font-normal leading-relaxed max-w-sm mx-auto">
            Report civic issues. Track resolution in real-time.<br />Build a cleaner community together.
          </p>

          {/* Soft Green Landscape Hero Illustration */}
          <div className="pt-2">
            <CivicLandscapeHero className="w-full max-w-xs mx-auto h-auto rounded-2xl border border-[#DDEBE2]" />
          </div>
        </div>

        {/* Bottom Actions Area */}
        <div className="space-y-3.5">
          {user ? (
            <Link
              to={['ward_officer', 'aee', 'commissioner', 'admin'].includes(user.role) ? '/officer/dashboard' : '/citizen/dashboard'}
              className="btn-civic-primary w-full py-3.5 text-sm font-semibold rounded-xl"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-civic-primary w-full py-3.5 text-sm font-semibold rounded-xl">
                Login
              </Link>

              <Link to="/register" className="btn-civic-secondary w-full py-3.5 text-sm font-semibold rounded-xl">
                Register
              </Link>

              {/* Continue with Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DDEBE2]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-[#F7FBF8] px-3 text-[#8AA095]">Continue with</span>
                </div>
              </div>

              {/* Social Login Pills */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('Social authentication redirecting...')}
                  className="py-2.5 px-4 bg-white border border-[#DDEBE2] hover:border-[#237A52] rounded-xl text-xs font-semibold text-[#163A2C] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Apple ID authentication redirecting...')}
                  className="py-2.5 px-4 bg-white border border-[#DDEBE2] hover:border-[#237A52] rounded-xl text-xs font-semibold text-[#163A2C] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.17-.56 2.83-1.37z" />
                  </svg>
                  <span>Apple</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Bottom Soft Mint Feature Section */}
      <div className="bg-[#EAF7EF] border-t border-[#D5EBDD] py-6 px-4">
        <div className="max-w-[1080px] mx-auto space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold text-[#237A52] uppercase tracking-wider">
              Powerful Features for a Better City
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-[#648274]">
            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center gap-2.5 shadow-xs">
              <Brain className="w-4 h-4 text-[#237A52] shrink-0" />
              <div>
                <div className="font-bold text-[#163A2C] text-[11px]">Visual Detection</div>
                <div className="text-[10px] text-[#8AA095]">Instant issue recognition</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center gap-2.5 shadow-xs">
              <Zap className="w-4 h-4 text-[#237A52] shrink-0" />
              <div>
                <div className="font-bold text-[#163A2C] text-[11px]">Live Status</div>
                <div className="text-[10px] text-[#8AA095]">Real-time officer updates</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center gap-2.5 shadow-xs">
              <Mic className="w-4 h-4 text-[#237A52] shrink-0" />
              <div>
                <div className="font-bold text-[#163A2C] text-[11px]">Voice Notes</div>
                <div className="text-[10px] text-[#8AA095]">Hands-free audio details</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center gap-2.5 shadow-xs">
              <MapPin className="w-4 h-4 text-[#237A52] shrink-0" />
              <div>
                <div className="font-bold text-[#163A2C] text-[11px]">Smart Routing</div>
                <div className="text-[10px] text-[#8AA095]">Routed to ward officers</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#D5EBDD] text-center text-xs font-semibold text-[#237A52] shadow-xs">
            Together, let's build a smarter & cleaner city! 🍃
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
