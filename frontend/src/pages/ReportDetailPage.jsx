import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Check,
  Volume2,
  Bell,
  Users,
  Building2
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import { incidentApi } from '../api/incidentApi';
import StatusBadge from '../components/StatusBadge';
import InteractiveMap from '../components/InteractiveMap';
import { parseCoordinates, formatCoordinates } from '../utils/locationUtils';
import { supabase } from '../config/supabase';

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

  const incident = incidentData?.incident || null;
  const escalations = incidentData?.escalations || [];
  const linkedReports = incidentData?.reports || [];
  const reportCount = incident?.report_count || linkedReports.length || 1;

  const actualLevel = Number(incident?.current_level) || 1;
  const actualStatus = incident?.status || report?.status || 'OPEN';
  const isResolved = actualStatus === 'RESOLVED' || actualStatus === 'CLOSED';

  const hasL2Escalation = actualLevel >= 2 || escalations.some(e => e.to_level >= 2);
  const hasL3Escalation = actualLevel >= 3 || escalations.some(e => e.to_level >= 3);

  // Dynamic Citizen Progress Pipeline (reflects the actual path taken)
  const citizenSteps = useMemo(() => {
    const steps = [
      {
        id: 'step-received',
        key: 'RECEIVED',
        label: 'Report Received',
        desc: 'Your complaint was registered and logged.',
        state: 'completed'
      },
      {
        id: 'step-handled',
        key: 'HANDLED',
        label: 'Being Handled',
        desc: 'The municipal team is addressing the reported issue.',
        state: (actualStatus === 'OPEN' && !hasL2Escalation && !isResolved)
          ? 'current'
          : (actualStatus !== 'OPEN' || hasL2Escalation || isResolved)
          ? 'completed'
          : 'pending'
      }
    ];

    if (hasL2Escalation) {
      steps.push({
        id: 'step-under-review',
        key: 'UNDER_REVIEW',
        label: 'Under Review',
        desc: 'Moved for additional supervisory coordination.',
        state: (actualLevel === 2 && !isResolved)
          ? 'current'
          : (isResolved || actualLevel > 2)
          ? 'completed'
          : 'pending'
      });
    }

    if (hasL3Escalation) {
      steps.push({
        id: 'step-senior-review',
        key: 'SENIOR_REVIEW',
        label: 'Senior Review',
        desc: 'Under executive administrative oversight.',
        state: (actualLevel === 3 && !isResolved)
          ? 'current'
          : isResolved
          ? 'completed'
          : 'pending'
      });
    }

    steps.push({
      id: 'step-resolved',
      key: 'RESOLVED',
      label: actualStatus === 'REOPENED' ? 'Additional Work' : 'Resolved',
      desc: isResolved
        ? 'The reported issue has been verified and resolved.'
        : actualStatus === 'REOPENED'
        ? 'Further repair verification required.'
        : 'Final resolution upon verification.',
      state: isResolved ? 'completed' : actualStatus === 'REOPENED' ? 'current' : 'pending'
    });

    return steps;
  }, [actualStatus, actualLevel, hasL2Escalation, hasL3Escalation, isResolved]);

  // Citizen-friendly status narrative
  const citizenStatusSummary = useMemo(() => {
    if (isResolved) {
      return {
        title: 'Resolved',
        text: 'Your complaint has been verified and marked as resolved by municipal authorities.'
      };
    }
    if (actualStatus === 'REOPENED') {
      return {
        title: 'Additional Work Required',
        text: 'The reported issue is undergoing additional field repair and verification.'
      };
    }
    if (actualLevel >= 3) {
      return {
        title: 'Under Senior Review',
        text: 'Your complaint requires further administrative attention.'
      };
    }
    if (actualLevel === 2) {
      return {
        title: 'Under Supervisory Review',
        text: 'Your complaint has been moved for additional supervisory review.'
      };
    }
    if (actualStatus === 'IN_PROGRESS') {
      return {
        title: 'Being Handled',
        text: 'The municipal team is currently working on your complaint.'
      };
    }
    return {
      title: 'Report Received',
      text: 'Your complaint was received and assigned for municipal action.'
    };
  }, [isResolved, actualStatus, actualLevel]);

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
          
          {/* Photo Gallery: Labeled "YOUR REPORT" */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
              YOUR REPORT
            </div>
            <div className="relative rounded-xl overflow-hidden border border-[#DDEBE2] bg-[#FBFDFC] aspect-video">
              <img src={report.image_url} alt="Submitted Report Evidence" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Location Map Preview: Labeled "REPORTED LOCATION" */}
          <div className="bg-white p-4 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#237A52] uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#237A52]" />
                <span>REPORTED LOCATION</span>
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
                  <StatusBadge status={actualStatus} />
                  <span className="text-[10px] font-mono text-[#8AA095]">RPT-{report.id.substring(0, 8)}</span>
                </div>
                <h1 className="text-xl font-bold text-[#163A2C] tracking-tight">
                  {report.ai_category || report.category || 'Civic Grievance'}
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
                  <span>Voice Note</span>
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

          {/* Citizen-Facing Progress Tracker Card */}
          <div className="bg-white p-5 rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4">
            <div className="text-xs font-semibold text-[#237A52] uppercase tracking-wider">
              Track Complaint Progress
            </div>

            {/* Dynamic Stepper Bar (Showing only actual path taken) */}
            <div className={`grid grid-cols-${citizenSteps.length} gap-1 relative pt-1`}>
              {citizenSteps.map((step) => {
                const isCompleted = step.state === 'completed';
                const isCurrent = step.state === 'current';

                return (
                  <div key={step.id} className="text-center space-y-1 z-10">
                    <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-[#237A52] text-white'
                        : isCurrent
                        ? 'bg-[#237A52] text-white ring-2 ring-[#237A52]/30'
                        : 'bg-[#F1FAF4] text-[#8AA095] border border-[#DDEBE2]'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isCurrent ? '●' : '○'}
                    </div>
                    <div className={`text-[10px] ${
                      isCurrent
                        ? 'font-bold text-[#237A52]'
                        : isCompleted
                        ? 'font-semibold text-[#163A2C]'
                        : 'text-[#8AA095]'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Narrative Box */}
            <div className="p-3.5 rounded-xl bg-[#FBFDFC] border border-[#DDEBE2] space-y-1">
              <div className="text-xs font-bold text-[#237A52]">
                {citizenStatusSummary.title}
              </div>
              <p className="text-xs text-[#648274] leading-relaxed">
                {citizenStatusSummary.text}
              </p>
            </div>

            {/* Progress History List */}
            <div className="pt-2 border-t border-[#DDEBE2] space-y-2">
              <div className="text-[10px] font-bold text-[#8AA095] uppercase">
                Progress Updates
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F1FAF4] border border-[#DDEBE2] flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#237A52] mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#163A2C] block">Complaint Registered</span>
                    <p className="text-[11px] text-[#648274]">
                      Citizen report received and registered in Davangere municipal operations.
                    </p>
                  </div>
                </div>

                {hasL2Escalation && (
                  <div className="p-2.5 rounded-xl bg-[#FBF2FD] border border-[#E9D5F5] flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#734785] mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#553363] block">Under Supervisory Review</span>
                      <p className="text-[11px] text-[#6E4E7A]">
                        Moved for additional supervisory review and coordination.
                      </p>
                    </div>
                  </div>
                )}

                {hasL3Escalation && (
                  <div className="p-2.5 rounded-xl bg-[#FDF4F3] border border-[#F6D0CC] flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#A6473D] mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#7A2A22] block">Senior Administrative Attention</span>
                      <p className="text-[11px] text-[#8C3A33]">
                        Complaint escalated for senior administrative attention.
                      </p>
                    </div>
                  </div>
                )}

                {isResolved && (
                  <div className="p-2.5 rounded-xl bg-[#EAF7EF] border border-[#D5EBDD] flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#237A52] mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#237A52] block">Resolved</span>
                      <p className="text-[11px] text-[#2D8A5B]">
                        Field work completed and verified by municipal authorities.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Municipal Department */}
            <div className="p-3 rounded-xl bg-white border border-[#DDEBE2] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EAF7EF] text-[#237A52] flex items-center justify-center font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#163A2C]">
                    {incident?.departments?.name || report?.department_name || 'Davangere City Corporation'}
                  </div>
                  <div className="text-[10px] text-[#648274]">Assigned Municipal Department</div>
                </div>
              </div>
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
