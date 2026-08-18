import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const SlaTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [badgeClass, setBadgeClass] = useState('bg-emerald-50 text-emerald-700 border-emerald-200');

  useEffect(() => {
    if (!deadline) return;

    const calculateTime = () => {
      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsOverdue(true);
        setBadgeClass('bg-red-50 text-red-700 border-red-200');
        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(days > 0 ? `${days}d ${hours}h overdue` : `Overdue ${hours}h`);
      } else {
        setIsOverdue(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days === 0 && hours < 6) {
          setBadgeClass('bg-red-50 text-red-700 border-red-200');
        } else if (days < 2) {
          setBadgeClass('bg-amber-50 text-amber-700 border-amber-200');
        } else {
          setBadgeClass('bg-slate-50 text-slate-700 border-slate-200');
        }

        setTimeLeft(days > 0 ? `${days} days left` : `${hours}h left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return <span className="text-xs text-slate-400 font-mono">No SLA</span>;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeClass}`}>
      {isOverdue ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
      <span className="font-mono text-[11px]">{timeLeft}</span>
    </div>
  );
};

export default SlaTimer;
