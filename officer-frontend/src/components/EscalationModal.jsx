import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { incidentApi } from '../api/incidentApi';
import SlaTimer from './SlaTimer';

const ESCALATION_REASONS = [
  'SLA approaching',
  'SLA breached',
  'Requires additional resources',
  'Requires higher-level approval',
  'High severity',
  'Unable to resolve at Level 1',
  'Other'
];

const EscalationModal = ({ isOpen = true, incident, onClose, onEscalated, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState(ESCALATION_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !incident) return null;

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullReason = notes.trim()
      ? `${selectedReason}: ${notes.trim()}`
      : selectedReason;

    try {
      setLoading(true);
      setError('');
      const res = await incidentApi.escalateIncident(incident.id, { reason: fullReason });
      if (res?.success) {
        if (onEscalated) onEscalated(res.data);
        if (onSuccess) onSuccess(res.data);
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to send escalation request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Escalate Incident</h3>
              <p className="text-[11px] text-purple-200 font-medium">Send this incident to Level 2 for higher-level review.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-purple-800 text-purple-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Incident Context Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs">{incident.category}</span>
              <span className="font-mono text-[11px] text-slate-500 font-bold">#INC-{incident.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Location: </span>
                <span className="font-bold text-slate-800">{incident.address || incident.location_name || 'Davangere Zone'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Current Priority: </span>
                <span className="font-extrabold text-purple-700">{incident.priority_level}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Current Status: </span>
                <span className="font-bold text-slate-800">{incident.status}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">SLA: </span>
                <SlaTimer deadline={incident.sla_deadline} status={incident.status} />
              </div>
            </div>
          </div>

          {/* Selectable Escalation Reasons */}
          <div className="space-y-2">
            <label className="block font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
              Escalation Reason <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
              {ESCALATION_REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <div
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 font-bold text-purple-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="escalationReason"
                      checked={isSelected}
                      onChange={() => setSelectedReason(r)}
                      className="accent-purple-700 cursor-pointer"
                    />
                    <span>{r}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Context Textarea */}
          <div className="space-y-1">
            <label className="block font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
              Additional Notes
            </label>
            <textarea
              rows="3"
              placeholder="Add context for the Level 2 officer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition-all"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs text-slate-600 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{loading ? 'Escalating...' : 'Escalate to Level 2'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EscalationModal;
