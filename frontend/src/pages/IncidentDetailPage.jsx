import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  MapPin,
  FileText,
  History,
  Building2,
  Sparkles,
  Volume2,
  Mic,
  Users,
  HardHat,
  Check,
  Activity
} from 'lucide-react';
import { incidentApi } from '../api/incidentApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaTimer from '../components/SlaTimer';
import InteractiveMap from '../components/InteractiveMap';
import EscalationModal from '../components/EscalationModal';
import ResolutionModal from '../components/ResolutionModal';
import AssignTeamModal from '../components/AssignTeamModal';
import { parseCoordinates } from '../utils/locationUtils';

const IncidentDetailPage = () => {
  const { incidentId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showEscalationModal, setShowEscalationModal] = useState(false);
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
      alert('Error updating status: ' + (err.message || 'Failed to update incident status.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTeamAssign = async (incId, dept) => {
    try {
      await incidentApi.updateIncidentStatus(incId, {
        status: 'IN_PROGRESS',
        department_id: dept.id,
        remarks: `Assigned field dispatch department to ${dept.name}`
      });
      fetchIncidentDetails();
    } catch (err) {
      alert('Error assigning department: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#64756E] font-semibold space-y-3">
        <div className="w-8 h-8 border-2 border-[#145C4A] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading workorder details...</span>
      </div>
    );
  }

  if (!data?.incident) {
    return (
      <div className="p-8 bg-white rounded-[16px] border border-[#DDEBE2] text-center space-y-4 max-w-md mx-auto my-12">
        <div className="text-[#163A2C] font-bold text-base">Workorder Unavailable</div>
        <p className="text-xs text-[#648274]">{error || 'Could not retrieve workorder details.'}</p>
        <Link to="/officer/dashboard" className="btn-civic-primary rounded-xl">
          Back to Command Center
        </Link>
      </div>
    );
  }

  const incident = data.incident;
  const reportsList = data.reports || [];
  const statusHistory = data.status_history || [];
  const resolutionEvidence = data.resolution_evidence || [];

  const mapMarkers = [{
    id: incident.id,
    position: parseCoordinates(incident.location),
    title: `${incident.category} (${reportsList.length} Reports)`,
    status: incident.status,
    priority: incident.priority_level,
    address: incident.address || incident.location_name || 'Davangere Zone'
  }];

  const STATUS_STEPS = [
    { label: 'OPEN', key: 'OPEN' },
    { label: 'ASSIGNED', key: 'ASSIGNED' },
    { label: 'IN PROGRESS', key: 'IN_PROGRESS' },
    { label: 'RESOLVED', key: 'RESOLVED' }
  ];

  const getStepState = (stepKey) => {
    const cur = incident.status;
    if (cur === stepKey) return 'CURRENT';
    if (cur === 'RESOLVED' || cur === 'CLOSED') return 'COMPLETED';
    if (cur === 'IN_PROGRESS' && (stepKey === 'OPEN' || stepKey === 'ASSIGNED')) return 'COMPLETED';
    if (cur === 'ASSIGNED' && stepKey === 'OPEN') return 'COMPLETED';
    return 'UPCOMING';
  };

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-16 select-none font-sans">
      
      {/* Header Nav */}
      <div className="flex items-center justify-between bg-white p-4.5 rounded-[16px] border border-[#DDEBE2] shadow-xs">
        <Link
          to="/officer/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#648274] hover:text-[#163A2C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Command Center</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#EAF7EF] text-[#237A52] font-mono text-[11px] font-bold border border-[#D5EBDD]">
            #INC-{incident.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Incident Details Header */}
      <div className="bg-white p-6 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black text-[#163A2C] tracking-tight">
                {incident.category || 'Civic Operational Incident'}
              </h1>

              {/* Dynamic Citizen Reports Badge */}
              <span className="px-3 py-1 rounded-full bg-[#EAF7EF] text-[#237A52] text-xs font-black border border-[#D5EBDD] flex items-center gap-1.5 shadow-2xs">
                <Users className="w-3.5 h-3.5" />
                <span>{reportsList.length} citizen {reportsList.length === 1 ? 'report' : 'reports'}</span>
              </span>

              <PriorityBadge priority={incident.priority_level} />
              <StatusBadge status={incident.status} />
            </div>

            <div className="text-xs font-medium text-[#648274] flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[#163A2C] font-bold">
                <MapPin className="w-4 h-4 text-[#648274]" />
                {incident.address || incident.location_name || 'Davangere Municipal Zone'}
              </span>
              <span>•</span>
              <span className="text-[#648274]">Registered: {new Date(incident.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {incident.status === 'OPEN' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <HardHat className="w-4 h-4" />
                <span>Assign Team</span>
              </button>
            )}

            {incident.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setShowResolutionModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Resolved</span>
              </button>
            )}

            {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
              <button
                onClick={() => setShowEscalationModal(true)}
                className="px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Escalate</span>
              </button>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#648274]">Operational Lifecycle Progress</div>
          <div className="grid grid-cols-4 gap-2">
            {STATUS_STEPS.map((step) => {
              const state = getStepState(step.key);
              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    state === 'CURRENT'
                      ? 'bg-[#166534] text-white border-[#14532D] font-black shadow-xs'
                      : state === 'COMPLETED'
                      ? 'bg-[#EAF7EF] text-[#237A52] border-[#D5EBDD] font-bold'
                      : 'bg-slate-50 text-slate-400 border-slate-200 font-medium'
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wider flex items-center justify-center gap-1">
                    {state === 'COMPLETED' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deduplication Banner */}
      <div className="p-4 bg-[#EAF7EF] rounded-[16px] border border-[#D5EBDD] flex items-start gap-3.5 text-xs text-[#163A2C]">
        <div className="w-8 h-8 rounded-xl bg-[#237A52] text-white flex items-center justify-center shrink-0 font-bold">
          <Users className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="font-extrabold text-[#163A2C] text-sm">
            {reportsList.length} nearby citizen reports have been grouped into this incident
          </div>
          <p className="text-[#237A52] font-medium">
            Submissions in close geographic proximity describing the same physical issue were merged into a single operational workorder.
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Evidence & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-[#163A2C] text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#237A52]" />
                  <span>Citizen Evidence Submissions ({reportsList.length})</span>
                </h3>
                <p className="text-xs text-[#648274] font-medium">
                  Actual citizen evidence and audio transcripts linked to this workorder.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {reportsList.map((rep, idx) => (
                <div
                  key={rep.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#EAF7EF] text-[#237A52] text-[10px] font-black">
                        Report #{idx + 1}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">#{rep.id ? rep.id.slice(0, 8) : 'RPT-01'}</span>
                      {rep.is_primary && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Primary Evidence
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {rep.created_at ? new Date(rep.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    {rep.image_url && (
                      <img
                        src={rep.image_url}
                        alt="Citizen evidence"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200 bg-slate-100"
                      />
                    )}

                    <div className="sm:col-span-2 space-y-1.5 text-xs text-slate-700">
                      <p className="font-medium bg-white p-2.5 rounded-lg border border-slate-200">
                        "{rep.voice_transcript || rep.description || 'Citizen submitted evidence photo for field verification.'}"
                      </p>

                      {rep.voice_note_url && (
                        <div className="p-2 bg-[#EAF7EF] rounded-lg border border-[#D5EBDD] flex items-center gap-2 text-[#237A52] text-[11px] font-bold">
                          <Volume2 className="w-4 h-4 text-[#237A52] shrink-0" />
                          <audio controls src={rep.voice_note_url} className="h-6 w-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#163A2C] text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#237A52]" />
              <span>Operational Activity Timeline</span>
            </h3>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative pl-7 space-y-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#237A52] absolute left-2 top-1.5 ring-4 ring-white" />
                <div className="font-bold text-xs text-slate-900">Incident Workorder Created</div>
                <div className="text-[11px] text-slate-500 font-medium">{new Date(incident.created_at).toLocaleString()}</div>
              </div>

              {reportsList.length > 1 && (
                <div className="relative pl-7 space-y-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600 absolute left-2 top-1.5 ring-4 ring-white" />
                  <div className="font-bold text-xs text-slate-900">{reportsList.length} Citizen Reports Grouped</div>
                  <div className="text-[11px] text-slate-500 font-medium">Spatial proximity deduplication merged matching complaints</div>
                </div>
              )}

              {statusHistory.map((sh, idx) => (
                <div key={sh.id || idx} className="relative pl-7 space-y-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute left-2 top-1.5 ring-4 ring-white" />
                  <div className="font-bold text-xs text-slate-900">Status Changed to {sh.new_status}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{sh.remarks || 'Status update logged'} • {new Date(sh.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Specs & Map */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#163A2C] text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Work Order Specifications
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Priority Level:</span>
                <PriorityBadge priority={incident.priority_level} />
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">SLA Deadline:</span>
                <SlaTimer deadline={incident.sla_deadline} status={incident.status} />
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Assigned Department:</span>
                <span className="font-bold text-slate-900">
                  {incident.departments?.name || (incident.assigned_officer_id ? 'Assigned Field Division' : 'Unassigned')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Current Level:</span>
                <span className="font-bold text-slate-900">Level {incident.current_level || 1} (Ward Level)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <h3 className="font-extrabold text-[#163A2C] text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#237A52]" />
              <span>Incident Location</span>
            </h3>
            <InteractiveMap markers={mapMarkers} height="220px" />
          </div>
        </div>

      </div>

      {/* Modals */}
      <EscalationModal
        isOpen={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        incident={incident}
        onEscalated={() => fetchIncidentDetails()}
      />

      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        incident={incident}
        onResolved={() => fetchIncidentDetails()}
      />

      <AssignTeamModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        incident={incident}
        onAssign={handleTeamAssign}
      />

    </div>
  );
};

export default IncidentDetailPage;
