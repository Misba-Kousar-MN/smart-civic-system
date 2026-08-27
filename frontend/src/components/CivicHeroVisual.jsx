import React from 'react';
import { MapPin, Sparkles, CheckCircle2, Mic, Activity, Shield } from 'lucide-react';

/**
 * Hero Right Side Visual Composition
 * Minimal clean UI composition with city skyline, trees, location pins, report cards, AI badge.
 * STRICT RULE: NO LOGIN FORM HERE. NO HUMANS.
 */
const CivicHeroVisual = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Background Soft Glow */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#E8F2EA] rounded-full blur-3xl opacity-80 pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative bg-white rounded-[24px] border border-[#E3EBE5] shadow-[0_8px_30px_rgba(23,77,56,0.08)] p-6 space-y-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EBE5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F2EA] border border-[#A8C9B1]/60 text-[#236A48] flex items-center justify-center font-bold">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#174D38]">Smart Civic System</div>
              <div className="text-[10px] text-[#60736A] font-medium">Municipal Service Command</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#E8F2EA] text-[#236A48] text-[10px] font-bold border border-[#A8C9B1]/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#236A48]" />
            <span>AI Active</span>
          </span>
        </div>

        {/* Floating Sample Report Card */}
        <div className="bg-[#F4F8F4] p-4 rounded-[18px] border border-[#E3EBE5] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#60736A]">Reported Civic Issue</span>
            <span className="text-[10px] font-extrabold text-[#236A48] bg-[#E8F2EA] px-2 py-0.5 rounded-md border border-[#A8C9B1]/50">
              OPEN
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E8F2EA] border border-[#A8C9B1]/60 flex items-center justify-center text-[#236A48] shrink-0 font-bold text-xs">
              CIVIC
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-[#17352A] truncate">
                Pothole on Main Street
              </div>
              <div className="text-[11px] text-[#60736A] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#236A48] shrink-0" />
                <span className="truncate">Civic Center Zone 4</span>
              </div>
            </div>
          </div>

          {/* AI Workflow Badge */}
          <div className="pt-2 border-t border-[#E3EBE5] flex items-center justify-between text-[11px]">
            <span className="text-[#60736A] font-normal flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#236A48]" /> YOLO26 Vision & Gemini
            </span>
            <span className="font-bold text-[#174D38]">98% Confidence</span>
          </div>
        </div>

        {/* 3 Interactive Civic Feature Tiles */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-white rounded-xl border border-[#E3EBE5] flex flex-col items-center text-center space-y-1">
            <Sparkles className="w-4 h-4 text-[#236A48]" />
            <div className="text-[10px] font-bold text-[#174D38]">AI Vision</div>
            <div className="text-[9px] text-[#60736A]">Auto Detection</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#E3EBE5] flex flex-col items-center text-center space-y-1">
            <Mic className="w-4 h-4 text-[#236A48]" />
            <div className="text-[10px] font-bold text-[#174D38]">Voice Notes</div>
            <div className="text-[9px] text-[#60736A]">Whisper STT</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#E3EBE5] flex flex-col items-center text-center space-y-1">
            <Activity className="w-4 h-4 text-[#236A48]" />
            <div className="text-[10px] font-bold text-[#174D38]">Live SLA</div>
            <div className="text-[9px] text-[#60736A]">Auto Routing</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CivicHeroVisual;
