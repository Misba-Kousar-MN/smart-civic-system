import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { incidentApi } from '../api/incidentApi';

const EscalationModal = ({ incidentId, currentLevel, isOpen = true, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const targetLevel = currentLevel + 1;
  const targetRole = targetLevel === 2 ? 'Assistant Executive Engineer (AEE)' : 'Commissioner (Level 3)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Justification text is required for escalation.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await incidentApi.escalateIncident(incidentId, { reason: reason.trim() });
      if (res?.success) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to trigger incident escalation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
            <AlertCircle className="icon-sm" />
            <span>Escalate Incident to Level {targetLevel}</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X className="icon-xs" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <p className="text-xs text-gray-600">
              Escalating this incident will transfer municipal authority to{' '}
              <strong className="text-gray-900">{targetRole}</strong> and update status to{' '}
              <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-3xs border border-red-200">
                ESCALATED
              </span>.
            </p>

            {error && <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md">{error}</div>}

            <div className="form-group">
              <label className="form-label">
                Escalation Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                className="form-textarea text-xs"
                rows="4"
                placeholder="Explain why this incident is being escalated (e.g. Unresolved past SLA deadline despite priority level assignment)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary text-xs" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-danger text-xs font-bold" disabled={loading}>
              {loading ? 'Escalating...' : `Confirm Escalation (Level ${targetLevel})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EscalationModal;
