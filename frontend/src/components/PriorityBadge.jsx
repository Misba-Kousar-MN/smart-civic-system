import React from 'react';

const PRIORITY_CONFIG = {
  CRITICAL: { label: 'CRITICAL PRIORITY', bg: 'bg-[#C95757]/12 text-[#C95757] border-[#C95757]/30' },
  HIGH: { label: 'HIGH PRIORITY', bg: 'bg-orange-100 text-orange-800 border-orange-200' },
  MEDIUM: { label: 'MEDIUM PRIORITY', bg: 'bg-[#198754]/12 text-[#198754] border-[#198754]/30' },
  LOW: { label: 'LOW PRIORITY', bg: 'bg-[#3C9A70]/12 text-[#3C9A70] border-[#3C9A70]/30' }
};

const PriorityBadge = ({ priority }) => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();
  const config = PRIORITY_CONFIG[normPriority] || { label: `${normPriority} PRIORITY`, bg: 'bg-[#198754]/12 text-[#198754] border-[#198754]/30' };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider border shadow-2xs ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default PriorityBadge;
