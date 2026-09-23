import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Play,
  CheckCircle2,
  Building2,
  Activity,
  Users,
  Check,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  History
} from 'lucide-react';
import { incidentApi } from '../api/incidentApi';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaTimer from '../components/SlaTimer';
import InteractiveMap from '../components/InteractiveMap';
import EscalationModal from '../components/EscalationModal';
import ResolutionModal from '../components/ResolutionModal';
import AssignTeamModal from '../components/AssignTeamModal';
import { parseCoordinates } from '../utils/locationUtils';
import { getResponsibilityForIncident } from '../config/responsibilityMatrix';

const OfficerIncidentDetailPage = () => {
  const { incidentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await incidentApi.getIncidentById(incidentId);
      if (res?.success && res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load incident details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      const res = await incidentApi.updateIncidentStatus(incidentId, { status: 'IN_PROGRESS' });
      if (res?.success) {
        fetchIncidentDetails();
      }
    } catch (err) {
      alert('Error updating status: ' + (err.message || 'Failed to update status.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Authoritative data destructuring
  const incident = data?.incident;
  const reports = data?.reports || [];
  const status_history = data?.status_history || [];
  const resolution_evidence = data?.resolution_evidence || [];
  const escalations = data?.escalations || [];

  const actualLevel = Number(incident?.current_level) || 1;
  const isResolved = incident?.status === 'RESOLVED' || incident?.status === 'CLOSED';

  const coords = useMemo(() => {
    return parseCoordinates(incident?.location);
  }, [incident?.location]);

  const latestResolution = resolution_evidence?.[0];

  const resp = useMemo(() => {
    return getResponsibilityForIncident(incident?.category, incident?.departments?.code);
  }, [incident?.category, incident?.departments?.code]);

  // Sourced chronological escalation records
  const l1ToL2Esc = useMemo(() => {
    return escalations?.find(e => e.to_level === 2) || (actualLevel >= 2 ? escalations[escalations.length - 1] : null);
  }, [escalations, actualLevel]);

  const l2ToL3Esc = useMemo(() => {
    return escalations?.find(e => e.to_level === 3) || (actualLevel >= 3 ? escalations[0] : null);
  }, [escalations, actualLevel]);

  // Clean concise display reasons (never fabricated; from real records)
  const formatShortReason = (reasonText) => {
    if (!reasonText) return 'SLA breached';
    const lower = reasonText.toLowerCase();
    if (lower.includes('sla') && (lower.includes('breach') || lower.includes('exceeded') || lower.includes('missed'))) {
      return 'SLA breached';
    }
    if (lower.includes('resource')) return 'Additional resources required';
    if (lower.includes('approval')) return 'Higher approval required';
    if (lower.includes('severity') || lower.includes('critical')) return 'Critical severity escalation';
    return reasonText.length > 35 ? reasonText.substring(0, 35) + '...' : reasonText;
  };

  const l1ToL2ReasonShort = formatShortReason(l1ToL2Esc?.reason);
  const l2ToL3ReasonShort = formatShortReason(l2ToL3Esc?.reason);

  // Authoritative Unified Activity Timeline
  const timelineEvents = useMemo(() => {
    if (!incident) return [];
    const events = [];

    // 1. Initial Creation Event
    events.push({
      id: 'evt-created',
      type: 'CREATION',
      level: 1,
      timestamp: incident.created_at || incident.updated_at || new Date().toISOString(),
      title: 'Incident Registered',
      description: 'Citizen report received & assigned to field team',
      badgeColor: 'bg-[#1F5443] text-white'
    });

    // 2. Status History Updates
    (status_history || []).forEach((sh) => {
      let title = `Status: ${sh.new_status}`;
      let desc = sh.remarks || '';
      let badgeColor = 'bg-[#349670] text-white';
      let evtLvl = 1;

      if (sh.new_status === 'IN_PROGRESS') {
        title = 'Operational Work Started';
        desc = `Assigned to ${resp.operationalShort}`;
      } else if (sh.new_status === 'RESOLVED') {
        title = 'Workorder Resolved';
        desc = 'Resolution evidence verified';
        badgeColor = 'bg-[#2E7A5A] text-white';
      } else if (sh.new_status === 'CLOSED') {
        title = 'Workorder Closed';
        desc = 'Final administrative closure';
      } else if (sh.new_status === 'REOPENED') {
        title = 'Resolution Evidence Failed';
        desc = 'Before/after evidence did not match';
        badgeColor = 'bg-[#A6473D] text-white';
        evtLvl = 2;
      } else if (sh.new_status === 'PAUSED') {
        title = 'Workorder Paused';
        desc = 'Pending materials or site access';
        badgeColor = 'bg-[#A66A22] text-white';
      } else if (sh.new_status === 'SLA_BREACHED') {
        title = 'SLA Breached';
        desc = 'Operational resolution timeframe missed';
        badgeColor = 'bg-[#A6473D] text-white';
        evtLvl = actualLevel;
      }

      events.push({
        id: `evt-sh-${sh.id}`,
        type: 'STATUS',
        level: evtLvl,
        timestamp: sh.created_at,
        title,
        description: desc,
        badgeColor
      });
    });

    // 3. Escalations
    (escalations || []).forEach((esc) => {
      const toLvl = esc.to_level;
      const isL3 = toLvl === 3;
      events.push({
        id: `evt-esc-${esc.id}`,
        type: 'ESCALATION',
        level: toLvl,
        timestamp: esc.triggered_at,
        title: isL3 ? 'Escalated to Senior Review' : 'Escalated to Supervisory Review',
        description: `Reason: ${formatShortReason(esc.reason)}`,
        badgeColor: isL3 ? 'bg-[#A6473D] text-white' : 'bg-[#734785] text-white',
        isEscalationCard: true
      });
    });

    // 4. Final SLA Breach if incident is terminal
    if (incident.status === 'SLA_BREACHED' && actualLevel >= 3) {
      events.push({
        id: 'evt-final-breach',
        type: 'FINAL_BREACH',
        level: 3,
        timestamp: incident.updated_at || new Date().toISOString(),
        title: 'Terminal SLA Breach',
        description: 'Level 3 SLA expired. Terminal municipal tier reached.',
        badgeColor: 'bg-[#A6473D] text-white',
        isEscalationCard: true
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events;
  }, [incident, status_history, escalations, resp, actualLevel]);

  // Loading & Error States
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F0F8F5]">
        <div className="w-8 h-8 border-3 border-[#349670] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center space-y-4 bg-[#F0F8F5] min-h-screen">
        <AlertTriangle className="w-10 h-10 text-[#A6473D] mx-auto" />
        <h2 className="text-base font-bold text-[#1F5443]">
          {error ? 'Unable to Load Incident' : 'Incident Not Found'}
        </h2>
        <p className="text-xs text-[#4A7365]">{error || 'The requested incident workorder does not exist.'}</p>
        <div className="flex items-center justify-center gap-3">
          {error && (
            <button
              onClick={fetchIncidentDetails}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#349670] text-white font-bold text-xs hover:bg-[#2B8260] cursor-pointer shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
          <Link to="/officer/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#B8E0CB] bg-white text-[#1F5443] font-bold text-xs hover:bg-[#E6F4ED] shadow-xs transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Command Center</span>
          </Link>
        </div>
      </div>
    );
  }

  const targetWindowLabel = incident.priority_level === 'CRITICAL'
    ? '12h Target'
    : incident.priority_level === 'HIGH'
    ? '24h Target'
    : incident.priority_level === 'LOW'
    ? '168h Target'
    : '72h Target';

  // Map markers array for InteractiveMap
  const mapMarkers = [{
    id: incident.id,
    position: coords,
    title: `${incident.category || 'Incident'} (${reports.length} Reports)`,
    address: incident.address || 'Davangere',
    status: incident.status
  }];

  return (
    <div className="space-y-5 pb-16 select-none w-full max-w-[1400px] mx-auto">
      {/* ---------------------------------------------------------------------------------- */}
      {/* 1. INCIDENT HEADER (AUTHORITATIVE IDENTITY, ID, PRIORITY, STATUS, ESCALATE)          */}
      {/* ---------------------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#B8E0CB] shadow-xs">
        <div className="space-y-1.5">
          <Link to="/officer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#349670] hover:text-[#2B8260] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Command Center</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#1F5443] tracking-tight uppercase">
              {incident.category || 'Civic Incident'}
            </h1>
            <PriorityBadge priority={incident.priority_level} score={incident.priority_score} />
            <StatusBadge status={incident.status} />
          </div>
          <p className="text-xs font-mono text-[#75998C]">Incident ID: #{incident.id.slice(0, 8)}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowEscalateModal(true)}
            disabled={isResolved || actualLevel >= 3}
            className="px-3.5 py-2 rounded-xl border border-[#DCBFEC] bg-[#EFE3F5] text-[#734785] font-extrabold text-xs hover:bg-[#E2D2EA] transition-all disabled:opacity-40 cursor-pointer shadow-xs"
          >
            Manual Escalate
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------------------- */}
      {/* 2. PRIMARY OPERATIONAL 2-COLUMN WORKSPACE                                           */}
      {/* LEFT COLUMN: ~70-75%                                                               */}
      {/* RIGHT COLUMN: ~25-30% (300-340px)                                                  */}
      {/* ---------------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        
        {/* ============================================================================== */}
        {/* LEFT COLUMN: WORKSPACE CONTENT BASED AUTHORITATIVELY ON actualLevel            */}
        {/* ============================================================================== */}
        <div className="space-y-5">
          
          {/* LEVEL WORKSPACE / CONSOLE HEADER */}
          {actualLevel === 1 ? (
            /* LEVEL 1: OPERATIONAL RESOLUTION WORKBENCH */
            <div className="bg-[#E6F4ED] rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2E7A5A]">
                  OPERATIONS · FIELD RESOLUTION
                </span>
                <h2 className="text-base font-black text-[#1F5443] tracking-tight">
                  Field Resolution Workbench
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#B8E0CB] space-y-1">
                  <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">CURRENT RESPONSIBILITY</span>
                  <span className="text-xs font-black text-[#174437] block">{resp.operationalRole}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#B8E0CB] space-y-1">
                  <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">REQUIRED ACTION</span>
                  <span className="text-xs font-black text-[#174437] block">
                    {isResolved
                      ? 'Workorder resolved (No action)'
                      : incident.status === 'IN_PROGRESS'
                      ? 'Execute repair & submit evidence'
                      : incident.status === 'REOPENED'
                      ? 'Resolve issue & resubmit evidence'
                      : 'Start operational work'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#B8E0CB] space-y-1">
                  <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">DEPARTMENT</span>
                  <span className="text-xs font-black text-[#174437] block truncate">
                    {incident.departments?.name || resp.departmentName}
                  </span>
                </div>
              </div>
            </div>
          ) : actualLevel === 2 ? (
            /* LEVEL 2: SUPERVISORY INTERVENTION CONSOLE (Actual Level = 2) */
            <div className="bg-[#EFE3F5] rounded-2xl p-5 border border-[#DCBFEC] shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#734785]">
                  L2 · SUPERVISORY INTERVENTION
                </span>
                <h2 className="text-base font-black text-[#3B1F4A] tracking-tight">
                  Supervisory Intervention Console
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#DCBFEC] space-y-1">
                  <span className="text-[10px] font-bold text-[#734785] uppercase tracking-wider block">ESCALATED FROM</span>
                  <span className="text-xs font-black text-[#174437] block">L1 · {resp.operationalShort}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#DCBFEC] space-y-1">
                  <span className="text-[10px] font-bold text-[#734785] uppercase tracking-wider block">ESCALATION REASON</span>
                  <span className="text-xs font-black text-[#4A205E] block">
                    {l1ToL2ReasonShort}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#DCBFEC] space-y-1">
                  <span className="text-[10px] font-bold text-[#734785] uppercase tracking-wider block">CURRENT SUPERVISOR</span>
                  <span className="text-xs font-black text-[#734785] block truncate">{resp.supervisoryRole}</span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#DCBFEC] flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#734785] uppercase tracking-wider block">SUPERVISORY INTERVENTION</span>
                  <span className="font-black text-[#174437]">
                    {isResolved ? 'Supervisory closure verified' : 'Review unresolved operational work and coordinate field resolution'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* LEVEL 3: SENIOR ADMINISTRATIVE OVERSIGHT CONSOLE (Actual Level = 3) */
            <div className="bg-[#FAECEB] rounded-2xl p-5 border border-[#F3C5BF] shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#A6473D]">
                  L3 · SENIOR ADMINISTRATIVE OVERSIGHT
                </span>
                <h2 className="text-base font-black text-[#5C1D1D] tracking-tight">
                  Executive Oversight Console
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#F3C5BF] space-y-1">
                  <span className="text-[10px] font-bold text-[#A6473D] uppercase tracking-wider block">ESCALATED FROM</span>
                  <span className="text-xs font-black text-[#174437] block">L2 · {resp.supervisoryShort}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#F3C5BF] space-y-1">
                  <span className="text-[10px] font-bold text-[#A6473D] uppercase tracking-wider block">SENIOR REASON</span>
                  <span className="text-xs font-black text-[#7A2A22] block">
                    {l2ToL3ReasonShort}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#F3C5BF] space-y-1">
                  <span className="text-[10px] font-bold text-[#A6473D] uppercase tracking-wider block">SENIOR AUTHORITY</span>
                  <span className="text-xs font-black text-[#7A2A22] block truncate">{resp.seniorAuthority}</span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#F3C5BF] space-y-1 text-xs">
                <span className="text-[10px] font-bold text-[#A6473D] uppercase tracking-wider block">EXECUTIVE DIRECTIVE</span>
                <span className="font-black text-[#174437] block">
                  {isResolved ? 'Executive resolution verified & closed' : 'Persistent SLA breach across tiers. Executive resolution directive required.'}
                </span>
              </div>
            </div>
          )}

          {/* L1: SIDE-BY-SIDE HORIZONTAL COMPOSITION (REPORTED ISSUE + REPORTED LOCATION) */}
          {actualLevel === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* REPORTED ISSUE */}
              <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#349670]" />
                      <span>REPORTED ISSUE</span>
                    </h3>
                    <span className="text-[10px] font-mono text-[#75998C]">
                      {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                    </span>
                  </div>

                  {reports.length > 0 ? (
                    <div className="space-y-2.5">
                      {reports.slice(0, 1).map((rep, idx) => (
                        <div key={rep.id || idx} className="space-y-2">
                          {rep.image_url && (
                            <div className="relative rounded-xl overflow-hidden border border-[#B8E0CB] bg-[#E6F4ED] h-44 flex items-center justify-center">
                              <img
                                src={rep.image_url}
                                alt="Citizen Report Evidence"
                                className="w-full h-full object-cover rounded-xl"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'; }}
                              />
                            </div>
                          )}

                          {rep.description && (
                            <p className="text-xs text-[#174437] font-medium bg-[#F0F8F5] p-2.5 rounded-lg border border-[#B8E0CB]/60">
                              {rep.description}
                            </p>
                          )}

                          {rep.voice_transcript && (
                            <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 text-xs text-[#174437]">
                              <span className="text-[9px] font-bold text-[#216D51] uppercase tracking-wider block">VOICE TRANSCRIPT</span>
                              <p className="italic text-[11px]">"{rep.voice_transcript}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#75998C]">No citizen report description attached.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#B8E0CB]/40 text-[10px] text-[#75998C] font-mono">
                  Submitted: {new Date(incident.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* REPORTED LOCATION */}
              <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#349670]" />
                      <span>REPORTED LOCATION</span>
                    </h3>
                    <span className="text-[10px] font-mono text-[#75998C]">
                      {coords?.lat && coords?.lng ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Coordinates Available'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 text-xs">
                    <span className="text-[9px] font-bold text-[#75998C] uppercase tracking-wider block">ADDRESS</span>
                    <p className="font-bold text-[#174437] mt-0.5 truncate">
                      {incident.address || `Davangere Municipal Area (${coords?.lat || '14.46'}, ${coords?.lng || '75.92'})`}
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[#B8E0CB]">
                    <InteractiveMap markers={mapMarkers} center={coords} height="176px" zoom={15} />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#B8E0CB]/40 text-[10px] text-[#75998C] font-mono">
                  Spatial Reference: Verified PostGIS Boundary
                </div>
              </div>
            </div>
          )}

          {/* L2 / L3 ACTUAL: SUPPORTING CONTEXT (COMPACT REPORT & LOCATION) */}
          {(actualLevel === 2 || actualLevel >= 3) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supporting Citizen Report */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-black/10 shadow-xs space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[#1F5443]">
                  <Users className="w-4 h-4 text-[#349670]" />
                  <span>SUPPORTING CITIZEN CONTEXT</span>
                </h3>
                {reports[0]?.image_url && (
                  <div className="relative rounded-xl overflow-hidden border border-black/10 bg-[#F0F8F5] h-32 flex items-center justify-center">
                    <img
                      src={reports[0].image_url}
                      alt="Citizen Evidence"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'; }}
                    />
                  </div>
                )}
                {reports[0]?.description && (
                  <p className="text-xs text-[#174437] font-medium line-clamp-2 bg-[#F0F8F5] p-2 rounded-lg border border-black/5">
                    {reports[0].description}
                  </p>
                )}
              </div>

              {/* Supporting Location */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-black/10 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[#1F5443]">
                    <MapPin className="w-4 h-4 text-[#349670]" />
                    <span>LOCATION CONTEXT</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[#75998C]">
                    {coords?.lat && coords?.lng ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : ''}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#174437] truncate bg-[#F0F8F5] p-2 rounded-lg border border-black/5">
                  {incident.address || 'Davangere Municipal Area'}
                </p>
                <div className="rounded-xl overflow-hidden border border-black/10">
                  <InteractiveMap markers={mapMarkers} center={coords} height="120px" zoom={14} />
                </div>
              </div>
            </div>
          )}

          {/* RESOLUTION EVIDENCE (LEVEL-AWARE PRESENTATION) */}
          {latestResolution && (
            actualLevel === 1 ? (
              /* L1: Full Operational Evidence Workspace */
              <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
                <h3 className="text-xs font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#216D51]" />
                  <span>RESOLUTION EVIDENCE (HORIZONTAL COMPARISON)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">BEFORE REPAIR</span>
                    <img
                      src={latestResolution.before_image_url || '/placeholder-before.jpg'}
                      alt="Before Repair"
                      className="w-full h-40 object-cover rounded-xl border border-[#B8E0CB] bg-[#E6F4ED]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">AFTER REPAIR</span>
                    <img
                      src={latestResolution.after_image_url || '/placeholder-after.jpg'}
                      alt="After Repair"
                      className="w-full h-40 object-cover rounded-xl border border-[#B8E0CB] bg-[#E6F4ED]"
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs space-y-0.5 ${
                  latestResolution.ai_verification_passed
                    ? 'bg-[#D5EFE1] border-[#B8E0CB] text-[#216D51]'
                    : 'bg-[#FAECEB] border-[#F3C5BF] text-[#7A2A22]'
                }`}>
                  <span className="font-extrabold block">
                    AI Verification: {latestResolution.ai_verification_passed ? 'Passed ✓' : 'Failed'}
                  </span>
                  {latestResolution.comparison_notes && (
                    <p className="text-[11px] italic">{latestResolution.comparison_notes}</p>
                  )}
                </div>
              </div>
            ) : actualLevel === 2 ? (
              /* L2: Supporting Evidence */
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCBFEC] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#553363] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#734785]" />
                    <span>SUPPORTING RESOLUTION EVIDENCE</span>
                  </h3>
                  <button
                    onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
                    className="px-2.5 py-1 rounded-lg border border-[#DCBFEC] bg-[#EFE3F5] text-[#553363] text-[10px] font-bold uppercase tracking-wider hover:bg-[#E2D2EA] transition-all cursor-pointer"
                  >
                    {showEvidenceDetails ? 'Hide Comparison' : 'View Comparison'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F3FA] border border-[#DCBFEC]/60 text-xs text-[#553363] flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <span className="font-extrabold block">
                      AI Verification: {latestResolution.ai_verification_passed ? 'Passed ✓' : 'Failed'}
                    </span>
                    {latestResolution.comparison_notes && (
                      <p className="text-[11px] text-[#6E4E7A] italic max-w-lg">{latestResolution.comparison_notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#886994]">
                    {new Date(latestResolution.created_at || incident.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {showEvidenceDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#886994] uppercase tracking-wider">BEFORE REPAIR</span>
                      <img
                        src={latestResolution.before_image_url || '/placeholder-before.jpg'}
                        alt="Before"
                        className="w-full h-36 object-cover rounded-xl border border-[#DCBFEC] bg-[#E6F4ED]"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#886994] uppercase tracking-wider">AFTER REPAIR</span>
                      <img
                        src={latestResolution.after_image_url || '/placeholder-after.jpg'}
                        alt="After"
                        className="w-full h-36 object-cover rounded-xl border border-[#DCBFEC] bg-[#E6F4ED]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* L3: Supporting History */
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F3C5BF] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#7A2A22] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A6473D]" />
                    <span>SUPPORTING RESOLUTION HISTORY</span>
                  </h3>
                  <button
                    onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
                    className="px-2.5 py-1 rounded-lg border border-[#F3C5BF] bg-[#FAECEB] text-[#7A2A22] text-[10px] font-bold uppercase tracking-wider hover:bg-[#F5DBD8] transition-all cursor-pointer"
                  >
                    {showEvidenceDetails ? 'Hide Comparison' : 'View Comparison'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#FBF2F1] border border-[#F3C5BF]/60 text-xs text-[#7A2A22] flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <span className="font-extrabold block">
                      AI Verification: {latestResolution.ai_verification_passed ? 'Passed ✓' : 'Failed'}
                    </span>
                    {latestResolution.comparison_notes && (
                      <p className="text-[11px] text-[#8C3A33] italic max-w-lg">{latestResolution.comparison_notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#A35952]">
                    {new Date(latestResolution.created_at || incident.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {showEvidenceDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A35952] uppercase tracking-wider">BEFORE REPAIR</span>
                      <img
                        src={latestResolution.before_image_url || '/placeholder-before.jpg'}
                        alt="Before"
                        className="w-full h-36 object-cover rounded-xl border border-[#F3C5BF] bg-[#E6F4ED]"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A35952] uppercase tracking-wider">AFTER REPAIR</span>
                      <img
                        src={latestResolution.after_image_url || '/placeholder-after.jpg'}
                        alt="After"
                        className="w-full h-36 object-cover rounded-xl border border-[#F3C5BF] bg-[#E6F4ED]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ACTIVITY & ESCALATION TIMELINE */}
          <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#B8E0CB]/50 pb-3">
              <div>
                <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                  actualLevel === 3 ? 'text-[#7A2A22]' : actualLevel === 2 ? 'text-[#553363]' : 'text-[#1F5443]'
                }`}>
                  <Activity className={`w-4 h-4 ${
                    actualLevel === 3 ? 'text-[#A6473D]' : actualLevel === 2 ? 'text-[#734785]' : 'text-[#349670]'
                  }`} />
                  <span>
                    {actualLevel === 3 ? 'SENIOR ESCALATION' : actualLevel === 2 ? 'SUPERVISORY ESCALATION' : 'OPERATIONAL ACTIVITY'}
                  </span>
                </h3>
                <p className="text-[11px] text-[#75998C] font-semibold mt-0.5">
                  {actualLevel === 3 ? 'Administrative escalation and oversight chain' : actualLevel === 2 ? 'Escalation reason and intervention history' : 'Field work and resolution progress'}
                </p>
              </div>

              {actualLevel >= 2 && (
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="px-2.5 py-1 rounded-lg border border-[#B8E0CB] bg-[#F0F8F5] hover:bg-[#E6F4ED] text-[#1F5443] text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <History className="w-3.5 h-3.5 text-[#349670]" />
                  <span>{showFullHistory ? 'Hide Full History' : 'View Full History'}</span>
                </button>
              )}
            </div>

            {/* Content for Level 1 */}
            {actualLevel === 1 && (
              <div className="space-y-2.5">
                {timelineEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-[#B8E0CB]/60 bg-[#F0F8F5] flex items-start gap-3 transition-all"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 ${evt.badgeColor || 'bg-[#349670] text-white'}`}>
                      ●
                    </div>
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#174437] block">{evt.title}</span>
                        {evt.description && (
                          <p className="text-[11px] text-[#4A7365] font-medium">{evt.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#75998C] shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Content for Level 2 */}
            {actualLevel === 2 && (
              <div className="space-y-2">
                {/* L1 Creation summary */}
                <div className="p-3 rounded-xl border border-[#DCBFEC]/60 bg-[#F8F3FA] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#349670] text-white">
                    L1
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#351E40] block">L1 Operational Handling</span>
                      <p className="text-[11px] text-[#6E4E7A] font-medium">
                        Citizen report registered & assigned to {resp.operationalRole}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#886994] shrink-0">
                      {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Escalation to L2 record */}
                <div className="p-3 rounded-xl border border-[#DCBFEC] bg-[#EFE3F5] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#734785] text-white">
                    L2
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#351E40] block">Escalated to Supervisory Review</span>
                      <p className="text-[11px] text-[#553363] font-medium">
                        Reason: {l1ToL2ReasonShort}
                      </p>
                    </div>
                    {l1ToL2Esc?.triggered_at && (
                      <span className="text-[10px] font-mono text-[#886994] shrink-0">
                        {new Date(l1ToL2Esc.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active L2 Supervisory Review */}
                <div className="p-3 rounded-xl border border-[#DCBFEC]/60 bg-[#F8F3FA] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#734785] text-white">
                    L2
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#351E40] block">
                        {isResolved ? 'Supervisory Resolution Approved' : 'Supervisory Review Active'}
                      </span>
                      <p className="text-[11px] text-[#6E4E7A] font-medium">
                        {isResolved ? 'Incident verified and closed under supervisory authority.' : `Active supervisory oversight by ${resp.supervisoryRole}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#886994] shrink-0">
                      {new Date(incident.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Level 3 */}
            {actualLevel >= 3 && (
              <div className="space-y-2">
                {/* L1 Operational summary */}
                <div className="p-3 rounded-xl border border-[#F3C5BF]/60 bg-[#FBF2F1] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#349670] text-white">
                    L1
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#541B16] block">L1 Operational Handling</span>
                      <p className="text-[11px] text-[#8C3A33] font-medium">
                        Initial operational resolution attempt under {resp.operationalRole}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A35952] shrink-0">
                      {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* L2 Escalation */}
                <div className="p-3 rounded-xl border border-[#DCBFEC] bg-[#EFE3F5] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#734785] text-white">
                    L2
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#351E40] block">L2 Supervisory Intervention</span>
                      <p className="text-[11px] text-[#553363] font-medium">
                        Supervisory coordination under {resp.supervisoryRole}
                      </p>
                    </div>
                    {l1ToL2Esc?.triggered_at && (
                      <span className="text-[10px] font-mono text-[#886994] shrink-0">
                        {new Date(l1ToL2Esc.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* L3 Escalation */}
                <div className="p-3 rounded-xl border border-[#F3C5BF] bg-[#FAECEB] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#A6473D] text-white">
                    L3
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#541B16] block">Escalated to Senior Review</span>
                      <p className="text-[11px] text-[#7A2A22] font-medium">
                        Reason: {l2ToL3ReasonShort}
                      </p>
                    </div>
                    {l2ToL3Esc?.triggered_at && (
                      <span className="text-[10px] font-mono text-[#A35952] shrink-0">
                        {new Date(l2ToL3Esc.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* L3 Senior Administrative Review */}
                <div className="p-3 rounded-xl border border-[#F3C5BF]/60 bg-[#FBF2F1] flex items-start gap-3 transition-all">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-[#A6473D] text-white">
                    L3
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#541B16] block">
                        {isResolved ? 'Senior Resolution Verified' : 'Senior Administrative Review Active'}
                      </span>
                      <p className="text-[11px] text-[#8C3A33] font-medium">
                        {isResolved ? 'Executive resolution recorded and verified.' : `Senior administrative oversight active under ${resp.seniorAuthority}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A35952] shrink-0">
                      {new Date(incident.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FULL INCIDENT HISTORY (EXPANDABLE ON L2/L3) */}
            {showFullHistory && actualLevel >= 2 && (
              <div className="mt-4 pt-4 border-t border-[#B8E0CB] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1F5443] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#349670]" />
                    <span>Complete Chronological Audit Trail</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#75998C]">
                    {timelineEvents.length} Records
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {timelineEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                        evt.isEscalationCard
                          ? evt.level === 3
                            ? 'bg-[#FAECEB] border-[#F3C5BF]'
                            : 'bg-[#EFE3F5] border-[#DCBFEC]'
                          : 'bg-[#F0F8F5] border-[#B8E0CB]/60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5 ${evt.badgeColor}`}>
                        {evt.level === 3 ? 'L3' : evt.level === 2 ? 'L2' : '●'}
                      </div>
                      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-[#174437] block">{evt.title}</span>
                          {evt.description && (
                            <p className="text-[10px] text-[#4A7365] font-medium">{evt.description}</p>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-[#75998C] shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================================== */}
        {/* RIGHT COLUMN: CONTEXTUAL & ACTION RAIL (300-340px)                             */}
        {/* ============================================================================== */}
        <div className="space-y-4">
          
          {/* 1. ACTION PANEL (AUTHORITATIVELY DRIVEN BY actualLevel) */}
          <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#1F5443] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#349670]" />
              <span>
                {actualLevel === 1 ? 'NEXT ACTION' : actualLevel === 2 ? 'SUPERVISORY ACTION' : 'SENIOR ACTION'}
              </span>
            </div>

            {actualLevel === 1 ? (
              /* L1 Primary Actions */
              !incident.department_id ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#4A7365]">Department assignment required for field dispatch.</p>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Assign Department</span>
                  </button>
                </div>
              ) : incident.status === 'OPEN' ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#4A7365]">Ready for operational field execution.</p>
                  <button
                    onClick={handleStartWork}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Work</span>
                  </button>
                </div>
              ) : incident.status === 'IN_PROGRESS' || incident.status === 'REOPENED' ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#4A7365]">Submit AFTER-repair evidence photo.</p>
                  <button
                    onClick={() => setShowResolutionModal(true)}
                    className="w-full py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Resolution</span>
                  </button>
                </div>
              ) : isResolved ? (
                <div className="p-3 text-center space-y-1 rounded-xl bg-[#E6F4ED] border border-[#B8E0CB]">
                  <Check className="w-5 h-5 text-[#2E7A5A] mx-auto" />
                  <span className="text-xs font-bold text-[#1F5443] block">Resolved & Verified</span>
                </div>
              ) : null
            ) : actualLevel === 2 ? (
              /* L2 Supervisory Actions */
              <div className="space-y-2">
                <p className="text-xs text-[#553363] font-bold">Review unresolved case and coordinate resolution.</p>
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="w-full py-2.5 rounded-xl bg-[#734785] hover:bg-[#5E366E] text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Verify / Resolve Case</span>
                </button>
              </div>
            ) : (
              /* L3 Senior Actions */
              <div className="space-y-2">
                <p className="text-xs text-[#7A2A22] font-bold">Review persistent escalation & senior oversight.</p>
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="w-full py-2.5 rounded-xl bg-[#A6473D] hover:bg-[#8A3B32] text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Executive Resolution Directive</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. SLA & TARGET DEADLINE */}
          <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">SLA & TARGET WINDOW</span>
              <span className="text-[11px] font-mono text-[#75998C] bg-[#F0F8F5] px-2 py-0.5 rounded-md border border-[#B8E0CB]/60">
                {targetWindowLabel}
              </span>
            </div>
            
            <div className="pt-0.5">
              <SlaTimer deadline={incident.sla_deadline} status={incident.status} />
            </div>

            {incident.sla_deadline && (
              <div className="pt-2 border-t border-[#B8E0CB]/50 flex items-center justify-between text-[11px] text-[#75998C]">
                <span>Deadline:</span>
                <span className="font-mono font-bold text-[#174437]">
                  {new Date(incident.sla_deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>

          {/* 3. CURRENT RESPONSIBILITY / CONTEXT (AUTHORITATIVE, NO DUPLICATION) */}
          <div className="bg-white rounded-2xl p-5 border border-[#B8E0CB] shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">CURRENT RESPONSIBILITY & CONTEXT</span>
            
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">ACTIVE TIER</span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  actualLevel === 3
                    ? 'bg-[#FAECEB] text-[#7A2A22] border border-[#F3C5BF]'
                    : actualLevel === 2
                    ? 'bg-[#EFE3F5] text-[#553363] border border-[#DCBFEC]'
                    : 'bg-[#E6F4ED] text-[#1F5443] border border-[#B8E0CB]'
                }`}>
                  Level {actualLevel}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 space-y-0.5">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">RESPONSIBLE OFFICIAL</span>
                <span className="font-bold text-[#174437] block truncate">
                  {actualLevel === 3 ? resp.seniorAuthority : actualLevel === 2 ? resp.supervisoryRole : resp.operationalRole}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 space-y-0.5">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">DEPARTMENT</span>
                <span className="font-bold text-[#174437] block truncate">
                  {incident.departments?.name || resp.departmentName}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">CITIZEN REPORTS</span>
                <span className="font-mono font-bold text-[#174437]">
                  {reports.length} {reports.length === 1 ? 'submission' : 'submissions'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F0F8F5] border border-[#B8E0CB]/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">REGISTERED</span>
                <span className="font-mono text-[11px] text-[#75998C]">
                  {new Date(incident.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignTeamModal
          incident={incident}
          departments={[]}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchIncidentDetails();
          }}
        />
      )}

      {showResolutionModal && (
        <ResolutionModal
          incident={incident}
          onClose={() => setShowResolutionModal(false)}
          onSuccess={() => {
            setShowResolutionModal(false);
            fetchIncidentDetails();
          }}
        />
      )}

      {showEscalateModal && (
        <EscalationModal
          incident={incident}
          onClose={() => setShowEscalateModal(false)}
          onSuccess={() => {
            setShowEscalateModal(false);
            fetchIncidentDetails();
          }}
        />
      )}
    </div>
  );
};

export default OfficerIncidentDetailPage;
