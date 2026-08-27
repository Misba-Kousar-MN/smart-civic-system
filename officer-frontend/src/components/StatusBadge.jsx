import React from 'react';

const STATUS_STYLES = {
  OPEN: {
    bg: 'bg-[#DCEFE4]',
    text: 'text-[#277553]',
    border: 'border-[#C7E1D2]',
    dot: 'bg-[#277553]',
    label: 'Open'
  },
  IN_PROGRESS: {
    bg: 'bg-[#E4EEF8]',
    text: 'text-[#3974A5]',
    border: 'border-[#B8D4EA]',
    dot: 'bg-[#3974A5]',
    label: 'In Progress'
  },
  ESCALATED: {
    bg: 'bg-[#F0E4F4]',
    text: 'text-[#7A4F8C]',
    border: 'border-[#DCBFEC]',
    dot: 'bg-[#7A4F8C]',
    label: 'Escalated'
  },
  SLA_BREACHED: {
    bg: 'bg-[#FBE8E5]',
    text: 'text-[#A94E43]',
    border: 'border-[#F3C5BF]',
    dot: 'bg-[#A94E43]',
    label: 'SLA Breached'
  },
  PAUSED: {
    bg: 'bg-[#F5EED4]',
    text: 'text-[#8A741F]',
    border: 'border-[#E6D9A5]',
    dot: 'bg-[#8A741F]',
    label: 'Paused'
  },
  RESOLVED: {
    bg: 'bg-[#D8EFE1]',
    text: 'text-[#287653]',
    border: 'border-[#B5E2C9]',
    dot: 'bg-[#287653]',
    label: 'Resolved'
  },
  REOPENED: {
    bg: 'bg-[#FBE8E5]',
    text: 'text-[#A94E43]',
    border: 'border-[#F3C5BF]',
    dot: 'bg-[#A94E43]',
    label: 'Reopened'
  },
  CLOSED: {
    bg: 'bg-[#E5F3EA]',
    text: 'text-[#557269]',
    border: 'border-[#C7E1D2]',
    dot: 'bg-[#557269]',
    label: 'Closed'
  }
};

const StatusBadge = ({ status }) => {
  const config = STATUS_STYLES[status] || STATUS_STYLES.OPEN;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${config.bg} ${config.text} ${config.border} shadow-2xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
