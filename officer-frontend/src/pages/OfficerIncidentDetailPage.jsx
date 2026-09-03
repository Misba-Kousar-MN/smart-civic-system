import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  Sparkles,
  MapPin,
  Clock,
  Play,
  AlertCircle,
  CheckCircle2,
  Building2,
  FileText,
  User,
  Shield,
  Activity,
  Volume2,
  Users,
  HardHat,
  ShieldAlert,
  Calendar,
  Check,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Layers
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

const OfficerIncidentDetailPage = () => {
  const { incidentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('civic_demo_mode') === 'true';
  });
  const [breachLoading, setBreachLoading] = useState(false);
  const [breachMessage, setBreachMessage] = useState('');

  const toggleDemoMode = () => {
    const nextVal = !demoMode;
    setDemoMode(nextVal);
    localStorage.setItem('civic_demo_mode', String(nextVal));
  };

  const handleSimulateSlaBreach = async () => {
    if (breachLoading) return;
    try {
      setBreachLoading(true);
      setBreachMessage('');
      const res = await incidentApi.simulateSlaBreach(incidentId);
      if (res?.success) {
        setBreachMessage(res.data?.message || res.message || 'SLA breach simulated successfully!');
        await fetchIncidentDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to simulate SLA breach.');
    } finally {
      setBreachLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F0F8F5]">
        <div className="w-8 h-8 border-3 border-[#349670] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.incident) {
    return (
      <div className="p-8 text-center space-y-4 bg-[#F0F8F5] min-h-screen">
        <AlertTriangle className="w-10 h-10 text-[#A6473D] mx-auto" />
        <h2 className="text-base font-bold text-[#1F5443]">Incident Not Found</h2>
        <p className="text-xs text-[#4A7365]">{error || 'The requested incident workorder does not exist.'}</p>
        <Link to="/officer/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#349670] text-white font-bold text-xs">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Command Center</span>
        </Link>
      </div>
    );
  }

  const { incident, reports = [], status_history = [], resolution_evidence = [], escalations = [] } = data;
  const coords = parseCoordinates(incident.location);
  const latestResolution = resolution_evidence?.[0];

  const isResolved = incident.status === 'RESOLVED' || incident.status === 'CLOSED';
  const isEscalated = incident.status === 'ESCALATED' || incident.status === 'SLA_BREACHED' || (incident.current_level && incident.current_level > 1);

  const levelRoleLabel = incident.current_level === 3 ? 'Commissioner • Level 3' : incident.current_level === 2 ? 'AEE • Level 2' : 'Ward Officer • Level 1';

  return (
    <div className="bg-[#F0F8F5] min-h-screen space-y-6 pb-16 select-none">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/officer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#349670] hover:text-[#2B8260] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Command Center</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[#1F5443] tracking-tight uppercase">
              {incident.category || 'Civic Incident'}
            </h1>
            <PriorityBadge priority={incident.priority_level} score={incident.priority_score} />
            <StatusBadge status={incident.status} />
          </div>
          <p className="text-xs font-mono text-[#75998C]">INCIDENT ID: #{incident.id}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={toggleDemoMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border shadow-xs ${
              demoMode
                ? 'bg-[#E09422] text-white border-[#F3DE9A] shadow-md ring-2 ring-white/40'
                : 'bg-white/80 text-[#75998C] border-[#B8E0CB] hover:bg-white'
            }`}
            title="Toggle Demo Mode for presentation"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DEMO: {demoMode ? 'ON' : 'OFF'}</span>
          </button>

          {demoMode && (
            <button
              onClick={handleSimulateSlaBreach}
              disabled={breachLoading || isResolved || (incident.status === 'SLA_BREACHED' && incident.current_level >= 3)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border shadow-md ${
                incident.status === 'SLA_BREACHED' && incident.current_level >= 3
                  ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                  : 'bg-[#A6473D] text-white hover:bg-[#8A3B32] border-[#C25B50] active:scale-98'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${breachLoading ? 'animate-spin' : ''}`} />
              <span>
                {breachLoading
                  ? 'Simulating Breach...'
                  : incident.status === 'SLA_BREACHED' && incident.current_level >= 3
                  ? 'Final Breach Reached (No L4)'
                  : (incident.current_level || 1) === 1
                  ? '⚡ Simulate SLA Breach (L1 → L2)'
                  : (incident.current_level || 1) === 2
                  ? '⚡ Simulate SLA Breach (L2 → L3)'
                  : '⚡ Simulate Final SLA Breach'}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowEscalateModal(true)}
            disabled={isResolved || incident.current_level >= 3}
            className="px-3.5 py-2 rounded-xl border border-[#DCBFEC] bg-[#EFE3F5] text-[#734785] font-extrabold text-xs hover:bg-[#E2D2EA] transition-all disabled:opacity-40"
          >
            Manual Escalate
          </button>
        </div>
      </div>

      {/* Demo Mode Notification / Banner */}
      {demoMode && (
        <div className="bg-[#FFF8E7] border border-[#F3DE9A] text-[#8C5E14] px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E09422] animate-ping shrink-0" />
            <span>
              DEMO MODE ACTIVE • 3-Level SLA Escalation Demonstration Sandbox Enabled
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono uppercase bg-[#F5E6BA] px-2.5 py-1 rounded-lg text-[#70490C]">
              Simulate Instant SLA Breach
            </span>
            <span className="text-[10px] font-mono uppercase bg-[#E6F4ED] border border-[#B8E0CB] px-2.5 py-1 rounded-lg text-[#1F5443]">
              Role: Ward Officer (Intact)
            </span>
          </div>
        </div>
      )}

      {/* State Banner */}
      {isEscalated && (
        <div className="bg-[#1F5443] text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-[#2B6D58]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#349670] border border-[#5EB894] flex items-center justify-center font-black text-lg text-white">
              L{incident.current_level}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#C8EAD9]">
                AUTOMATIC SLA ESCALATION ACTIVE
              </div>
              <div className="text-sm font-bold">
                {levelRoleLabel} is currently responsible for this overdue workorder.
              </div>
            </div>
          </div>
        </div>
      )}

      {incident.status === 'REOPENED' && (
        <div className="bg-[#FAECEB] border border-[#F3C5BF] text-[#A6473D] rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider">
              REOPENED FOR MANUAL OFFICER REVIEW
            </div>
            <div className="text-xs font-bold">
              AI verification failed or was unavailable. Incident remains active until evidence passes.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#349670]" />
              <span>INCIDENT OVERVIEW</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB]">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">LOCATION ADDRESS</span>
                <span className="text-xs font-bold text-[#174437] flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#349670] shrink-0" />
                  <span>{incident.address || `Location (${coords?.lat}, ${coords?.lng})`}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB]">
                <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">MUNICIPAL DEPARTMENT</span>
                <span className="text-xs font-bold text-[#174437] flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-[#349670] shrink-0" />
                  <span>{incident.departments?.name || 'Sanitation / Solid Waste'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* MUNICIPAL ESCALATION AUDIT TRAIL CARD */}
          <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#734785]" />
                <span>MUNICIPAL ESCALATION AUDIT TRAIL</span>
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#CEEADA] text-[#1F5443] border border-[#B8E0CB]">
                Current Tier: Level {incident.current_level || 1} • {levelRoleLabel}
              </span>
            </div>

            {/* Level Stepper Progression */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#DCF0E6] rounded-xl border border-[#B8E0CB]">
              <div className={`p-2.5 rounded-lg border text-center transition-all ${
                (incident.current_level || 1) >= 1
                  ? 'bg-[#CEEADA] border-[#349670] text-[#174437] ring-1 ring-[#349670]'
                  : 'bg-white/40 border-[#B8E0CB] text-[#75998C]'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">Level 1</span>
                <span className="text-xs font-extrabold block mt-0.5">Ward Officer</span>
                <span className="text-[9px] font-medium text-[#4A7365] block">Initial 48h SLA</span>
              </div>

              <div className={`p-2.5 rounded-lg border text-center transition-all ${
                (incident.current_level || 1) >= 2
                  ? 'bg-[#EFE3F5] border-[#734785] text-[#734785] ring-1 ring-[#734785]'
                  : 'bg-white/40 border-[#B8E0CB] text-[#75998C]'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">Level 2</span>
                <span className="text-xs font-extrabold block mt-0.5">AEE Senior</span>
                <span className="text-[9px] font-medium text-[#734785]/80 block">Fresh 24h SLA</span>
              </div>

              <div className={`p-2.5 rounded-lg border text-center transition-all ${
                (incident.current_level || 1) >= 3
                  ? incident.status === 'SLA_BREACHED'
                    ? 'bg-[#FAECEB] border-[#A6473D] text-[#A6473D] ring-1 ring-[#A6473D]'
                    : 'bg-[#F5F0D5] border-[#9C621E] text-[#9C621E] ring-1 ring-[#9C621E]'
                  : 'bg-white/40 border-[#B8E0CB] text-[#75998C]'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">Level 3</span>
                <span className="text-xs font-extrabold block mt-0.5">Commissioner</span>
                <span className="text-[9px] font-medium block">
                  {incident.status === 'SLA_BREACHED' ? 'Final SLA Breach (No L4)' : 'Fresh 12h SLA'}
                </span>
              </div>
            </div>

            {/* Detailed Events Timeline */}
            <div className="space-y-3 pt-1">
              {/* Event 1: Creation */}
              <div className="p-3.5 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB] flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#349670] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  L1
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#174437]">
                    <span>Incident Assigned at Level 1</span>
                    <span className="text-[#75998C] font-normal text-[11px]">
                      {new Date(incident.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4A7365]">
                    Initial municipal dispatch assigned to Ward Officer authority. Baseline municipal SLA resolution clock started.
                  </p>
                </div>
              </div>

              {/* Event 2+: Escalation records from database */}
              {escalations.length === 0 && incident.current_level === 1 && (
                <div className="text-center py-2 text-xs font-semibold text-[#75998C] italic">
                  No escalations recorded. Incident is operating within Level 1 baseline SLA.
                </div>
              )}

              {escalations.map((esc, i) => (
                <div key={esc.id || i} className="p-3.5 rounded-xl bg-[#EFE3F5] border border-[#DCBFEC] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#734785] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    L{esc.to_level}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#734785]">
                      <span>Level {esc.from_level} → Level {esc.to_level} Escalation</span>
                      <span className="text-[#75998C] font-normal text-[11px]">
                        {new Date(esc.triggered_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#553363] font-medium">
                      Reason: {esc.reason}
                    </p>
                    <div className="text-[10px] text-[#734785] font-bold">
                      Target Authority: {esc.to_level === 3 ? 'City Commissioner (Executive Level 3)' : 'Assistant Executive Engineer (Technical Level 2)'}
                    </div>
                  </div>
                </div>
              ))}

              {/* Final SLA Breach Event if Status is SLA_BREACHED at Level 3 */}
              {incident.status === 'SLA_BREACHED' && incident.current_level >= 3 && (
                <div className="p-3.5 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#A6473D] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    !
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#A6473D]">
                      <span>FINAL SLA BREACH REACHED</span>
                      <span className="text-[#A6473D]/80 font-normal text-[11px]">
                        {new Date(incident.updated_at || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A2A22] font-semibold">
                      Executive Level 3 SLA expired. Incident has reached Final SLA Breach. No higher municipal authority tier exists (Level 4 does not exist).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Reports Section */}
          <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#349670]" />
              <span>LINKED CITIZEN REPORTS ({reports.length})</span>
            </h3>

            <div className="space-y-4">
              {reports.map((rep, idx) => (
                <div key={rep.id || idx} className="p-4 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#174437]">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#349670] text-white text-[10px] flex items-center justify-center font-black">
                        #{idx + 1}
                      </span>
                      <span>Citizen Report</span>
                    </span>
                    <span className="text-[#75998C] font-normal">
                      {new Date(rep.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  {rep.image_url && (
                    <img
                      src={rep.image_url}
                      alt="Citizen Evidence"
                      className="w-full max-h-56 object-cover rounded-xl border border-[#B8E0CB] bg-[#E6F4ED]"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'; }}
                    />
                  )}

                  {rep.voice_transcript && (
                    <div className="p-3 rounded-xl bg-[#CEEADA] border border-[#B8E0CB] text-xs text-[#174437] space-y-1">
                      <span className="text-[10px] font-bold text-[#216D51] uppercase tracking-wider block">VOICE TRANSCRIPT</span>
                      <p className="italic">"{rep.voice_transcript}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BEFORE vs AFTER Evidence Section */}
          {latestResolution && (
            <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#216D51]" />
                <span>AI RESOLUTION EVIDENCE COMPARISON</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">BEFORE REPAIR</span>
                  <img
                    src={latestResolution.before_image_url || '/placeholder-before.jpg'}
                    alt="Before"
                    className="w-full h-44 object-cover rounded-xl border border-[#B8E0CB] bg-[#E6F4ED]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider">AFTER REPAIR</span>
                  <img
                    src={latestResolution.after_image_url || '/placeholder-after.jpg'}
                    alt="After"
                    className="w-full h-44 object-cover rounded-xl border border-[#B8E0CB] bg-[#E6F4ED]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#D5EFE1] border border-[#B8E0CB] text-xs text-[#216D51] space-y-1">
                <span className="font-extrabold block">AI VERIFICATION RESULT</span>
                <p>Status: {latestResolution.ai_verification_passed ? 'PASSED ✓' : 'FAILED / MANUAL REVIEW REQUIRED'}</p>
                <p>Confidence: {latestResolution.ai_confidence}%</p>
                <p className="text-[11px] italic">{latestResolution.comparison_notes}</p>
              </div>
            </div>
          )}

          {/* Interactive Map Preview */}
          <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-3">
            <h3 className="text-sm font-black text-[#1F5443] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#349670]" />
              <span>SPATIAL LOCATION MAP</span>
            </h3>
            <InteractiveMap incidents={[incident]} height="280px" />
          </div>
        </div>

        {/* Right Column (RECOMMENDED NEXT ACTION COMPONENT) */}
        <div className="space-y-6">
          <div className="bg-[#1F5443] text-white rounded-2xl p-6 shadow-md border border-[#2B6D58] space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-[#C8EAD9] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>RECOMMENDED NEXT ACTION</span>
            </div>

            {!incident.department_id ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#F5F0D5]">Department Assignment Required</h4>
                <p className="text-xs text-[#E6F4ED]">
                  Assign a municipal department to take responsibility for field dispatch.
                </p>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full py-3 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Assign Department</span>
                </button>
              </div>
            ) : incident.status === 'OPEN' ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#C8EAD9]">Ready to Start Work</h4>
                <p className="text-xs text-[#E6F4ED]">
                  Department assigned ({incident.departments?.name}). Start workorder execution.
                </p>
                <button
                  onClick={handleStartWork}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Work</span>
                </button>
              </div>
            ) : incident.status === 'IN_PROGRESS' ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#C8EAD9]">Resolution Evidence Required</h4>
                <p className="text-xs text-[#E6F4ED]">
                  Upload AFTER repair evidence photo for AI verification check.
                </p>
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="w-full py-3 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Resolution</span>
                </button>
              </div>
            ) : isResolved ? (
              <div className="space-y-2 text-center py-2">
                <div className="w-10 h-10 rounded-full bg-[#349670]/30 text-[#C8EAD9] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#C8EAD9]">Workorder Resolved</h4>
                <p className="text-xs text-[#E6F4ED]">Incident successfully verified and closed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#EFE3F5]">Escalated Oversight</h4>
                <p className="text-xs text-[#E6F4ED]">
                  Incident is under Level {incident.current_level} oversight.
                </p>
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="w-full py-3 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Submit Repair Verification</span>
                </button>
              </div>
            )}

            {/* In Demo Mode, render the prominent Simulate SLA Breach Callout in the Action Card */}
            {demoMode && !isResolved && (
              <div className="mt-4 pt-4 border-t border-white/15 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#F3DE9A]">
                  <span>DEMO PRESENTATION SHORTCUT:</span>
                  <span>CURRENT: L{incident.current_level || 1}</span>
                </div>
                <button
                  onClick={handleSimulateSlaBreach}
                  disabled={breachLoading || (incident.status === 'SLA_BREACHED' && incident.current_level >= 3)}
                  className={`w-full py-2.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2 border ${
                    incident.status === 'SLA_BREACHED' && incident.current_level >= 3
                      ? 'bg-white/10 text-white/50 border-white/10 cursor-not-allowed'
                      : 'bg-[#A6473D] text-white hover:bg-[#8A3B32] border-[#C25B50] active:scale-98'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${breachLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {breachLoading
                      ? 'Processing...'
                      : incident.status === 'SLA_BREACHED' && incident.current_level >= 3
                      ? 'Final SLA Breach Reached (No L4)'
                      : (incident.current_level || 1) === 1
                      ? '⚡ Simulate SLA Breach (L1 → L2)'
                      : (incident.current_level || 1) === 2
                      ? '⚡ Simulate SLA Breach (L2 → L3)'
                      : '⚡ Simulate Final SLA Breach'}
                  </span>
                </button>
                {breachMessage && (
                  <p className="text-[10px] text-[#C8EAD9] text-center font-semibold italic">{breachMessage}</p>
                )}
              </div>
            )}
          </div>

          {/* Responsibility & SLA Card */}
          <div className="bg-[#E6F4ED] rounded-2xl p-6 border border-[#B8E0CB] shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block">CURRENT RESPONSIBILITY</span>
              <div className="flex items-center gap-2 mt-1">
                <UserCheck className="w-4 h-4 text-[#349670]" />
                <span className="text-sm font-black text-[#1F5443]">{levelRoleLabel}</span>
              </div>
            </div>

            <div className="border-t border-[#B8E0CB] pt-3">
              <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block mb-1">SLA DEADLINE</span>
              <SlaTimer deadline={incident.sla_deadline} status={incident.status} />
            </div>

            <div className="border-t border-[#B8E0CB] pt-3">
              <span className="text-[10px] font-bold text-[#75998C] uppercase tracking-wider block mb-1">PRIORITY SCORE BREAKDOWN</span>
              <div className="text-xs font-bold text-[#174437] space-y-1">
                <p className="flex justify-between">
                  <span className="text-[#4A7365]">Calculated Score:</span>
                  <span>{incident.priority_score} / 100</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[#4A7365]">Priority Level:</span>
                  <span>{incident.priority_level}</span>
                </p>
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
