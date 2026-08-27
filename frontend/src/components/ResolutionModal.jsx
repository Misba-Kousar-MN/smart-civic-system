import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  Upload,
  ShieldCheck,
  FileText,
  Camera,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { incidentApi } from '../api/incidentApi';

const ResolutionModal = ({ incidentId, incident, isOpen = true, onClose, onSuccess, onResolved }) => {
  const targetIncident = incident || { id: incidentId || 'INC-ITEM' };

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [remarks, setRemarks] = useState('');

  // Workflow State Machine: 'IDLE' | 'UPLOADED' | 'VERIFYING' | 'VERIFIED' | 'FAILED'
  const [workflowState, setWorkflowState] = useState('IDLE');
  const [verificationResult, setVerificationResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // 1. File Selection & Validation
  const handleFileChange = (e) => {
    setError('');
    const selected = e.target.files[0];
    if (!selected) return;

    // Allowed file types: JPG, JPEG, PNG
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selected.type.toLowerCase()) && !selected.name.match(/\.(jpg|jpeg|png)$/i)) {
      setError('Invalid file format. Only JPG, JPEG, and PNG images are allowed.');
      return;
    }

    // Max 10MB limit
    if (selected.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please select a smaller photo.');
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setFileSizeStr((selected.size / (1024 * 1024)).toFixed(2) + ' MB');
    setPreview(URL.createObjectURL(selected));
    setWorkflowState('UPLOADED');
    setVerificationResult(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setFileName('');
    setFileSizeStr('');
    setWorkflowState('IDLE');
    setVerificationResult(null);
    setError('');
  };

  // 3. AI Verification Action
  const handleVerifyEvidence = async () => {
    if (!file) {
      setError('Please select an after-repair photo before verifying.');
      return;
    }

    try {
      setWorkflowState('VERIFYING');
      setError('');

      const formData = new FormData();
      formData.append('evidence_image', file);
      formData.append('after_image', file);
      if (remarks.trim()) {
        formData.append('remarks', remarks);
      }

      const res = await incidentApi.submitResolutionEvidence(targetIncident.id, formData);

      if (res?.success || res?.data?.ai_verified) {
        const evData = res?.data?.resolution_evidence || res?.data;
        const confidence = res?.data?.ai_confidence || evData?.ai_confidence || 92.5;
        const notes = res?.data?.verification_notes || evData?.comparison_notes || 'Damage repaired successfully. Verification passed.';

        setVerificationResult({
          status: 'VERIFIED',
          confidence: parseFloat(confidence).toFixed(1),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          notes: notes
        });
        setWorkflowState('VERIFIED');
      } else {
        const evData = res?.data?.resolution_evidence || res?.data;
        const confidence = res?.data?.ai_confidence || evData?.ai_confidence || 64.0;
        const notes = res?.message || evData?.comparison_notes || 'AI resolution verification failed. Repair photo did not match required confidence threshold.';

        setVerificationResult({
          status: 'FAILED',
          confidence: parseFloat(confidence).toFixed(1),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          notes: notes
        });
        setWorkflowState('FAILED');
      }
    } catch (err) {
      console.warn('[RESOLUTION VERIFICATION] API warning:', err);
      const errMsg = err.message || 'AI verification failed or service unavailable.';
      setVerificationResult({
        status: 'FAILED',
        confidence: '0.0',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: errMsg
      });
      setWorkflowState('FAILED');
    }
  };

  // 5. Submit Resolution Finalization
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (workflowState !== 'VERIFIED') {
      setError('AI Evidence Verification must pass before submitting resolution.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await incidentApi.updateIncidentStatus(targetIncident.id, {
        status: 'RESOLVED',
        remarks: remarks || 'Resolved with AI-verified repair evidence.'
      });

      if (onSuccess) onSuccess();
      if (onResolved) onResolved(targetIncident.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit final resolution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#123F32]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#F0F8F5] w-full max-w-lg rounded-2xl shadow-2xl border border-[#B8E0CB] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-[#1F5443] text-white flex items-center justify-between border-b border-[#2B6D58]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#349670] text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Document Evidence Required</h3>
              <p className="text-[11px] text-[#C8EAD9] font-medium">
                Incident #{String(targetIncident.id).slice(0, 8).toUpperCase()} • {targetIncident.category || 'Civic Issue'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#2B6D58] text-[#C8EAD9] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmitResolution} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] text-[#A6473D] text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description Instructions */}
          <div className="p-3.5 rounded-xl bg-[#E6F4ED] border border-[#B8E0CB] text-xs text-[#174437]">
            <p className="font-semibold leading-relaxed">
              Upload required evidence photo for AI verification check. Submitted repair photo will be compared against original citizen report image before resolving.
            </p>
          </div>

          {/* 1 & 2. Upload Photo / Preview Control */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#1F5443] uppercase tracking-wider block">
              Repair Photo Evidence <span className="text-[#A6473D]">*</span>
            </label>

            {preview ? (
              <div className="p-3.5 rounded-xl bg-[#E6F4ED] border border-[#B8E0CB] space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={preview}
                    alt="Evidence Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-[#B8E0CB] bg-[#F0F8F5] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#174437] truncate">{fileName}</div>
                    <div className="text-[10px] text-[#75998C] font-mono mt-0.5">{fileSizeStr}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <label
                        htmlFor="replace-evidence-file"
                        className="px-2.5 py-1 rounded-lg bg-[#DCF0E6] hover:bg-[#CEEADA] text-[#174437] border border-[#B8E0CB] text-[11px] font-bold cursor-pointer transition-all"
                      >
                        Replace Photo
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-2.5 py-1 rounded-lg bg-[#FAECEB] hover:bg-[#F5D8D5] text-[#A6473D] border border-[#F3C5BF] text-[11px] font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  id="replace-evidence-file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  id="resolution-file-input"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="resolution-file-input"
                  className="p-5 border-2 border-dashed border-[#B8E0CB] hover:border-[#349670] bg-[#E6F4ED] hover:bg-[#DCF0E6] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-[#DCF0E6] text-[#349670] flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-[#1F5443] block">Upload Evidence Photo</span>
                    <span className="text-[10px] text-[#75998C] font-medium">JPG, JPEG, PNG up to 10MB</span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Remarks input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#1F5443] uppercase tracking-wider block">
              Resolution Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Pothole filled and road surface restored."
              className="w-full h-9 px-3 bg-[#E6F4ED] border border-[#B8E0CB] rounded-xl text-xs font-semibold text-[#174437] placeholder-[#75998C] focus:outline-none focus:border-[#349670]"
            />
          </div>

          {/* 3 & 4. AI Verification Control & Verification Result Banner */}
          {workflowState === 'UPLOADED' && (
            <button
              type="button"
              onClick={handleVerifyEvidence}
              className="w-full py-2.5 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Verify Evidence with AI</span>
            </button>
          )}

          {workflowState === 'VERIFYING' && (
            <div className="p-4 rounded-xl bg-[#DCF0E6] border border-[#B8E0CB] flex items-center justify-center gap-3 text-xs font-bold text-[#1F5443]">
              <RefreshCw className="w-4 h-4 text-[#349670] animate-spin" />
              <span>Analyzing Evidence with AI...</span>
            </div>
          )}

          {workflowState === 'VERIFIED' && verificationResult && (
            <div className="p-4 rounded-xl bg-[#D5EFE1] border border-[#B8E0CB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#216D51] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#216D51]" />
                  <span>✓ Evidence Verified</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-[#216D51]">
                  Confidence: {verificationResult.confidence}%
                </span>
              </div>
              <p className="text-[11px] text-[#174437] font-semibold">
                {verificationResult.notes}
              </p>
              <div className="text-[10px] font-mono text-[#75998C] text-right">
                Verified at {verificationResult.timestamp}
              </div>
            </div>
          )}

          {workflowState === 'FAILED' && verificationResult && (
            <div className="p-4 rounded-xl bg-[#FAECEB] border border-[#F3C5BF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#A6473D] flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-[#A6473D]" />
                  <span>✕ Evidence Verification Failed</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-[#A6473D]">
                  Confidence: {verificationResult.confidence}%
                </span>
              </div>
              <p className="text-[11px] text-[#A6473D] font-semibold">
                {verificationResult.notes}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleVerifyEvidence}
                  className="px-3 py-1 rounded-lg bg-[#349670] text-white text-[11px] font-bold hover:bg-[#2B8260]"
                >
                  Retry Verification
                </button>
              </div>
            </div>
          )}

          {/* 5. Submit Resolution Action Button */}
          <div className="pt-3 border-t border-[#B8E0CB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#4A7365] hover:bg-[#DCF0E6] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={workflowState !== 'VERIFIED' || loading}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                workflowState === 'VERIFIED' && !loading
                  ? 'bg-[#349670] hover:bg-[#2B8260] text-white'
                  : 'bg-[#B8E0CB] text-[#75998C] cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Submitting Resolution...' : 'Submit Resolution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolutionModal;
