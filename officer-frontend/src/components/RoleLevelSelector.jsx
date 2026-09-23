import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Shield,
  Layers,
  Sparkles,
  UserCheck,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';
import { useAuthorityView, AUTHORITY_TIERS } from '../context/AuthorityViewContext';
import { useAuth } from '../context/AuthContext';

const RoleLevelSelector = () => {
  const { selectedView, setSelectedView } = useAuthorityView();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (level) => {
    setSelectedView(level);
    setIsOpen(false);
  };

  // Indicator styles per level
  const levelStyles = {
    1: {
      dot: 'bg-[#2F8F68]',
      badgeBg: 'bg-[#E6F3EB]',
      badgeText: 'text-[#174C3B]',
      border: 'border-[#CDE5D7]',
      ring: 'ring-[#2F8F68]/30',
      activeBg: 'bg-[#DCF0E6]',
      shortTitle: 'Operational Resolution'
    },
    2: {
      dot: 'bg-[#734785]',
      badgeBg: 'bg-[#EFE3F5]',
      badgeText: 'text-[#553363]',
      border: 'border-[#DCBFEC]',
      ring: 'ring-[#734785]/30',
      activeBg: 'bg-[#E5D2EC]',
      shortTitle: 'Supervisory Intervention'
    },
    3: {
      dot: 'bg-[#A6473D]',
      badgeBg: 'bg-[#FAECEB]',
      badgeText: 'text-[#7A2A22]',
      border: 'border-[#F3C5BF]',
      ring: 'ring-[#A6473D]/30',
      activeBg: 'bg-[#F5D8D5]',
      shortTitle: 'Senior Administrative Oversight'
    }
  };

  const activeStyle = levelStyles[selectedView] || levelStyles[1];

  const viewOptions = [
    {
      level: 1,
      name: 'LEVEL 1',
      title: 'Operational Resolution',
      subtitle: 'Field handling & direct site resolution',
      authority: 'Departmental Field Team'
    },
    {
      level: 2,
      name: 'LEVEL 2',
      title: 'Supervisory Intervention',
      subtitle: 'Supervisory oversight & SLA intervention',
      authority: 'Departmental Supervisor'
    },
    {
      level: 3,
      name: 'LEVEL 3',
      title: 'Senior Administrative Oversight',
      subtitle: 'Executive oversight & critical escalation',
      authority: 'Senior Executive Authority'
    }
  ];

  return (
    <div className="relative inline-block text-left select-none" ref={dropdownRef}>
      {/* Compact Elegant Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-2xs hover:shadow-xs cursor-pointer ${
          activeStyle.badgeBg
        } ${activeStyle.border} ${isOpen ? 'ring-2 ' + activeStyle.ring : 'hover:border-[#2F8F68]'}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Switch Prototype Authority View"
      >
        <span className={`w-2 h-2 rounded-full ${activeStyle.dot} shrink-0`} />
        <span className="text-xs font-black text-[#174C3B] tracking-tight leading-none">
          ● L{selectedView} · {activeStyle.shortTitle}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#6E7C76] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Polished Floating Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#F3FAF6] border border-[#CDE5D7] shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F3FAF6 100%)'
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#CDE5D7] mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6E7C76]">
              VIEW AS
            </span>
            <span className="text-[9px] font-mono font-bold bg-[#E6F3EB] text-[#174C3B] px-2 py-0.5 rounded-md border border-[#CDE5D7]">
              Prototype Switch
            </span>
          </div>

          {/* Level Options */}
          <div className="space-y-1">
            {viewOptions.map((opt) => {
              const isSelected = selectedView === opt.level;
              const style = levelStyles[opt.level];

              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => handleSelect(opt.level)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 border cursor-pointer ${
                    isSelected
                      ? `${style.badgeBg} ${style.border} shadow-2xs ring-1 ${style.ring}`
                      : 'border-transparent hover:bg-[#E6F3EB] text-[#6E7C76] hover:text-[#174C3B]'
                  }`}
                >
                  {/* Indicator Dot/Radio */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? `${style.dot} text-white ring-2 ring-white`
                        : 'border-2 border-[#CDE5D7] bg-white'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  {/* Option Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-[#174C3B]' : 'text-[#174C3B]'}`}>
                        {opt.name}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 text-[#174C3B] border border-[#CDE5D7]">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#174C3B]">
                      {opt.title}
                    </div>
                    <div className="text-[11px] font-medium text-[#6E7C76] leading-tight mt-0.5">
                      {opt.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note confirming non-breaking RBAC */}
          <div className="mt-2 pt-2 border-t border-[#CDE5D7] px-3 py-1 text-[10px] text-[#6E7C76] flex items-center justify-between">
            <span>Auth: <strong className="text-[#174C3B] uppercase">{user?.role?.replace('_', ' ') || 'Ward Officer'}</strong></span>
            <span className="text-[#2F8F68] font-bold">RBAC Intact ✓</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleLevelSelector;
