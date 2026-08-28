import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Check,
  Volume2,
  Phone,
  Bell,
  Users
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import { incidentApi } from '../api/incidentApi';
import StatusBadge from '../components/StatusBadge';
import InteractiveMap from '../components/InteractiveMap';
import { parseCoordinates, formatCoordinates } from '../utils/locationUtils';
import { supabase } from '../config/supabase';

const TRACKING_STEPS = [
  { key: 'OPEN', label: 'Submitted' },
  { key: 'REVIEWED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' }
];

const ReportDetailPage = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNotified, setIsNotified] = useState(false);

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

  useEffect(() => {
    fetchDetails();

    const channel = supabase
      .channel(`report-detail-${reportId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: `id=eq.${reportId}` },
        () => fetchDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => fetchDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[#648274] font-medium space-y-3">
        <div className="w-8 h-8 border-2 border-[#237A52] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading report details & tracking status...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 bg-white rounded-[16px] border border-[#DDEBE2] shadow-xs text-center space-y-4 max-w-md mx-auto my-12">
        <div className="text-[#237A52] font-bold text-base">Report Unavailable</div>
        <p className="text-xs text-[#648274]">{error || 'Could not retrieve report details.'}</p>
        <Link to="/citizen/my-reports" className="btn-civic-primary rounded-xl">
          Back to My Reports
        </Link>
      </div>
    );
  }

  const coords = parseCoordinates(report.location);
  const incident = incidentData?.incident || null;
  const linkedReports = incidentData?.reports || [];
  const reportCount = incident?.report_count || linkedReports.length || 1;

  // Determine current status step index
  const currentStatus = report.status || 'OPEN';
  const getStepIndex = (status) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return 3;
    if (status === 'IN_PROGRESS' || status === 'ESCALATED') return 2;
    if (status === 'REVIEWED') return 1;
    return 0;
  };
  const activeStepIdx = getStepIndex(currentStatus);

  const isVoiceNote = Boolean(report.voice_note_url);
  const descriptionContent = report.voice_transcript || report.description || 'Civic issue recorded for municipal resolution.';

  return (
    <div className="max-w-[1080px] mx-auto pb-16 px-3 sm:px-6 pt-3 select-none space-y-5">
      
      {/* Back Navigation Header */}
      <div className="flex items-center justify-between">
        <Link to="/citizen/my-reports" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#237A52] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Reports</span>
        </Link>
        <div className="text-[11px] font-mono text-[#8AA095]">Report #{report.id.substring(0, 12)}</div>
      </div>

      {/* Two-Column Report Details & Tracking Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: Visual Evidence & Location Map */}
        <div className="space-y-4">
          
          {/* Photo Gallery */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
              Submitted Photo Evidence
            </div>
            <div className="relative rounded-xl overflow-hidden border border-[#DDEBE2] bg-[#FBFDFC] aspect-video">
              <img src={report.image_url} alt="Evidence" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Location Map Preview */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#237A52]" />
                <span>Location</span>
              </span>
              <span className="text-[11px] font-semibold text-[#237A52]">Confirmed GPS</span>
            </div>

            <div className="h-52 rounded-xl overflow-hidden border border-[#DDEBE2]">
              <InteractiveMap
                center={coords ? [coords.lat, coords.lng] : [14.467389, 75.924080]}
                zoom={15}
                height="100%"
                markers={coords ? [{ id: report.id, latitude: coords.lat, longitude: coords.lng, title: report.ai_category || 'Location' }] : []}
              />
            </div>

            <div className="p-3 rounded-xl bg-[#FBFDFC] border border-[#DDEBE2] text-xs space-y-1">
              <div className="font-bold text-[#163A2C]">{report.location_name || 'Davangere Zone'}</div>
              <div className="text-[10px] text-[#8AA095] font-mono">
                Coordinates: {coords ? formatCoordinates(coords.lat, coords.lng) : '14.4674° N, 75.9241° E'}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Report Information & Tracking Timeline */}
        <div className="space-y-4">
          
          {/* Main Info Card */}
          <div className="bg-white p-5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={currentStatus} />
                  <span className="text-[10px] font-mono text-[#8AA095]">RPT-2025-{report.id.substring(0, 6)}</span>
                </div>
                <h1 className="text-xl font-bold text-[#163A2C] tracking-tight">
                  {report.ai_category || report.category || 'Pothole on Main Street'}
                </h1>
              </div>
              <span className="text-[11px] text-[#8AA095] font-medium shrink-0">
                {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Description Section */}
            <div className="space-y-1 pt-1 border-t border-[#DDEBE2]">
              <div className="text-[10px] font-bold text-[#8AA095] uppercase">Description</div>
              <p className="text-xs text-[#163A2C] font-normal leading-relaxed bg-[#FBFDFC] p-3 rounded-xl border border-[#DDEBE2]">
                "{descriptionContent}"
              </p>
            </div>

            {/* Voice Note Audio Track */}
            {isVoiceNote && (
              <div className="p-3 rounded-xl bg-[#EAF7EF] border border-[#D5EBDD] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#237A52]">
                  <Volume2 className="w-4 h-4 text-[#237A52]" />
                  <span>Voice Note (00:12)</span>
                </div>
                <audio controls src={report.voice_note_url} className="h-8 max-w-[180px]" />
              </div>
            )}

            {/* Community Issue Indicator */}
            {reportCount > 1 && (
              <div className="p-3 rounded-xl bg-[#EAF7EF] border border-[#D5EBDD] flex items-center gap-2.5 text-xs text-[#237A52] font-semibold">
                <Users className="w-4 h-4 text-[#237A52] shrink-0" />
                <span>{reportCount} citizens have reported this physical issue nearby</span>
              </div>
            )}

          </div>

          {/* Visual Tracking Stepper Card */}
          <div className="bg-white p-5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            <div className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
              Track Report Progress
            </div>

            {/* Stepper Timeline Bar */}
            <div className="grid grid-cols-4 gap-1 relative pt-1">
              {TRACKING_STEPS.map((step, idx) => {
                const isDone = idx <= activeStepIdx;
                const isCurrent = idx === activeStepIdx;

                return (
                  <div key={step.key} className="text-center space-y-1 z-10">
                    <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[#237A52] text-white'
                        : 'bg-[#F1FAF4] text-[#8AA095] border border-[#DDEBE2]'
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                    </div>
                    <div className={`text-[10px] ${isCurrent ? 'font-bold text-[#237A52]' : isDone ? 'font-semibold text-[#163A2C]' : 'text-[#8AA095]'}`}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Narrative Box */}
            <div className="p-3.5 rounded-xl bg-[#FBFDFC] border border-[#DDEBE2] space-y-1">
              <div className="text-xs font-bold text-[#237A52] capitalize">
                Status: {currentStatus.replace('_', ' ')}
              </div>
              <p className="text-xs text-[#648274]">
                {currentStatus === 'RESOLVED'
                  ? 'Your issue has been resolved by municipal authorities.'
                  : currentStatus === 'IN_PROGRESS'
                  ? 'Your issue is currently being addressed by our team.'
                  : 'Your report has been registered and sent to the department.'}
              </p>
            </div>

            {/* Citizen SLA Accountability Box */}
            {(() => {
              const slaDeadline = incident?.sla_deadline || report?.sla_deadline;
              const currentLevel = incident?.current_level || 1;
              const isResolved = currentStatus === 'RESOLVED' || currentStatus === 'CLOSED';

              let remainingHours = null;
              let isSlaBreached = false;

              if (slaDeadline && !isResolved) {
                const diffMs = new Date(slaDeadline).getTime() - Date.now();
                remainingHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
                isSlaBreached = diffMs <= 0;
              }

              let slaTitle = "⏱ Expected Resolution";
              let slaSubtitle = remainingHours !== null ? `Target resolution within ${remainingHours} hours` : "Resolution on track";
              let slaBadge = "🟢 On track";
              let slaBg = "bg-[#F1FAF4] border-[#DDEBE2]";
              let slaText = "Your report is registered and operating within normal municipal timeframes.";

              if (isResolved) {
                slaTitle = "✓ Issue Resolved";
                slaSubtitle = "Completed by municipal authorities";
                slaBadge = "RESOLVED";
                slaBg = "bg-[#EAF7EF] border-[#D5EBDD]";
                slaText = "This civic report has been verified and resolved.";
              } else if (isSlaBreached && currentLevel >= 3) {
                slaTitle = "🔴 Resolution Delayed";
                slaSubtitle = "Overdue for senior municipal review";
                slaBadge = "Priority Attention";
                slaBg = "bg-[#FAECEB] border-[#F3C5BF]";
                slaText = "Your report has exceeded the expected resolution timeframe and remains under senior municipal review.";
              } else if (currentLevel >= 3) {
                slaTitle = "⚠️ Higher-Level Review";
                slaSubtitle = slaDeadline ? `Updated target: ${new Date(slaDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : "Senior review active";
                slaBadge = "Escalated Review";
                slaBg = "bg-[#FFF8E7] border-[#FCE3B4]";
                slaText = "Your report has been escalated for senior executive review because the initial resolution timeframe was exceeded.";
              } else if (currentLevel === 2 || isSlaBreached) {
                slaTitle = "⚠️ Taking Longer Than Expected";
                slaSubtitle = slaDeadline ? `Updated target: ${new Date(slaDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : "Higher-level review active";
                slaBadge = "Escalated";
                slaBg = "bg-[#FFF8E7] border-[#FCE3B4]";
                slaText = "Your report exceeded its initial resolution timeframe and has been automatically escalated for higher-level technical review.";
              }

              return (
                <div className={`p-4 rounded-xl border space-y-1.5 ${slaBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#163A2C]">
                      {slaTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/80 border border-[#DDEBE2] text-[#237A52]">
                      {slaBadge}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-[#237A52]">
                    {slaSubtitle}
                  </div>
                  <p className="text-[11px] text-[#648274] font-medium leading-relaxed">
                    {slaText}
                  </p>
                </div>
              );
            })()}

            {/* Assigned Officer Information Card */}
            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#237A52] text-white flex items-center justify-center font-bold text-xs">
                  RO
                </div>
                <div>
                  <div className="text-xs font-bold text-[#163A2C]">Rahul Kumar</div>
                  <div className="text-[10px] text-[#648274]">Assigned Ward Officer</div>
                </div>
              </div>

              <button
                onClick={() => alert('Contacting Ward Officer Helpline: 1800-425-9999')}
                className="w-8 h-8 rounded-full bg-[#EAF7EF] text-[#237A52] flex items-center justify-center border border-[#D5EBDD] hover:bg-[#237A52] hover:text-white transition-colors cursor-pointer"
                title="Call Officer"
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Toggle Button */}
            <button
              onClick={() => setIsNotified(!isNotified)}
              className={`w-full py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isNotified
                  ? 'bg-[#EAF7EF] text-[#237A52] border border-[#D5EBDD]'
                  : 'btn-civic-primary'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>{isNotified ? 'Subscribed to Status Updates' : 'Get Notified on Update'}</span>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportDetailPage;
