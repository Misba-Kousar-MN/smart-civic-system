import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Sparkles,
  Volume2,
  Share2,
  Building2,
  UserCheck,
  Brain,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import { incidentApi } from '../api/incidentApi';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaTimer from '../components/SlaTimer';
import InteractiveMap from '../components/InteractiveMap';
import { parseCoordinates, formatCoordinates } from '../utils/locationUtils';

const ReportDetailPage = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const repRes = await reportApi.getReportById(reportId);
        if (repRes?.success && repRes?.data) {
          setReport(repRes.data);

          if (repRes.data.incident_id) {
            const incRes = await incidentApi.getIncidentById(repRes.data.incident_id);
            if (incRes?.success && incRes?.data) {
              setIncidentData(incRes.data);
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load report details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [reportId]);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-400 font-medium space-y-2">
        <div className="w-6 h-6 border-2 border-[#1769AA] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading incident details...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link to="/citizen/my-reports" className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to My Submissions
        </Link>
        <div className="p-4 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
          {error || 'Report not found.'}
        </div>
      </div>
    );
  }

  const coords = parseCoordinates(report.location);
  const incident = incidentData?.incident;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: report.ai_category || 'Civic Issue Report',
        text: `Check status for Report ${report.id}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Report link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      
      {/* 1. Header Navigation & Quick Badges */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/citizen/my-reports"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Submissions</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Report Details
            </h1>
            <StatusBadge status={incident?.status || report.status || 'OPEN'} />
            <PriorityBadge priority={incident?.priority_level || 'MEDIUM'} />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track the progress and details of your reported issue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
            Report ID: #{report.id}
          </span>
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-xl bg-[#1769AA] text-white hover:bg-[#0D4775] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Incident Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Photo Evidence & Location Map (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Photo Evidence Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Photo Evidence
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Max display height 340px</span>
            </div>

            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200/80 overflow-hidden">
              <img
                src={report.image_url}
                alt="Photo Evidence"
                className="w-full h-[320px] object-cover rounded-xl shadow-2xs"
              />
            </div>

            {/* Thumbnail Row */}
            <div className="flex items-center gap-2 pt-1">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#1769AA] shadow-2xs cursor-pointer">
                <img src={report.image_url} alt="Thumb 1" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Location Map Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#1769AA]" /> Location Map
              </h3>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {formatCoordinates(coords.lat, coords.lng)}
              </span>
            </div>

            <InteractiveMap
              height="260px"
              interactive={false}
              center={coords}
              selectedLocation={coords}
            />

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Latitude</span>
                <span className="font-mono font-bold text-slate-800">{coords.lat}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Longitude</span>
                <span className="font-mono font-bold text-slate-800">{coords.lng}</span>
              </div>
              <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Address</span>
                <span className="font-semibold text-slate-800">
                  {report.location_name || 'Bapuji Nagar, Davangere, Karnataka'}
                </span>
              </div>
            </div>
          </div>

          {/* Voice Note Audio Card if available */}
          {report.voice_note_url && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#1769AA]" /> Voice Note Context
              </h3>
              <audio controls src={report.voice_note_url} className="w-full h-9 rounded-xl" />
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: AI Classification & Timeline (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Classification Component Card */}
          <div className="bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-6 rounded-2xl border border-blue-200 shadow-2xs space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-[#1769AA] text-[10px] font-extrabold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" /> AI CLASSIFICATION
              </div>
              <span className="text-xs font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {report.ai_confidence || 94}% AI Confidence
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                {report.ai_category || report.category || 'Pothole on Main Road'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Automated Gemini vision AI detected issue and dispatched workorder.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Status</span>
                <StatusBadge status={incident?.status || report.status || 'IN_PROGRESS'} />
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Priority</span>
                <PriorityBadge priority={incident?.priority_level || 'MEDIUM'} />
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Department</span>
                <span className="font-bold text-slate-800">Public Works Dept</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">SLA Deadline</span>
                <SlaTimer deadline={incident?.sla_deadline || report.sla_deadline} />
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Activity Timeline
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              
              {/* Step 1 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Report Submitted</div>
                  <div className="text-[11px] text-slate-500">{new Date(report.created_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">AI Analysis & Detection</div>
                  <div className="text-[11px] text-slate-500">Gemini Vision AI classified issue</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Officer Assigned</div>
                  <div className="text-[11px] text-amber-700 font-semibold">Public Works Officer (In Progress)</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">Work Started</div>
                  <div className="text-[11px] text-slate-400">Pending field inspection</div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                  5
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">Resolution</div>
                  <div className="text-[11px] text-slate-400">Pending final verification</div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportDetailPage;
