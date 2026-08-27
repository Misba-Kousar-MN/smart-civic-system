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
import { parseCoordinates } from '../utils/locationUtils';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

const OfficerDashboardPage = () => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Filters & View State
  const tabFromUrl = searchParams.get('tab') || 'ALL';
  const categoryFromUrl = searchParams.get('category') || 'ALL';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [departments, setDepartments] = useState([]);

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

  // Derived Operational Counts (100% Data-Driven)
  const needsAssignmentCount = useMemo(() => {
    return incidents.filter(i => !i.assigned_officer_id && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  }, [incidents]);

  const slaAtRiskCount = useMemo(() => {
    return incidents.filter(i => {
      if (i.status === 'RESOLVED' || i.status === 'CLOSED') return false;
      if (!i.sla_deadline) return false;
      const remainingMs = new Date(i.sla_deadline).getTime() - Date.now();
      return remainingMs > 0 && remainingMs < 4 * 60 * 60 * 1000;
    }).length;
  }, [incidents]);

  const escalatedCount = useMemo(() => {
    return incidents.filter(i => i.status === 'ESCALATED' || i.status === 'SLA_BREACHED' || (i.current_level && i.current_level > 1)).length;
  }, [incidents]);

  const newReportsCount = useMemo(() => {
    return incidents.filter(i => i.status === 'OPEN').length;
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

  // Filtered Queue
  const filteredIncidents = useMemo(() => {
    return sortedIncidents.filter(inc => {
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
      if (activeTab === 'NEEDS_ASSIGNMENT') {
        if (inc.assigned_officer_id || inc.status === 'RESOLVED' || inc.status === 'CLOSED') return false;
      } else if (activeTab === 'SLA_RISK') {
        if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') return false;
        if (!inc.sla_deadline) return false;
        const remainingMs = new Date(inc.sla_deadline).getTime() - Date.now();
        if (remainingMs <= 0 || remainingMs >= 4 * 60 * 60 * 1000) return false;
      } else if (activeTab === 'ESCALATED') {
        if (inc.status !== 'ESCALATED' && inc.status !== 'SLA_BREACHED' && (!inc.current_level || inc.current_level <= 1)) return false;
      } else if (activeTab === 'IN_PROGRESS') {
        if (inc.status !== 'IN_PROGRESS') return false;
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
  }, [sortedIncidents, activeTab, selectedCategory, searchQuery]);

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
      {/* ---------------------------------------------------------------- */}
      {/* 1. OFFICER COMMAND CENTER HEADER (Soft Botanical Gradient)        */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="rounded-2xl p-6 shadow-md border border-[#1F5443]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white"
        style={{ background: 'linear-gradient(135deg, #1F5443, #2B7A5F)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C8EAD9] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Good evening, {user?.full_name || 'City Ward Officer'}.
          </h1>
          <p className="text-xs font-semibold text-[#E6F4ED] mt-1">
            {activeIncidentsCount} active incidents are currently being monitored across your ward.
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              showMap
                ? 'bg-[#349670] text-white border-[#5EB894] shadow-sm'
                : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>{showMap ? 'Hide Map' : 'View Map'}</span>
          </button>

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-white/15 text-white border border-white/25 hover:bg-white/25 transition-all disabled:opacity-50"
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
      {/* 2. PRIMARY ATTENTION STRIP (Soft Pastel Mint Surface)            */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-[#E6F4ED] rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
        <div>
          <h2 className="text-xs font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#9C621E]" />
            <span>ATTENTION REQUIRED</span>
          </h2>
          <p className="text-[11px] font-semibold text-[#4A7365]">
            Items requiring immediate operational action from you.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Pill 1: Needs Assignment */}
          <button
            type="button"
            onClick={() => handleTabChange('NEEDS_ASSIGNMENT')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeTab === 'NEEDS_ASSIGNMENT'
                ? 'bg-[#CEEADA] border-[#9C621E] ring-2 ring-[#9C621E]'
                : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#174437]">Needs Assignment</span>
              {needsAssignmentCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#9C621E] text-white">
                  {needsAssignmentCount}
                </span>
              ) : (
                <span className="text-xs font-bold text-[#216D51] flex items-center gap-1">None ✓</span>
              )}
            </div>
            <p className="text-[10px] text-[#4A7365] font-medium truncate">Unassigned workorders</p>
          </button>

          {/* Pill 2: SLA At Risk */}
          <button
            type="button"
            onClick={() => handleTabChange('SLA_RISK')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeTab === 'SLA_RISK'
                ? 'bg-[#CEEADA] border-[#A6473D] ring-2 ring-[#A6473D]'
                : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#174437]">SLA At Risk</span>
              {slaAtRiskCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A6473D] text-white">
                  {slaAtRiskCount}
                </span>
              ) : (
                <span className="text-xs font-bold text-[#216D51] flex items-center gap-1">None ✓</span>
              )}
            </div>
            <p className="text-[10px] text-[#4A7365] font-medium truncate">Expiring within 4 hours</p>
          </button>

          {/* Pill 3: Escalated */}
          <button
            type="button"
            onClick={() => handleTabChange('ESCALATED')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeTab === 'ESCALATED'
                ? 'bg-[#CEEADA] border-[#734785] ring-2 ring-[#734785]'
                : 'bg-[#DCF0E6] hover:bg-[#CEEADA] border-[#B8E0CB]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#174437]">Escalated</span>
              {escalatedCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#734785] text-white">
                  {escalatedCount}
                </span>
              ) : (
                <span className="text-xs font-bold text-[#216D51] flex items-center gap-1">None ✓</span>
              )}
            </div>
            <p className="text-[10px] text-[#4A7365] font-medium truncate">Advanced to AEE/Comm.</p>
          </button>

          {/* Pill 4: New Reports */}
          <button
            type="button"
            onClick={() => handleTabChange('ALL')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeTab === 'ALL'
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
                <span className="text-xs font-bold text-[#216D51] flex items-center gap-1">None ✓</span>
              )}
            </div>
            <p className="text-[10px] text-[#4A7365] font-medium truncate">Fresh citizen submissions</p>
          </button>
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
              INCIDENT WORK QUEUE
            </h2>
            <p className="text-xs font-semibold text-[#4A7365]">
              Prioritized incidents requiring municipal action ({filteredIncidents.length} items visible).
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

            {/* Segmented Control Filters */}
            <div className="flex items-center gap-1 p-1 bg-[#CEEADA] border border-[#B8E0CB] rounded-xl text-[11px] font-bold overflow-x-auto">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'NEEDS_ASSIGNMENT', label: 'Needs Assignment' },
                { key: 'SLA_RISK', label: 'SLA Risk' },
                { key: 'ESCALATED', label: 'Escalated' },
                { key: 'IN_PROGRESS', label: 'In Progress' },
                { key: 'RESOLVED', label: 'Resolved' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
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

        {/* Error Notification */}
        {error && (
          <div className="m-4 p-4 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] text-xs font-bold text-[#A6473D] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Queue Items */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#349670] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#4A7365]">Loading operational incidents from database...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#D5EFE1] text-[#216D51] flex items-center justify-center mx-auto border border-[#B8E0CB]">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1F5443]">
              {selectedCategory !== 'ALL' ? `No ${selectedCategory.replace('_', ' ')} Incidents Found` : 'No Incidents Found'}
            </h3>
            <p className="text-xs font-semibold text-[#4A7365] max-w-sm mx-auto">
              {selectedCategory !== 'ALL'
                ? `No incidents in this category currently match the active filters.`
                : activeTab === 'ALL'
                ? 'All active workorders in your ward are clear.'
                : `No active incidents currently match the '${activeTab.replace('_', ' ')}' filter.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#B8E0CB]/60">
            {filteredIncidents.map(inc => {
              const reportCount = inc.incident_reports ? inc.incident_reports.length : 1;
              const primaryReport = inc.incident_reports?.find(r => r.is_primary)?.reports || inc.incident_reports?.[0]?.reports;
              const imageUrl = primaryReport?.image_url || '/placeholder-incident.jpg';
              const coords = parseCoordinates(inc.location);

              const levelLabel = inc.current_level === 3 ? 'Commissioner • Level 3' : inc.current_level === 2 ? 'AEE • Level 2' : 'Ward Officer • Level 1';
              const officerAssigned = inc.assigned_officer_id ? 'Assigned Officer' : 'Unassigned';
              const deptName = inc.departments?.name || 'Municipal Department';

              return (
                <div
                  key={inc.id}
                  className="p-5 bg-[#DCF0E6] hover:bg-[#CEEADA] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                >
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

                        {inc.current_level > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EFE3F5] text-[#734785] border border-[#DCBFEC]">
                            LEVEL {inc.current_level}
                          </span>
                        )}
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
                        <div>
                          <span className="text-[#75998C] font-bold uppercase tracking-wider text-[9px] mr-1">OFFICER:</span>
                          <span className={`font-bold ${inc.assigned_officer_id ? 'text-[#216D51]' : 'text-[#9C621E]'}`}>
                            {officerAssigned}
                          </span>
                        </div>
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
                      className="px-4 py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-extrabold text-xs shadow-2xs transition-all flex items-center gap-1.5 shrink-0 group-hover:scale-[1.02]"
                    >
                      <span>Open Incident</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
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
