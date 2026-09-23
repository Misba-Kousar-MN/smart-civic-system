import React, { useMemo } from 'react';
import {
  Check,
  Clock,
  AlertTriangle,
  ChevronRight,
  Shield,
  UserCheck,
  ArrowRight,
  Zap,
  Sparkles,
  Info,
  Layers,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

/**
 * Stages definition for the 3-Level Municipal Accountability Chain
 */
export const ESCALATION_STAGES = [
  {
    level: 1,
    code: 'OPERATIONAL_RESOLUTION',
    title: 'Operational Resolution',
    shortTitle: 'Operational',
    authority: 'Departmental Field Team',
    roleLabel: 'Operational Resolver',
    targetSla: 'Configured Resolution Window',
    description: 'Frontline field inspection, workorder dispatch, and direct on-site resolution.'
  },
  {
    level: 2,
    code: 'SUPERVISORY_INTERVENTION',
    title: 'Supervisory Intervention',
    shortTitle: 'Supervisory',
    authority: 'Departmental Supervisory Authority',
    roleLabel: 'Supervisory Technical Authority',
    targetSla: '24 Hours',
    description: 'Technical oversight, resource coordination, and urgent intervention for operational SLA breaches.'
  },
  {
    level: 3,
    code: 'SENIOR_ADMINISTRATIVE_OVERSIGHT',
    title: 'Senior Administrative Oversight',
    shortTitle: 'Senior Oversight',
    authority: 'Senior Administrative Authority',
    roleLabel: 'Senior Executive Directive',
    targetSla: '12 Hours',
    description: 'Highest municipal tier, executive intervention, and urgent city administration directive.'
  }
];

/**
 * EscalationCommandRail Component
 *
 * Visualizes the 3-level municipal accountability progression:
 * Level 1 (Ward Officer) -> Level 2 (AEE) -> Level 3 (Commissioner) -> Final SLA Breach (No L4)
 *
 * Props:
 * - currentLevel: number (1, 2, or 3)
 * - status: string ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'SLA_BREACHED', 'RESOLVED', etc.)
 * - slaDeadline: string | Date
 * - escalations: array of escalation records
 * - statusHistory: array of status history records
 * - variant: 'compact' | 'full' (default: 'full')
 * - demoMode: boolean
 * - onSimulateBreach: function (calls existing demo endpoint)
 * - breachLoading: boolean
 * - isResolved: boolean
 */
const EscalationCommandRail = ({
  currentLevel = 1,
  status = 'OPEN',
  slaDeadline,
  escalations = [],
  statusHistory = [],
  variant = 'full',
  demoMode = false,
  onSimulateBreach,
  breachLoading = false,
  isResolved = false
}) => {
  const normLevel = Math.max(1, Math.min(3, Number(currentLevel) || 1));

  // Determine SLA remaining status
  const slaRemainingInfo = useMemo(() => {
    if (isResolved) return { isExpired: false, text: 'Resolved within SLA' };
    if (!slaDeadline) return { isExpired: false, text: 'SLA Active' };

    const diff = new Date(slaDeadline).getTime() - Date.now();
    if (diff <= 0) {
      return { isExpired: true, text: 'SLA Breached' };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isExpired: false,
      text: `${hours}h ${mins}m remaining`
    };
  }, [slaDeadline, isResolved]);

  const isFinalBreach = (normLevel === 3 && (status === 'SLA_BREACHED' || slaRemainingInfo.isExpired)) && !isResolved;
  const isCurrentLevelBreached = (status === 'SLA_BREACHED' || slaRemainingInfo.isExpired) && !isResolved;

  // Real escalation transitions from backend database
  const l1ToL2Escalation = useMemo(() => {
    return escalations.find(e => e.from_level === 1 && e.to_level === 2);
  }, [escalations]);

  const l2ToL3Escalation = useMemo(() => {
    return escalations.find(e => e.from_level === 2 && e.to_level === 3);
  }, [escalations]);

  // Helper to determine status of stage i (1, 2, 3)
  const getStageState = (stageLvl) => {
    if (isResolved) {
      if (stageLvl < normLevel) return 'COMPLETED';
      if (stageLvl === normLevel) return 'RESOLVED';
      return 'UPCOMING';
    }

    if (stageLvl < normLevel) {
      return 'COMPLETED';
    }
    if (stageLvl === normLevel) {
      if (stageLvl === 3 && isFinalBreach) return 'FINAL_BREACH';
      if (isCurrentLevelBreached) return 'BREACHED';
      return 'CURRENT';
    }
    return 'UPCOMING';
  };

  // --------------------------------------------------------------------------
  // COMPACT VARIANT (Optimized for Officer Incident Cards on Dashboard)
  // --------------------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className="w-full bg-[#E6F4ED] rounded-xl p-2.5 border border-[#B8E0CB] select-none">
        <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px]">
          <span className="font-extrabold uppercase tracking-wider text-[#1F5443] flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#349670]" />
            <span>Accountability Rail</span>
          </span>
          <span className="font-black text-[10px]">
            {isFinalBreach ? (
              <span className="px-1.5 py-0.5 rounded bg-[#FAECEB] text-[#A6473D] border border-[#F3C5BF] flex items-center gap-0.5">
                <AlertOctagon className="w-2.5 h-2.5" />
                <span>FINAL SLA BREACH</span>
              </span>
            ) : isResolved ? (
              <span className="px-1.5 py-0.5 rounded bg-[#D5EFE1] text-[#216D51] font-bold">
                RESOLVED AT L{normLevel}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-[#CEEADA] text-[#1F5443] font-bold">
                LEVEL {normLevel} CURRENT
              </span>
            )}
          </span>
        </div>

        {/* Mini 3-Stage Progress Rail */}
        <div className="flex items-center justify-between gap-1 relative">
          {ESCALATION_STAGES.map((stage, idx) => {
            const state = getStageState(stage.level);
            const isLast = idx === ESCALATION_STAGES.length - 1;

            return (
              <React.Fragment key={stage.level}>
                {/* Stage Pill */}
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all flex-1 min-w-0 ${
                    state === 'FINAL_BREACH'
                      ? 'bg-[#FAECEB] text-[#A6473D] border border-[#F3C5BF] ring-1 ring-[#A6473D]/30'
                      : state === 'BREACHED'
                      ? 'bg-[#FFF3E0] text-[#B85D19] border border-[#FCD8B3] ring-1 ring-[#B85D19]/30'
                      : state === 'CURRENT'
                      ? 'bg-[#1F5443] text-white shadow-xs font-black'
                      : state === 'COMPLETED'
                      ? 'bg-[#CEEADA] text-[#174437] border border-[#B8E0CB]'
                      : 'bg-white/50 text-[#75998C] border border-[#B8E0CB]/60 opacity-60'
                  }`}
                  title={`${stage.title} (${stage.authority})`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      state === 'FINAL_BREACH'
                        ? 'bg-[#A6473D] text-white'
                        : state === 'BREACHED'
                        ? 'bg-[#B85D19] text-white'
                        : state === 'CURRENT'
                        ? 'bg-[#349670] text-white ring-2 ring-white/50 animate-pulse'
                        : state === 'COMPLETED'
                        ? 'bg-[#216D51] text-white'
                        : 'bg-[#B8E0CB] text-[#1F5443]'
                    }`}
                  >
                    {state === 'COMPLETED' ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      `L${stage.level}`
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold truncate leading-tight">
                      {stage.shortTitle}
                    </div>
                  </div>
                </div>

                {/* Connector Arrow */}
                {!isLast && (
                  <div className="shrink-0 text-[#75998C]">
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        normLevel > stage.level ? 'text-[#349670] stroke-[2.5]' : 'text-[#B8E0CB]'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FULL EXPANDED VARIANT (Incident Detail Page Feature Section)
  // --------------------------------------------------------------------------
  return (
    <div className="bg-[#E6F4ED] rounded-2xl border border-[#B8E0CB] p-6 shadow-sm space-y-6 select-none">
      {/* 1. Header Bar with Context & Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#B8E0CB] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#349670] uppercase tracking-wider mb-0.5">
            <Layers className="w-4 h-4 text-[#349670]" />
            <span>MUNICIPAL ACCOUNTABILITY WORKFLOW</span>
          </div>
          <h2 className="text-lg font-black text-[#1F5443] tracking-tight">
            Escalation Command Rail
          </h2>
          <p className="text-xs font-semibold text-[#4A7365]">
            Continuous 3-tier municipal governance tracking incident accountability from Ward dispatch to Executive review.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {isFinalBreach ? (
            <div className="px-3 py-1.5 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] text-[#A6473D] text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <AlertOctagon className="w-4 h-4 animate-bounce" />
              <span>FINAL SLA BREACH • NO HIGHER LEVEL</span>
            </div>
          ) : isResolved ? (
            <div className="px-3 py-1.5 rounded-xl bg-[#D5EFE1] border border-[#B8E0CB] text-[#216D51] text-xs font-black flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>RESOLVED AT LEVEL {normLevel}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-[#1F5443] text-white text-xs font-black flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#5EB894] animate-ping" />
              <span>ACTIVE TIER: LEVEL {normLevel}</span>
            </div>
          )}

          {demoMode && (
            <span className="px-2.5 py-1 rounded-xl bg-[#FFF8E7] border border-[#F3DE9A] text-[#8C5E14] text-[10px] font-black uppercase tracking-wider">
              Demo Active
            </span>
          )}
        </div>
      </div>

      {/* 2. Main Visual Progression Command Rail */}
      <div className="space-y-4">
        {/* Horizontal Stepper (Stacks nicely on narrow viewports) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {ESCALATION_STAGES.map((stage, idx) => {
            const state = getStageState(stage.level);
            const isCurrent = state === 'CURRENT' || state === 'BREACHED' || state === 'FINAL_BREACH';
            const isCompleted = state === 'COMPLETED';
            const isBreached = state === 'BREACHED' || state === 'FINAL_BREACH';

            return (
              <div
                key={stage.level}
                className={`relative rounded-2xl p-4.5 border transition-all duration-300 flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? isBreached
                      ? 'bg-[#FAECEB] border-[#F3C5BF] ring-2 ring-[#A6473D]/40 shadow-sm'
                      : 'bg-[#1F5443] border-[#2B6D58] text-white ring-2 ring-[#349670]/50 shadow-md transform md:-translate-y-1'
                    : isCompleted
                    ? 'bg-[#CEEADA] border-[#B8E0CB] text-[#174437]'
                    : 'bg-white/40 border-[#B8E0CB]/80 text-[#75998C] opacity-75'
                }`}
              >
                {/* Card Top: Level Badge & State Label */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs transition-transform ${
                        isCurrent
                          ? isBreached
                            ? 'bg-[#A6473D] text-white'
                            : 'bg-[#349670] text-white ring-2 ring-white/40'
                          : isCompleted
                          ? 'bg-[#216D51] text-white'
                          : 'bg-[#B8E0CB] text-[#1F5443]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        `L${stage.level}`
                      )}
                    </div>

                    <div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider block ${
                          isCurrent && !isBreached ? 'text-[#C8EAD9]' : 'text-[#75998C]'
                        }`}
                      >
                        STAGE 0{stage.level}
                      </span>
                      <h4
                        className={`text-sm font-black tracking-tight leading-none mt-0.5 ${
                          isCurrent && !isBreached
                            ? 'text-white'
                            : isBreached
                            ? 'text-[#A6473D]'
                            : 'text-[#174437]'
                        }`}
                      >
                        {stage.title}
                      </h4>
                    </div>
                  </div>

                  {/* State Pill */}
                  <div>
                    {state === 'FINAL_BREACH' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#A6473D] text-white flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" />
                        <span>BREACHED</span>
                      </span>
                    ) : state === 'BREACHED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#A6473D] text-white flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>BREACHED</span>
                      </span>
                    ) : state === 'CURRENT' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#349670] text-white border border-[#5EB894] shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>CURRENT</span>
                      </span>
                    ) : state === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B8E0CB] text-[#1F5443]">
                        COMPLETED ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCF0E6] text-[#75998C]">
                        UPCOMING
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Authority Role & Standard SLA */}
                <div
                  className={`p-3 rounded-xl space-y-1 text-xs ${
                    isCurrent && !isBreached
                      ? 'bg-white/10 text-[#E6F4ED]'
                      : isBreached
                      ? 'bg-white/80 border border-[#F3C5BF] text-[#7A2A22]'
                      : 'bg-[#DCF0E6] text-[#4A7365]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Authority:
                    </span>
                    <span className="font-extrabold text-[11px]">
                      {stage.authority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Window:
                    </span>
                    <span className="font-bold text-[11px]">
                      {stage.targetSla}
                    </span>
                  </div>
                </div>

                {/* Bottom Status / Reason Note */}
                <div className="text-[11px] font-medium leading-relaxed pt-1">
                  {state === 'FINAL_BREACH' ? (
                    <div className="text-[#A6473D] font-bold">
                      ⚠️ Executive review window exceeded. Final breach logged. No Level 4 exists.
                    </div>
                  ) : state === 'BREACHED' ? (
                    <div className="text-[#A6473D] font-bold">
                      ⚠️ SLA breached at this tier. Escalation triggered.
                    </div>
                  ) : state === 'CURRENT' ? (
                    <div className={isCurrent && !isBreached ? 'text-[#C8EAD9]' : 'text-[#1F5443]'}>
                      <span className="font-bold">Active Authority:</span> {stage.description}
                    </div>
                  ) : state === 'COMPLETED' ? (
                    <div className="text-[#216D51] font-semibold">
                      ✓ Handled at Level {stage.level} and advanced along accountability chain.
                    </div>
                  ) : (
                    <div className="text-[#75998C] font-normal">
                      Will receive incident if prior authority breaches response SLA.
                    </div>
                  )}
                </div>

                {/* Connector Indicator (Visible on Desktop) */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[#E6F4ED] border border-[#B8E0CB] items-center justify-center text-[#75998C] shadow-2xs">
                    <ChevronRight
                      className={`w-4 h-4 ${
                        normLevel > stage.level ? 'text-[#349670] stroke-[3]' : 'text-[#B8E0CB]'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB] flex items-center justify-between gap-3 text-xs font-bold text-[#174437] flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#349670]" />
            <span>Progression Path:</span>
            <span className="text-[#4A7365] font-semibold flex items-center gap-1.5 flex-wrap">
              <strong className="text-[#1F5443]">Operational (L1)</strong>
              <ArrowRight className="w-3.5 h-3.5 text-[#349670]" />
              <strong className="text-[#1F5443]">Supervisory (L2)</strong>
              <ArrowRight className="w-3.5 h-3.5 text-[#349670]" />
              <strong className="text-[#1F5443]">Senior Oversight (L3)</strong>
              <ArrowRight className="w-3.5 h-3.5 text-[#349670]" />
              <span className="text-[#A6473D] font-bold">Final Breach Stop</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#4A7365]">
            <Clock className="w-3.5 h-3.5 text-[#349670]" />
            <span>
              {isResolved
                ? 'Workorder Resolved'
                : `Active SLA: ${slaRemainingInfo.text}`}
            </span>
          </div>
        </div>
      </div>

      {(escalations.length > 0 || isFinalBreach) && (
        <div className="p-4 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB] space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#1F5443] uppercase tracking-wider">
            <Info className="w-4 h-4 text-[#734785]" />
            <span>ACCOUNTABILITY AUDIT & TRANSITION CAUSES</span>
          </div>

          <div className="space-y-2">
            {l1ToL2Escalation && (
              <div className="p-3 rounded-lg bg-[#EFE3F5] border border-[#DCBFEC] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#734785] text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                  L1→L2
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center justify-between gap-2 font-bold text-[#734785]">
                    <span>Escalated to Level 2 (Supervisory Intervention)</span>
                    <span className="text-[10px] text-[#75998C] font-normal">
                      {new Date(l1ToL2Escalation.triggered_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#553363] mt-0.5 font-medium">
                    Cause: {l1ToL2Escalation.reason}
                  </p>
                </div>
              </div>
            )}

            {l2ToL3Escalation && (
              <div className="p-3 rounded-lg bg-[#EFE3F5] border border-[#DCBFEC] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#734785] text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                  L2→L3
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center justify-between gap-2 font-bold text-[#734785]">
                    <span>Escalated to Level 3 (Senior Administrative Oversight)</span>
                    <span className="text-[10px] text-[#75998C] font-normal">
                      {new Date(l2ToL3Escalation.triggered_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#553363] mt-0.5 font-medium">
                    Cause: {l2ToL3Escalation.reason}
                  </p>
                </div>
              </div>
            )}

            {isFinalBreach && (
              <div className="p-3 rounded-lg bg-[#FAECEB] border border-[#F3C5BF] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#A6473D] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  !
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-[#A6473D]">
                    FINAL SLA BREACH REACHED AT SENIOR ADMINISTRATIVE LEVEL 3
                  </div>
                  <p className="text-[11px] text-[#7A2A22] mt-0.5">
                    Senior administrative resolution target expired. The municipal system has logged this incident as a Final SLA Breach. No higher authority level exists.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {demoMode && (
        <div className="p-4 rounded-xl bg-[#FFF8E7] border border-[#F3DE9A] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black text-[#8C5E14] uppercase tracking-wider">
              <Zap className="w-4 h-4 text-[#E09422]" />
              <span>DEMO PRESENTATION CONTROLS • SLA SIMULATION</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#F5E6BA] px-2 py-0.5 rounded text-[#70490C]">
              Real Backend Service Call
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-[#70490C]">
              <span className="font-bold block">
                {isFinalBreach
                  ? 'Maximum Escalation Reached'
                  : normLevel === 1
                  ? 'Current: Ward Operations (L1) • Next: Supervisory Review (L2)'
                  : normLevel === 2
                  ? 'Current: Supervisory Review (L2) • Next: Executive Review (L3)'
                  : 'Current: Executive Review (L3) • Next: Final SLA Breach'}
              </span>
              <span className="text-[11px] opacity-85">
                Clicking trigger executes real SLA breach calculation and updates the database record.
              </span>
            </div>

            {/* Simulation Trigger Button */}
            {onSimulateBreach && !isResolved && (
              <button
                type="button"
                onClick={onSimulateBreach}
                disabled={breachLoading || isFinalBreach}
                className={`px-4 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 border ${
                  isFinalBreach
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-[#A6473D] text-white hover:bg-[#8A3B32] border-[#C25B50] active:scale-98 cursor-pointer shadow-md'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${breachLoading ? 'animate-spin' : ''}`} />
                <span>
                  {breachLoading
                    ? 'Simulating Escalation...'
                    : isFinalBreach
                    ? 'Final Breach Reached (No L4)'
                    : normLevel === 1
                    ? '⚡ Trigger SLA Breach (L1 → L2)'
                    : normLevel === 2
                    ? '⚡ Trigger SLA Breach (L2 → L3)'
                    : '⚡ Trigger Final SLA Breach (L3)'}
                </span>
                {!isFinalBreach && !breachLoading && (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationCommandRail;
