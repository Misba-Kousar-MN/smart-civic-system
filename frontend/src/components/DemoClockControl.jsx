import React from 'react';
import { Play, Pause, FastForward, RotateCcw, Clock, Zap } from 'lucide-react';
import { useDemoClock } from '../context/DemoClockContext';

const DemoClockControl = () => {
  const {
    isDemoClockActive,
    timeScale,
    simulatedMinutesPerRealSecond,
    effectiveIso,
    offsetMinutes,
    toggleDemoClock,
    advanceDemoClock,
    resetDemoClock
  } = useDemoClock();

  const formattedSimTime = new Date(effectiveIso).toLocaleTimeString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="bg-[#FFF8E7] border border-[#F3DE9A] rounded-2xl p-3 px-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      {/* Left: Clock Status & Real-world Guarantee */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isDemoClockActive ? 'bg-[#9C621E] animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-black text-[#8C5E14] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#9C621E]" />
            Accelerated Demo Clock:
          </span>
          <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
            isDemoClockActive
              ? 'bg-[#9C621E] text-white'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {isDemoClockActive ? `ACTIVE (${simulatedMinutesPerRealSecond || 5}m / sec)` : 'REAL-TIME'}
          </span>
        </div>

        {isDemoClockActive && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#8C5E14] bg-white/70 px-2.5 py-1 rounded-lg border border-[#F3DE9A]">
            <Clock className="w-3.5 h-3.5 text-[#9C621E]" />
            <span>Simulated: {formattedSimTime}</span>
            {offsetMinutes > 0 && (
              <span className="text-[10px] font-normal text-[#9C621E]">(+{offsetMinutes}m forward)</span>
            )}
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-end">
        <button
          type="button"
          onClick={() => toggleDemoClock()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-2xs cursor-pointer ${
            isDemoClockActive
              ? 'bg-[#A6473D] hover:bg-[#8A3B32] text-white'
              : 'bg-[#9C621E] hover:bg-[#7D4D16] text-white'
          }`}
          title={isDemoClockActive ? 'Pause accelerated simulation' : 'Start accelerated simulation (5 mins / sec)'}
        >
          {isDemoClockActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isDemoClockActive ? 'Pause Sim' : 'Start 5m/s Sim'}</span>
        </button>

        <button
          type="button"
          onClick={() => advanceDemoClock(60)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FDF3D6] text-[#8C5E14] border border-[#F3DE9A] font-bold text-xs transition-all shadow-2xs cursor-pointer"
          title="Jump simulated time ahead by 1 hour"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+1h</span>
        </button>

        <button
          type="button"
          onClick={() => advanceDemoClock(720)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FDF3D6] text-[#8C5E14] border border-[#F3DE9A] font-bold text-xs transition-all shadow-2xs cursor-pointer"
          title="Jump simulated time ahead by 12 hours"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+12h</span>
        </button>

        <button
          type="button"
          onClick={() => advanceDemoClock(1440)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FDF3D6] text-[#8C5E14] border border-[#F3DE9A] font-bold text-xs transition-all shadow-2xs cursor-pointer"
          title="Jump simulated time ahead by 24 hours"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+24h</span>
        </button>

        <button
          type="button"
          onClick={() => resetDemoClock()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#475569] border border-slate-300 font-bold text-xs transition-all shadow-2xs cursor-pointer"
          title="Reset back to standard real-time clock"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default DemoClockControl;
