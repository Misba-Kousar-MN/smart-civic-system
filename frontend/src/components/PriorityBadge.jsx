import React from 'react';

const PRIORITY_CONFIG = {
  CRITICAL: { label: 'CRITICAL', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  HIGH: { label: 'HIGH', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
  MEDIUM: { label: 'MEDIUM', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  LOW: { label: 'LOW', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
};

const PriorityBadge = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority] || { label: priority, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default PriorityBadge;
