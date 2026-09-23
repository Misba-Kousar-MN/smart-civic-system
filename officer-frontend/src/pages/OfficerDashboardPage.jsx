import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Users,
  Eye,
  Map as MapIcon,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
  Inbox,
  UserCheck,
  CheckCircle,
  Filter
} from 'lucide-react';
import { incidentApi } from '../api/incidentApi';
import { masterDataApi } from '../api/masterDataApi';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaTimer from '../components/SlaTimer';
import InteractiveMap from '../components/InteractiveMap';
import AssignTeamModal from '../components/AssignTeamModal';
import ResolutionModal from '../components/ResolutionModal';
import DemoClockControl from '../components/DemoClockControl';
import { parseCoordinates } from '../utils/locationUtils';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useAuthorityView, AUTHORITY_TIERS } from '../context/AuthorityViewContext';
import { getResponsibilityForIncident } from '../config/responsibilityMatrix';

const OfficerDashboardPage = () => {
  const { user } = useAuth();
  const { selectedView, setSelectedView, currentTierInfo } = useAuthorityView();
  const { lastEvent } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Filters & View State
  const userRole = user?.role || 'ward_officer';
  const userMaxLevel = useMemo(() => {
    if (userRole === 'aee') return 2;
    if (['commissioner', 'admin'].includes(userRole)) return 3;
    return 1;
  }, [userRole]);

  const tabFromUrl = searchParams.get('tab') || 'ALL';
  const categoryFromUrl = searchParams.get('category') || 'ALL';
  const levelParam = searchParams.get('level');

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);

  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('civic_demo_mode') === 'true';
  });

  const toggleDemoMode = () => {
    const nextVal = !demoMode;
    setDemoMode(nextVal);
    localStorage.setItem('civic_demo_mode', String(nextVal));
  };

  const [selectedAuthorityLevel, setSelectedAuthorityLevel] = useState(
    levelParam ? (levelParam === 'ALL' ? 'ALL' : parseInt(levelParam, 10)) : selectedView
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Synchronize dashboard level with selected authority view
  useEffect(() => {
    if (selectedAuthorityLevel !== 'ALL' && selectedAuthorityLevel !== selectedView) {
      setSelectedAuthorityLevel(selectedView);
      setActiveTab('ALL');
    }
  }, [selectedView]);

  // Modals
  const [selectedIncidentForAssign, setSelectedIncidentForAssign] = useState(null);
  const [selectedIncidentForResolve, setSelectedIncidentForResolve] = useState(null);

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab) {
      setActiveTab(paramTab);
    }
  }, [searchParams]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await incidentApi.getIncidents({});
      if (res?.success && res?.data) {
        setIncidents(res.data.incidents || []);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      setError(err.message || 'Unable to load operational incidents from backend database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const res = await masterDataApi.getDepartments();
      if (res?.success && res?.data) {
        setDepartments(res.data.departments || []);
      }
    } catch (e) {
      console.warn('[MASTER DATA] Failed to load departments:', e);
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (lastEvent && (lastEvent.table === 'incidents' || lastEvent.table === 'escalations')) {
      fetchIncidents();
    }
  }, [lastEvent]);

  // Derived Operational Counts (100% Data-Driven from Real DB Records)
  // Level 1 Operational Counts
  const needsAssignmentCount = useMemo(() => {
    return incidents.filter(i => !i.assigned_officer_id && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  }, [incidents]);

  const inProgressCount = useMemo(() => {
    return incidents.filter(i => i.status === 'IN_PROGRESS').length;
  }, [incidents]);

  const slaAtRiskCount = useMemo(() => {
    return incidents.filter(i => {
      if (i.status === 'RESOLVED' || i.status === 'CLOSED') return false;
      if (!i.sla_deadline) return false;
      const remainingMs = new Date(i.sla_deadline).getTime() - Date.now();
      return remainingMs > 0 && remainingMs < 4 * 60 * 60 * 1000;
    }).length;
  }, [incidents]);

  const newReportsCount = useMemo(() => {
    return incidents.filter(i => i.status === 'OPEN').length;
  }, [incidents]);

  // Level 2 Supervisory Counts
  const l2EscalationsCount = useMemo(() => {
    return incidents.filter(i => i.current_level === 2).length;
  }, [incidents]);

  const l1BreachedCount = useMemo(() => {
    return incidents.filter(i => (i.current_level || 1) >= 2).length;
  }, [incidents]);

  const l2CriticalCount = useMemo(() => {
    return incidents.filter(i => (i.current_level === 2) && (i.priority_level === 'CRITICAL' || i.priority_level === 'HIGH')).length;
  }, [incidents]);

  const reopenedCount = useMemo(() => {
    return incidents.filter(i => i.status === 'REOPENED').length;
  }, [incidents]);

  // Level 3 Executive Counts
  const l3TotalCount = useMemo(() => {
    return incidents.filter(i => (i.current_level || 1) >= 3).length;
  }, [incidents]);

  const finalBreachedCount = useMemo(() => {
    return incidents.filter(i => (i.current_level || 1) >= 3 && (i.status === 'SLA_BREACHED' || (i.sla_deadline && new Date(i.sla_deadline).getTime() < Date.now() && i.status !== 'RESOLVED' && i.status !== 'CLOSED'))).length;
  }, [incidents]);

  const multiTierCount = useMemo(() => {
    return incidents.filter(i => (i.current_level || 1) >= 3).length;
  }, [incidents]);

  const criticalEmergencyCount = useMemo(() => {
    return incidents.filter(i => parseFloat(i.priority_score || 0) >= 75 || i.priority_level === 'CRITICAL').length;
  }, [incidents]);

  const activeIncidentsCount = useMemo(() => {
    return incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  }, [incidents]);

  // Derived Category Counts (100% Data-Driven)
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: incidents.length,
      POTHOLE: 0,
      WATER_LEAKAGE: 0,
      GARBAGE: 0,
      OTHER: 0
    };

    incidents.forEach(inc => {
      const cat = (inc.category || '').trim().toLowerCase();
      if (cat === 'pothole') {
        counts.POTHOLE++;
      } else if (cat === 'water leakage' || cat === 'water_leakage') {
        counts.WATER_LEAKAGE++;
      } else if (cat.includes('garbage')) {
        counts.GARBAGE++;
      } else {
        counts.OTHER++;
      }
    });

    return counts;
  }, [incidents]);

  // Derived Authority Level Counts (100% Data-Driven)
  const levelCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    incidents.forEach(inc => {
      const lvl = inc.current_level || 1;
      if (lvl >= 3) counts[3]++;
      else if (lvl === 2) counts[2]++;
      else counts[1]++;
    });
    return counts;
  }, [incidents]);

  // Smart Sorting Algorithm
  const sortedIncidents = useMemo(() => {
    const computeUrgencyRank = (inc) => {
      const isResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';
      if (isResolved) return 7;

      const remainingMs = inc.sla_deadline ? new Date(inc.sla_deadline).getTime() - Date.now() : 999999999;
      const isBreached = remainingMs < 0;
      const isEscalated = inc.status === 'ESCALATED' || inc.status === 'SLA_BREACHED' || (inc.current_level && inc.current_level > 1);
      const isSlaRisk = remainingMs >= 0 && remainingMs < 4 * 60 * 60 * 1000;
      const isUnassigned = !inc.assigned_officer_id;

      if (isBreached) return 1;
      if (isEscalated) return 2;
      if (isSlaRisk) return 3;
      if (isUnassigned) return 4;
      if (inc.status === 'OPEN') return 5;
      if (inc.status === 'IN_PROGRESS') return 6;
      return 7;
    };

    return [...incidents].sort((a, b) => {
      const rankA = computeUrgencyRank(a);
      const rankB = computeUrgencyRank(b);

      if (rankA !== rankB) return rankA - rankB;

      const scoreA = parseFloat(a.priority_score || 0);
      const scoreB = parseFloat(b.priority_score || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;

      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [incidents]);

  // Filtered Queue (Responsibility Level View Driven)
  const filteredIncidents = useMemo(() => {
    return sortedIncidents.filter(inc => {
      const incLevel = inc.current_level || 1;
      const remainingMs = inc.sla_deadline ? new Date(inc.sla_deadline).getTime() - Date.now() : 999999999;
      const isSlaRisk = remainingMs > 0 && remainingMs < 4 * 60 * 60 * 1000;

      // 0. Primary Filter: Active Responsibility View
      if (selectedView === 1) {
        // Level 1: Operational Resolution — "What incidents do I need to handle?"
        // Displays active frontline operational incidents queued or assigned for field resolution.
        if (incLevel > 1) return false;
      } else if (selectedView === 2) {
        // Level 2: Supervisory Intervention — "Which cases need my intervention?"
        // Normal complaints remain at Level 1; only cases requiring supervisory intervention appear here.
        const requiresIntervention =
          incLevel === 2 ||
          inc.status === 'ESCALATED' ||
          inc.status === 'SLA_BREACHED' ||
          inc.status === 'REOPENED' ||
          inc.status === 'PAUSED' ||
          isSlaRisk;
        if (!requiresIntervention) return false;
      } else if (selectedView === 3) {
        // Level 3: Senior Administrative Oversight — "Which cases require senior attention?"
        // Exception and high-impact oversight view; does not duplicate routine complaints.
        const isCriticalImpact = inc.priority_level === 'CRITICAL' || parseFloat(inc.priority_score || 0) >= 75;
        const isTerminalBreach = inc.status === 'SLA_BREACHED';
        const requiresSeniorOversight = incLevel >= 3 || isTerminalBreach || isCriticalImpact;
        if (!requiresSeniorOversight) return false;
      }

      // 1. Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = (inc.category || '').trim().toLowerCase();
        if (selectedCategory === 'POTHOLE' && cat !== 'pothole') return false;
        if (selectedCategory === 'WATER_LEAKAGE' && (cat !== 'water leakage' && cat !== 'water_leakage')) return false;
        if (selectedCategory === 'GARBAGE' && !cat.includes('garbage')) return false;
        if (selectedCategory === 'OTHER') {
          const isKnown = cat === 'pothole' || cat === 'water leakage' || cat === 'water_leakage' || cat.includes('garbage');
          if (isKnown) return false;
        }
      }

      // 2. Status / Urgency Tab Filter
      if (activeTab === 'NEEDS_ASSIGNMENT' || activeTab === 'NEEDS_ACTION') {
        if (inc.assigned_officer_id || inc.status === 'RESOLVED' || inc.status === 'CLOSED') return false;
      } else if (activeTab === 'IN_PROGRESS') {
        if (inc.status !== 'IN_PROGRESS') return false;
      } else if (activeTab === 'SLA_RISK') {
        if (inc.status === 'RESOLVED' || inc.status === 'CLOSED' || !inc.sla_deadline) return false;
        if (remainingMs <= 0 || remainingMs >= 4 * 60 * 60 * 1000) return false;
      } else if (activeTab === 'NEW_REPORTS') {
        if (inc.status !== 'OPEN') return false;
      } else if (activeTab === 'L2_ESCALATED' || activeTab === 'SUPERVISORY_ATTENTION') {
        if (incLevel !== 2 && inc.status !== 'ESCALATED') return false;
      } else if (activeTab === 'L1_BREACHED' || activeTab === 'ESCALATED_CASES') {
        if (incLevel < 2 && inc.status !== 'ESCALATED' && inc.status !== 'SLA_BREACHED') return false;
      } else if (activeTab === 'L2_CRITICAL' || activeTab === 'HIGH_PRIORITY') {
        if (inc.priority_level !== 'CRITICAL' && inc.priority_level !== 'HIGH') return false;
      } else if (activeTab === 'REOPENED' || activeTab === 'RECENT_ESCALATIONS') {
        if (inc.status !== 'REOPENED' && inc.status !== 'ESCALATED') return false;
      } else if (activeTab === 'L3_ACTIVE' || activeTab === 'EXECUTIVE_ATTENTION') {
        if (incLevel < 3) return false;
      } else if (activeTab === 'FINAL_BREACH' || activeTab === 'FINAL_ESCALATIONS') {
        const isExp = inc.sla_deadline && new Date(inc.sla_deadline).getTime() < Date.now();
        if (inc.status !== 'SLA_BREACHED' && !isExp) return false;
      } else if (activeTab === 'CRITICAL_RISK' || activeTab === 'CRITICAL_CASES') {
        const score = parseFloat(inc.priority_score || 0);
        if (score < 75 && inc.priority_level !== 'CRITICAL') return false;
      } else if (activeTab === 'MULTI_TIER') {
        if (incLevel < 3) return false;
      } else if (activeTab === 'RESOLVED') {
        if (inc.status !== 'RESOLVED' && inc.status !== 'CLOSED') return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = (inc.category || '').toLowerCase();
        const addr = (inc.address || '').toLowerCase();
        const id = (inc.id || '').toLowerCase();
        const dept = (inc.departments?.name || inc.departments?.code || '').toLowerCase();
        if (!cat.includes(q) && !addr.includes(q) && !id.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [sortedIncidents, activeTab, selectedCategory, selectedView, searchQuery]);

  const handleLevelChange = (lvl) => {
    if (lvl !== 'ALL' && !demoMode && Number(lvl) > userMaxLevel) {
      setError(`Role '${userRole}' is restricted to Level ${userMaxLevel} operational queue. Enable Demo Mode to view all escalation tiers.`);
      return;
    }
    setError('');
    setSelectedAuthorityLevel(lvl);
    const newParams = new URLSearchParams(searchParams);
    if (lvl === 'ALL') {
      newParams.delete('level');
    } else {
      newParams.set('level', String(lvl));
    }
    if (activeTab !== 'ALL') newParams.set('tab', activeTab);
    if (selectedCategory !== 'ALL') newParams.set('category', selectedCategory);
    setSearchParams(newParams);
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabKey);
    if (selectedCategory !== 'ALL') {
      newParams.set('category', selectedCategory);
    }
    setSearchParams(newParams);
  };

  const handleCategoryChange = (catKey) => {
    setSelectedCategory(catKey);
    const newParams = new URLSearchParams(searchParams);
    if (activeTab !== 'ALL') {
      newParams.set('tab', activeTab);
    }
    if (catKey === 'ALL') {
      newParams.delete('category');
    } else {
      newParams.set('category', catKey);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="bg-[#F0F8F5] min-h-screen space-y-6 pb-12 select-none">
      {/* Presentation Accelerated Demo Clock Control Bar */}
      <DemoClockControl />

      {/* ---------------------------------------------------------------- */}
      {/* 1. OFFICER COMMAND CENTER HEADER (Adapts based on selectedView)  */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="rounded-2xl p-6 shadow-md border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white transition-all duration-300"
        style={{
          background:
            selectedView === 3
              ? 'linear-gradient(135deg, #4A1B1B, #782D2D)'
              : selectedView === 2
              ? 'linear-gradient(135deg, #3B2349, #613B76)'
              : 'linear-gradient(135deg, #1F5443, #2B7A5F)',
          borderColor:
            selectedView === 3
              ? 'rgba(166, 71, 61, 0.4)'
              : selectedView === 2
              ? 'rgba(115, 71, 133, 0.4)'
              : 'rgba(31, 84, 67, 0.4)'
        }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider mb-1 opacity-90">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>
              {selectedView === 1
                ? 'LEVEL 1 • OPERATIONAL RESOLUTION'
                : selectedView === 2
                ? 'LEVEL 2 • SUPERVISORY INTERVENTION'
                : 'LEVEL 3 • SENIOR ADMINISTRATIVE OVERSIGHT'}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {selectedView === 1
              ? `Good evening, ${user?.full_name || 'Operational Resolver'}.`
              : selectedView === 2
              ? 'Supervisory Technical Escalation Command'
              : 'Senior Administrative Accountability Oversight'}
          </h1>
          <p className="text-xs font-semibold text-white/85 mt-1">
            {selectedView === 1
              ? `${activeIncidentsCount} active operational field workorders are being monitored across assigned municipal services.`
              : selectedView === 2
              ? `${levelCounts[2] || filteredIncidents.length} incidents currently require departmental supervisory intervention.`
              : `${levelCounts[3] || filteredIncidents.length} exceptional civic matters have reached senior administrative oversight.`}
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end flex-wrap">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border bg-white/15 text-white border-white/25 hover:bg-white/25 cursor-pointer"
          >
            <MapIcon className="w-4 h-4" />
            <span>{showMap ? 'Hide Map' : 'View Map'}</span>
          </button>

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-white/15 text-white border border-white/25 hover:bg-white/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 border border-white/30 text-[#C8EAD9] text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#C8EAD9] animate-pulse" />
            <span>LIVE • {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Optional Spatial Map View */}
      {showMap && (
        <div className="bg-[#E6F4ED] rounded-2xl p-4 border border-[#B8E0CB] shadow-xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-[#1F5443] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#349670]" />
              <span>Ward Operational Spatial Map</span>
            </h3>
            <span className="text-xs font-bold text-[#4A7365]">{filteredIncidents.length} map pins</span>
          </div>
          <InteractiveMap incidents={filteredIncidents} height="380px" />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. PRIMARY ATTENTION STRIP (Adapts based on selectedView)        */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-[#E6F4ED] rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
        <div>
          <h2 className="text-xs font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#9C621E]" />
            <span>
              {selectedView === 1
                ? 'OPERATIONAL ATTENTION REQUIRED'
                : selectedView === 2
                ? 'SUPERVISORY INTERVENTION REQUIRED'
                : 'SENIOR ADMINISTRATIVE DIRECTIVE REQUIRED'}
            </span>
          </h2>
          <p className="text-[11px] font-semibold text-[#4A7365]">
            {selectedView === 1
              ? 'Unassigned or SLA-at-risk workorders requiring field action.'
              : selectedView === 2
              ? 'Incidents that exceeded Level 1 SLA or require supervisory decision.'
              : 'Critical matters and terminal SLA breaches requiring senior review.'}
          </p>
        </div>

        {/* 4 Adaptive Attention Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {selectedView === 1 ? (
            // LEVEL 1 (OPERATIONAL RESOLUTION) PILLS
            <>
              <button
                type="button"
                onClick={() => handleTabChange('NEEDS_ACTION')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'NEEDS_ACTION' || activeTab === 'NEEDS_ASSIGNMENT'
                    ? 'bg-[#CEEADA] border-[#9C621E] ring-2 ring-[#9C621E]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">Needs Action</span>
                  {needsAssignmentCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#9C621E] text-white">
                      {needsAssignmentCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Unassigned workorders</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('IN_PROGRESS')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'IN_PROGRESS'
                    ? 'bg-[#CEEADA] border-[#326F9C] ring-2 ring-[#326F9C]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">Active Field Work</span>
                  {inProgressCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#326F9C] text-white">
                      {inProgressCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">In progress on ground</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('NEW_REPORTS')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'NEW_REPORTS'
                    ? 'bg-[#CEEADA] border-[#349670] ring-2 ring-[#349670]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">New Reports</span>
                  {newReportsCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#349670] text-white">
                      {newReportsCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Fresh citizen submissions</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('SLA_RISK')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'SLA_RISK'
                    ? 'bg-[#CEEADA] border-[#A6473D] ring-2 ring-[#A6473D]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">SLA Approaching</span>
                  {slaAtRiskCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white">
                      {slaAtRiskCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Expiring &lt; 4 hours</p>
              </button>
            </>
          ) : selectedView === 2 ? (
            // LEVEL 2 (SUPERVISORY INTERVENTION) PILLS
            <>
              <button
                type="button"
                onClick={() => handleTabChange('SUPERVISORY_ATTENTION')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'SUPERVISORY_ATTENTION' || activeTab === 'L2_ESCALATED'
                    ? 'bg-[#EFE3F5] border-[#734785] ring-2 ring-[#734785]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#734785]">Supervisory Attention</span>
                  {l2EscalationsCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#734785] text-white">
                      {l2EscalationsCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">Clear ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#553363] font-medium truncate">Active at Level 2</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('ESCALATED_CASES')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'ESCALATED_CASES' || activeTab === 'L1_BREACHED'
                    ? 'bg-[#EFE3F5] border-[#9C621E] ring-2 ring-[#9C621E]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">Escalated Cases</span>
                  {l1BreachedCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#9C621E] text-white">
                      {l1BreachedCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Exceeded frontline SLA</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('SLA_RISK')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'SLA_RISK'
                    ? 'bg-[#EFE3F5] border-[#A6473D] ring-2 ring-[#A6473D]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">SLA Risks</span>
                  {slaAtRiskCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white">
                      {slaAtRiskCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Expiring &lt; 4 hours</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('RECENT_ESCALATIONS')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'RECENT_ESCALATIONS' || activeTab === 'REOPENED'
                    ? 'bg-[#EFE3F5] border-[#734785] ring-2 ring-[#734785]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">Recent Escalations</span>
                  {reopenedCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#734785] text-white">
                      {reopenedCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Reopened / QA review</p>
              </button>
            </>
          ) : (
            // LEVEL 3 (SENIOR ADMINISTRATIVE OVERSIGHT) PILLS
            <>
              <button
                type="button"
                onClick={() => handleTabChange('EXECUTIVE_ATTENTION')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'EXECUTIVE_ATTENTION' || activeTab === 'L3_ACTIVE'
                    ? 'bg-[#FAECEB] border-[#A6473D] ring-2 ring-[#A6473D]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#A6473D]">Senior Attention</span>
                  {l3TotalCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white">
                      {l3TotalCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">Clear ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#7A2A22] font-medium truncate">Senior administrative oversight</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('FINAL_ESCALATIONS')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'FINAL_ESCALATIONS' || activeTab === 'FINAL_BREACH'
                    ? 'bg-[#FAECEB] border-[#A6473D] ring-2 ring-[#A6473D]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#A6473D]">Final Escalations</span>
                  {finalBreachedCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white animate-pulse">
                      {finalBreachedCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#7A2A22] font-medium truncate">Terminal tier (No L4)</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('CRITICAL_CASES')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'CRITICAL_CASES' || activeTab === 'CRITICAL_RISK'
                    ? 'bg-[#FAECEB] border-[#9C621E] ring-2 ring-[#9C621E]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#174437]">Critical Cases</span>
                  {criticalEmergencyCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#9C621E] text-white">
                      {criticalEmergencyCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4A7365] font-medium truncate">Score &ge; 75 civic impact</p>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('SLA_RISK')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === 'SLA_RISK'
                    ? 'bg-[#FAECEB] border-[#A6473D] ring-2 ring-[#A6473D]'
                    : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#A6473D]">SLA Breaches</span>
                  {slaAtRiskCount + finalBreachedCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white">
                      {slaAtRiskCount + finalBreachedCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#216D51]">None ✓</span>
                  )}
                </div>
                <p className="text-[10px] text-[#7A2A22] font-medium truncate">Overdue escalated cases</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 3. PRIORITIZED INCIDENT WORK QUEUE                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-[#E6F4ED] rounded-2xl border border-[#B8E0CB] shadow-xs overflow-hidden">
        {/* Queue Header & Filters */}
        <div className="p-5 border-b border-[#B8E0CB] bg-[#DCF0E6] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-[#1F5443] tracking-tight">
              {selectedView === 1
                ? 'OPERATIONAL QUEUE'
                : selectedView === 2
                ? 'SUPERVISORY INTERVENTION QUEUE'
                : 'SENIOR OVERSIGHT QUEUE'}
            </h2>
            <p className="text-xs font-semibold text-[#4A7365]">
              {selectedView === 1
                ? `${filteredIncidents.length} active workorders`
                : selectedView === 2
                ? `${filteredIncidents.length} requiring intervention`
                : `${filteredIncidents.length} requiring senior attention`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#75998C] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter queue..."
                className="w-full sm:w-48 h-8.5 pl-8 pr-3 bg-[#E6F4ED] border border-[#B8E0CB] rounded-xl text-xs font-medium text-[#174437] placeholder-[#75998C] focus:outline-none focus:border-[#349670]"
              />
            </div>

            {/* Segmented Control Filters (Adaptive by Selected View) */}
            <div className="flex items-center gap-1 p-1 bg-[#CEEADA] border border-[#B8E0CB] rounded-xl text-[11px] font-bold overflow-x-auto">
              {(selectedView === 1
                ? [
                    { key: 'ALL', label: 'All' },
                    { key: 'NEEDS_ACTION', label: 'Needs Action' },
                    { key: 'IN_PROGRESS', label: 'Active Field Work' },
                    { key: 'NEW_REPORTS', label: 'New Reports' },
                    { key: 'SLA_RISK', label: 'SLA Approaching' },
                    { key: 'RESOLVED', label: 'Resolved' }
                  ]
                : selectedView === 2
                ? [
                    { key: 'ALL', label: 'All' },
                    { key: 'SUPERVISORY_ATTENTION', label: 'Supervisory Attention' },
                    { key: 'ESCALATED_CASES', label: 'Escalated Cases' },
                    { key: 'HIGH_PRIORITY', label: 'High Priority' },
                    { key: 'RECENT_ESCALATIONS', label: 'Recent Escalations' },
                    { key: 'RESOLVED', label: 'Resolved' }
                  ]
                : [
                    { key: 'ALL', label: 'All' },
                    { key: 'EXECUTIVE_ATTENTION', label: 'Executive Attention' },
                    { key: 'FINAL_ESCALATIONS', label: 'Final Escalations' },
                    { key: 'CRITICAL_CASES', label: 'Critical Cases' },
                    { key: 'SLA_RISK', label: 'SLA Breaches' },
                    { key: 'RESOLVED', label: 'Resolved' }
                  ]
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-[#349670] text-white shadow-2xs font-extrabold'
                      : 'text-[#4A7365] hover:text-[#174437]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs / Filters */}
        <div className="px-5 py-3 bg-[#E6F4ED] border-b border-[#B8E0CB] flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-black text-[#75998C] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#349670]" />
            <span>Category:</span>
          </span>
          {[
            { key: 'ALL', label: 'All', count: categoryCounts.ALL },
            { key: 'POTHOLE', label: 'Pothole', count: categoryCounts.POTHOLE },
            { key: 'WATER_LEAKAGE', label: 'Water Leakage', count: categoryCounts.WATER_LEAKAGE },
            { key: 'GARBAGE', label: 'Garbage', count: categoryCounts.GARBAGE },
            { key: 'OTHER', label: 'Other', count: categoryCounts.OTHER }
          ].map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-[#1F5443] text-white border-[#1F5443] shadow-xs'
                  : 'bg-[#DCF0E6] text-[#174437] border-[#B8E0CB] hover:bg-[#CEEADA]'
              }`}
            >
              <span>{cat.label} ({cat.count})</span>
            </button>
          ))}
        </div>

        {/* Queue Items */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#349670] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#4A7365]">Loading operational incidents from database...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-[#FAECEB] text-[#A6473D] border border-[#F3C5BF]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#A6473D]">
              {selectedView === 3
                ? 'Unable to Load Senior Oversight Incidents'
                : selectedView === 2
                ? 'Unable to Load Supervisory Interventions'
                : 'Unable to Load Operational Incidents'}
            </h3>
            <p className="text-xs font-semibold text-[#4A7365] max-w-md mx-auto">
              {error}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={fetchIncidents}
                className="px-4 py-2 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
              selectedView === 3
                ? 'bg-[#FAECEB] text-[#A6473D] border-[#F3C5BF]'
                : selectedView === 2
                ? 'bg-[#EFE3F5] text-[#734785] border-[#DCBFEC]'
                : 'bg-[#D5EFE1] text-[#216D51] border-[#B8E0CB]'
            }`}>
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1F5443]">
              {selectedView === 1
                ? 'No Operational Incidents in Queue'
                : selectedView === 2
                ? 'No Supervisory Interventions Active'
                : 'No Senior Oversight Matters Active'}
            </h3>
            <p className="text-xs font-semibold text-[#4A7365] max-w-md mx-auto">
              {selectedView === 1
                ? 'No workorders in this filter.'
                : selectedView === 2
                ? 'No incidents require supervisory intervention.'
                : 'No matters require senior attention.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#B8E0CB]/60">
            {filteredIncidents.map(inc => {
              const reportCount = inc.incident_reports ? inc.incident_reports.length : 1;
              const primaryReport = inc.incident_reports?.find(r => r.is_primary)?.reports || inc.incident_reports?.[0]?.reports;
              const imageUrl = primaryReport?.image_url || '/placeholder-incident.jpg';
              const coords = parseCoordinates(inc.location);

              const resp = getResponsibilityForIncident(inc.category, inc.departments?.code);
              const levelLabel = (inc.current_level || 1) === 3
                ? resp.seniorAuthority
                : (inc.current_level || 1) === 2
                ? resp.supervisoryRole
                : resp.operationalRole;
              const officerAssigned = inc.assigned_officer_id ? 'Assigned Field Resolver' : 'Unassigned';
              const deptName = inc.departments?.name || resp.departmentName;

              return (
                <div
                  key={inc.id}
                  className={`p-5 transition-all flex flex-col gap-3 group ${
                    selectedView === 3
                      ? 'bg-[#F9ECEB]/50 hover:bg-[#F9ECEB]'
                      : selectedView === 2
                      ? 'bg-[#F4EEF7]/50 hover:bg-[#F4EEF7]'
                      : 'bg-[#DCF0E6] hover:bg-[#CEEADA]'
                  }`}
                >
                  {/* Level 2 Supervisory Context Banner */}
                  {selectedView === 2 && (
                    <div className="p-2.5 px-3.5 rounded-xl bg-[#EFE3F5] border border-[#DCBFEC] flex items-center justify-between text-xs font-bold text-[#734785] flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#734785] shrink-0" />
                        <span>Escalated from L1 — {resp.supervisoryShort}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/80 text-[#553363] border border-[#DCBFEC]">
                        Intervention Required
                      </span>
                    </div>
                  )}

                  {/* Level 3 Senior Administrative Context Banner */}
                  {selectedView === 3 && (
                    <div className="p-2.5 px-3.5 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] flex items-center justify-between text-xs font-bold text-[#A6473D] flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#A6473D] shrink-0" />
                        <span>Escalated from L2 — {resp.seniorShort}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/80 text-[#7A2A22] border border-[#F3C5BF]">
                        {inc.status === 'SLA_BREACHED' ? 'Terminal Breach' : 'Senior Attention'}
                      </span>
                    </div>
                  )}

                  {selectedView === 3 && inc.status === 'SLA_BREACHED' && (
                    <div className="text-[11px] font-bold text-[#A6473D] bg-white/80 p-2 px-3 rounded-xl border border-[#F3C5BF]">
                      ⚠️ Terminal tier — no higher authority level. Persistent breach recorded.
                    </div>
                  )}

                  {/* Main Incident Card Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left Thumbnail & Core Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <img
                        src={imageUrl}
                        alt={inc.category}
                        className="w-20 h-20 rounded-xl object-cover border border-[#B8E0CB] shrink-0 bg-[#E6F4ED] shadow-2xs"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=300'; }}
                      />

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-[#1F5443] tracking-tight uppercase">
                            {inc.category || 'Civic Incident'}
                          </span>
                          <PriorityBadge priority={inc.priority_level} score={inc.priority_score} />
                          <StatusBadge status={inc.status} />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4A7365]">
                          <MapPin className="w-3.5 h-3.5 text-[#75998C] shrink-0" />
                          <span className="truncate">{inc.address || `Location (${coords?.lat || '14.46'}, ${coords?.lng || '75.92'})`}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#4A7365] flex-wrap">
                          <div>
                            <span className="text-[#75998C] font-bold uppercase tracking-wider text-[9px] mr-1">DEPARTMENT:</span>
                            <span className="text-[#174437] font-bold">{deptName}</span>
                          </div>

                          {selectedView === 2 ? (
                            <div>
                              <span className="text-[#75998C] font-bold uppercase tracking-wider text-[9px] mr-1">OPERATIONAL RESOLVER:</span>
                              <span className={`font-bold ${inc.assigned_officer_id ? 'text-[#216D51]' : 'text-[#9C621E]'}`}>
                                {officerAssigned}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[#75998C] font-bold uppercase tracking-wider text-[9px] mr-1">RESOLVER:</span>
                              <span className={`font-bold ${inc.assigned_officer_id ? 'text-[#216D51]' : 'text-[#9C621E]'}`}>
                                {officerAssigned}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="text-[#75998C] font-bold uppercase tracking-wider text-[9px] mr-1">REPORTS:</span>
                            <span className="text-[#174437] font-bold">{reportCount} citizen {reportCount === 1 ? 'report' : 'reports'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle SLA & Authority Owner */}
                    <div className="flex items-center gap-6 self-stretch lg:self-auto justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-[#B8E0CB]/60">
                      <div className="space-y-1 text-left lg:text-right">
                        <div className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">
                          CURRENT RESPONSIBILITY
                        </div>
                        <div className="text-xs font-black text-[#174437] flex items-center gap-1.5 lg:justify-end">
                          <UserCheck className="w-3.5 h-3.5 text-[#349670]" />
                          <span>{levelLabel}</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#75998C]">
                          ID: #{inc.id.substring(0, 8)}
                        </div>
                      </div>

                      <div className="space-y-1 text-right">
                        <div className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">
                          SLA DEADLINE
                        </div>
                        <SlaTimer deadline={inc.sla_deadline} status={inc.status} />
                      </div>

                      {/* Primary Button */}
                      <Link
                        to={`/officer/incidents/${inc.id}`}
                        className="px-4 py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-extrabold text-xs shadow-2xs transition-all flex items-center gap-1.5 shrink-0 group-hover:scale-[1.02] cursor-pointer"
                      >
                        <span>Open Incident</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedIncidentForAssign && (
        <AssignTeamModal
          incident={selectedIncidentForAssign}
          departments={departments}
          onClose={() => setSelectedIncidentForAssign(null)}
          onSuccess={() => {
            setSelectedIncidentForAssign(null);
            fetchIncidents();
          }}
        />
      )}

      {selectedIncidentForResolve && (
        <ResolutionModal
          incident={selectedIncidentForResolve}
          onClose={() => setSelectedIncidentForResolve(null)}
          onSuccess={() => {
            setSelectedIncidentForResolve(null);
            fetchIncidents();
          }}
        />
      )}
    </div>
  );
};

export default OfficerDashboardPage;
