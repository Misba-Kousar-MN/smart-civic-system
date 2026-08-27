import React from 'react';

const STATUS_CONFIG = {
  OPEN: { label: 'Open', bg: 'bg-[#EAF7EF] text-[#237A52] border-[#D5EBDD]' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-[#FEF7EA] text-[#D49A32] border-[#FCE8C5]' },
  ESCALATED: { label: 'Escalated', bg: 'bg-[#FBEDEC] text-[#C95C5C] border-[#F5C6C6]' },
  RESOLVED: { label: 'Resolved', bg: 'bg-[#EAF7EF] text-[#2D8A5B] border-[#D5EBDD]' },
  CLOSED: { label: 'Closed', bg: 'bg-[#F1FAF4] text-[#648274] border-[#DDEBE2]' },
  REOPENED: { label: 'Reopened', bg: 'bg-[#F1FAF4] text-[#237A52] border-[#D5EBDD]' }
};

const StatusBadge = ({ status }) => {
  const normStatus = (status || 'OPEN').toUpperCase();
  const config = STATUS_CONFIG[normStatus] || { label: normStatus, bg: 'bg-[#EAF7EF] text-[#237A52] border-[#D5EBDD]' };
  
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-tight border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
