import React from 'react';

const PRIORITY_STYLES = {
  CRITICAL: {
    bg: 'bg-[#F7DFDE]',
    text: 'text-[#A83F38]',
    border: 'border-[#EFC4C1]',
    label: 'Critical'
  },
  HIGH: {
    bg: 'bg-[#F9E8D2]',
    text: 'text-[#A66A22]',
    border: 'border-[#F2D1A8]',
    label: 'High'
  },
  MEDIUM: {
    bg: 'bg-[#F5EED4]',
    text: 'text-[#8A741F]',
    border: 'border-[#E6D9A5]',
    label: 'Medium'
  },
  LOW: {
    bg: 'bg-[#DCEFE4]',
    text: 'text-[#35775B]',
    border: 'border-[#C7E1D2]',
    label: 'Low'
  }
};

const PriorityBadge = ({ priority, score }) => {
  const config = PRIORITY_STYLES[priority] || PRIORITY_STYLES.LOW;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${config.bg} ${config.text} ${config.border} shadow-2xs`}>
      <span>{config.label}</span>
      {score !== undefined && score !== null && (
        <span className="text-[10px] font-mono opacity-80">({score})</span>
      )}
    </span>
  );
};

export default PriorityBadge;
