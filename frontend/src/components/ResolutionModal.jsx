import React, { useState } from 'react';
import { CheckCircle2, Upload, X } from 'lucide-react';
import { incidentApi } from '../api/incidentApi';

const ResolutionModal = ({ incidentId, isOpen = true, onClose, onSuccess }) => {
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (type === 'before') {
      setBeforeFile(file);
      setBeforePreview(url);
    } else {
      setAfterFile(file);
      setAfterPreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!beforeFile || !afterFile) {
      setError('Both Before and After resolution images are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('before_image', beforeFile);
      formData.append('after_image', afterFile);

      const res = await incidentApi.submitResolutionEvidence(incidentId, formData);
      if (res?.success) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit resolution evidence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-2xl">
        <div className="modal-header">
          <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
            <CheckCircle2 className="icon-sm text-green-600" />
            <span>Submit Resolution Evidence</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X className="icon-xs" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <p className="text-xs text-gray-600">
              Upload physical BEFORE and AFTER repair photo evidence. Submitted photos are verified
              by multimodal AI before completing the work order.
            </p>

            {error && <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              {/* Before Image Input */}
              <div>
                <label className="form-label">
                  BEFORE Photo <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-lg overflow-hidden h-40 flex items-center justify-center bg-gray-50 hover:bg-gray-100/50">
                  {beforePreview ? (
                    <img src={beforePreview} alt="Before preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-4 text-center space-y-1">
                      <Upload className="icon-sm mx-auto text-gray-400" />
                      <span className="text-2xs text-gray-600 font-semibold block">BEFORE repair photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleFileChange(e, 'before')}
                    required
                  />
                </div>
              </div>

              {/* After Image Input */}
              <div>
                <label className="form-label">
                  AFTER Photo (Resolved) <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-lg overflow-hidden h-40 flex items-center justify-center bg-gray-50 hover:bg-gray-100/50">
                  {afterPreview ? (
                    <img src={afterPreview} alt="After preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-4 text-center space-y-1">
                      <Upload className="icon-sm mx-auto text-gray-400" />
                      <span className="text-2xs text-gray-600 font-semibold block">AFTER repair photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleFileChange(e, 'after')}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary text-xs" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs bg-green-600 hover:bg-green-700 font-bold" disabled={loading}>
              {loading ? 'Verifying & Submitting...' : 'Submit Resolution Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolutionModal;
