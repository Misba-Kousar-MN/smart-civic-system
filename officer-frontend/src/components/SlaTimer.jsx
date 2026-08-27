import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

const SlaTimer = ({ deadline, status }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [urgency, setUrgency] = useState('NORMAL'); // NORMAL, AT_RISK, BREACHED

  useEffect(() => {
    if (!deadline || status === 'RESOLVED' || status === 'CLOSED') {
      setTimeRemaining('Resolved');
      setUrgency('RESOLVED');
      return;
    }

    const calculateTime = () => {
      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        const overdueMs = Math.abs(diff);
        const hours = Math.floor(overdueMs / (1000 * 60 * 60));
        const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${mins}m overdue`);
        setUrgency('BREACHED');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h remaining`);
        } else {
          setTimeRemaining(`${hours}h ${mins}m remaining`);
        }

        if (diff < 4 * 60 * 60 * 1000) {
          setUrgency('AT_RISK');
        } else {
          setUrgency('NORMAL');
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === 'RESOLVED' || status === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#D8EFE1] text-[#287653] border border-[#B5E2C9]">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Resolved</span>
      </span>
    );
  }

  if (urgency === 'BREACHED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#F7DFDE] text-[#A83F38] border border-[#EFC4C1]">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>BREACHED • {timeRemaining}</span>
      </span>
    );
  }

  if (urgency === 'AT_RISK') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#F9E8D2] text-[#A66A22] border border-[#F2D1A8]">
        <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
        <span>AT RISK • {timeRemaining}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#D8EFE1] text-[#287653] border border-[#B5E2C9]">
      <Clock className="w-3.5 h-3.5" />
      <span>ON TRACK • {timeRemaining}</span>
    </span>
  );
};

export default SlaTimer;
