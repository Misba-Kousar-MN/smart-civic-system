import React from 'react';

const STATUS_CONFIG = {
  OPEN: { label: 'OPEN', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'IN PROGRESS', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ESCALATED: { label: 'ESCALATED', bg: 'bg-red-50 text-red-700 border-red-200' },
  RESOLVED: { label: 'RESOLVED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'CLOSED', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  REOPENED: { label: 'REOPENED', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider border shadow-2xs ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
