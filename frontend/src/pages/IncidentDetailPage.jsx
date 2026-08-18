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
  Building2
} from 'lucide-react';
import { incidentApi } from '../api/incidentApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaTimer from '../components/SlaTimer';
import InteractiveMap from '../components/InteractiveMap';
import EscalationModal from '../components/EscalationModal';
import ResolutionModal from '../components/ResolutionModal';
import { parseCoordinates, formatCoordinates } from '../utils/locationUtils';

const IncidentDetailPage = () => {
  const { incidentId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);

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
      const res = await incidentApi.updateStatus(incidentId, 'IN_PROGRESS', 'Officer initiated work order execution.');
      if (res?.success) {
        fetchIncidentDetails();
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-gray-500 font-medium space-y-2">
        <div className="w-6 h-6 border-2 border-[#1769AA] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading incident details...</span>
      </div>
    );
  }

  if (error || !data?.incident) {
    return (
      <div className="page-container max-w-5xl mx-auto space-y-4">
        <Link to="/officer/dashboard" className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Incident Command
        </Link>
        <div className="p-4 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium">{error || 'Incident not found.'}</div>
      </div>
    );
  }

  const incident = data.incident;
  const reports = data.reports || [];
  const history = data.history || [];
  const escalations = data.escalations || [];
  const evidence = data.resolution_evidence || [];
  const coords = parseCoordinates(incident.location);

  return (
    <div className="page-container max-w-6xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex-between flex-wrap gap-4 pb-2 border-b border-gray-200">
        <div>
          <Link to="/officer/dashboard" className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1.5 mb-1">
            <ArrowLeft className="w-4 h-4" /> Back to Operations Console
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{incident.category || 'Civic Incident Workorder'}</h1>
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority_level} />
          </div>
        </div>

        {/* Officer Action Toolbar */}
        <div className="flex items-center gap-2">
          {incident.status === 'OPEN' && (
            <button
              className="btn-primary text-xs font-bold py-2.5 px-4 flex items-center gap-1.5"
              onClick={handleStartWork}
              disabled={actionLoading}
            >
              <Play className="w-3.5 h-3.5" /> Start Work Order
            </button>
          )}

          {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
            <>
              <button
                className="btn-danger text-xs font-bold py-2.5 px-4 flex items-center gap-1.5"
                onClick={() => setShowEscalationModal(true)}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Escalate Level {incident.current_level + 1}
              </button>
              <button
                className="bg-green-600 text-white hover:bg-green-700 btn-primary text-xs font-bold py-2.5 px-4 flex items-center gap-1.5 border-none"
                onClick={() => setShowResolutionModal(true)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Submit Resolution Evidence
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2-Column Workorder Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (65% = 8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* PostGIS Location Map */}
          <div className="civic-card space-y-3 bg-white border border-gray-200">
            <div className="flex-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#1769AA]" /> PostGIS Location Coordinates
              </span>
              <span className="text-3xs font-mono text-gray-500 font-medium">
                {formatCoordinates(coords.lat, coords.lng)}
              </span>
            </div>

            <div className="map-container-card" style={{ height: '260px' }}>
              <InteractiveMap
                height="260px"
                interactive={false}
                center={coords}
                selectedLocation={coords}
              />
            </div>
          </div>

          {/* Linked Citizen Submissions */}
          <div className="civic-card space-y-3 bg-white border border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Linked Citizen Submissions ({reports.length})
            </h3>
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={rep.image_url} alt="Evidence" className="w-20 h-14 object-cover rounded-lg border border-gray-200" />
                    <div>
                      <span className="font-bold text-gray-900 text-xs block">{rep.ai_category || 'Citizen Photo Evidence'}</span>
                      <span className="text-3xs text-gray-500 font-mono">ID: {rep.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  {rep.ai_confidence && (
                    <span className="text-3xs bg-blue-50 text-[#1769AA] font-mono font-bold px-2 py-1 rounded border border-blue-200">
                      {rep.ai_confidence}% AI Conf
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Evidence (If available) */}
          {evidence.length > 0 && (
            <div className="civic-card space-y-3 border-l-4 border-l-green-600 bg-green-50/20 border border-green-200">
              <h4 className="font-bold text-green-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> AI Verified Resolution Evidence
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-3xs font-bold text-gray-500 block uppercase mb-1">Before Repair</span>
                  <img src={evidence[0].before_image_url} alt="Before" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                </div>
                <div>
                  <span className="text-3xs font-bold text-gray-500 block uppercase mb-1">After Repair</span>
                  <img src={evidence[0].after_image_url} alt="After" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (35% = 4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* SLA Clock & Status */}
          <div className="civic-card space-y-4 bg-white border border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              SLA Clock & Authority
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-3xs font-bold text-gray-400 block uppercase mb-1">SLA Resolution Countdown</span>
                <SlaTimer deadline={incident.sla_deadline} />
              </div>
              <div className="pt-2 border-t border-gray-100 text-xs">
                <span className="text-3xs font-bold text-gray-400 block uppercase">Escalation Tier</span>
                <span className="font-bold text-[#1769AA]">Level {incident.current_level} Authority</span>
              </div>
            </div>
          </div>

          {/* History Audit Trail */}
          <div className="civic-card space-y-3 bg-white border border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Status Transition Log
            </h4>
            <div className="space-y-2 text-xs">
              {history.map((h) => (
                <div key={h.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-between">
                    <span className="font-bold text-gray-900">{h.to_status}</span>
                    <span className="text-3xs text-gray-400">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {h.notes && <p className="text-3xs text-gray-500 mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Modals */}
      {showEscalationModal && (
        <EscalationModal
          incident={incident}
          onClose={() => setShowEscalationModal(false)}
          onSuccess={() => {
            setShowEscalationModal(false);
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

    </div>
  );
};

export default IncidentDetailPage;
