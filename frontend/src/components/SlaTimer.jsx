import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

const SlaTimer = ({ deadline, status }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [slaState, setSlaState] = useState('ON_TRACK');

  useEffect(() => {
    if (!deadline) return;

    const calculateTime = () => {
      if (status === 'RESOLVED' || status === 'CLOSED') {
        setSlaState('COMPLETED');
        setTimeLeft('Fulfilled');
        return;
      }

      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setSlaState('BREACHED');
        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(days > 0 ? `${days}d ${hours}h overdue` : hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours < 4) {
          setSlaState('AT_RISK');
        } else {
          setSlaState('ON_TRACK');
        }

        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setTimeLeft(days > 0 ? `${days}d ${remHours}h left` : `${hours}h ${mins}m left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 10000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (!deadline) return <span className="text-xs text-slate-400 font-mono">No SLA</span>;

  if (slaState === 'COMPLETED') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>SLA Met</span>
      </span>
    );
  }

  if (slaState === 'BREACHED' || status === 'SLA_BREACHED' || status === 'ESCALATED') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 shadow-2xs">
        <ShieldAlert className="w-3.5 h-3.5 text-purple-700 shrink-0" />
        <span>BREACHED ({timeLeft})</span>
      </span>
    );
  }

  if (slaState === 'AT_RISK') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>AT RISK ({timeLeft})</span>
      </span>
    );
  }

  return (
    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span>ON TRACK ({timeLeft})</span>
    </span>
  );
};

export default SlaTimer;
