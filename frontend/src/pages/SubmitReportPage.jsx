import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Mic,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Navigation,
  ArrowRight,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import InteractiveMap from '../components/InteractiveMap';
import { formatCoordinates } from '../utils/locationUtils';

const SubmitReportPage = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [latitude, setLatitude] = useState('14.467389');
  const [longitude, setLongitude] = useState('75.924080');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleLocationSelect = ({ lat, lng }) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please upload photo evidence of the issue.');
      return;
    }
    if (!latitude || !longitude) {
      setError('Please select a valid GPS location.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessData(null);

      const formData = new FormData();
      formData.append('image', imageFile);
      if (voiceFile) formData.append('voice_note', voiceFile);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      if (voiceTranscript) formData.append('voice_transcript', voiceTranscript);

      const res = await reportApi.submitReport(formData);

      if (res?.success && res?.data) {
        setSuccessData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-12 select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <Link
            to="/citizen/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Submit a Civic Issue
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Step {currentStep} of 4 • Automated Multimodal AI Issue Dispatch
          </p>
        </div>

        <Link
          to="/citizen/my-reports"
          className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 transition-all self-start sm:self-auto"
        >
          View My Reports
        </Link>
      </div>

      {/* 4-Step Stepper Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
            currentStep === 1 || imagePreview
              ? 'bg-[#1769AA] text-white border-[#1769AA] shadow-xs'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 font-extrabold text-xs flex items-center justify-center">01</span>
            <div>
              <div className="text-xs font-bold">Photo Evidence</div>
              <div className="text-[10px] opacity-80">Upload clear photo</div>
            </div>
          </div>

          <span className="text-slate-300 font-bold">→</span>

          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
            currentStep === 2 || (latitude && longitude)
              ? 'bg-[#1769AA] text-white border-[#1769AA] shadow-xs'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 font-extrabold text-xs flex items-center justify-center">02</span>
            <div>
              <div className="text-xs font-bold">Location</div>
              <div className="text-[10px] opacity-80">Select on map</div>
            </div>
          </div>

          <span className="text-slate-300 font-bold">→</span>

          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
            voiceTranscript || voiceFile
              ? 'bg-[#1769AA] text-white border-[#1769AA] shadow-xs'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 font-extrabold text-xs flex items-center justify-center">03</span>
            <div>
              <div className="text-xs font-bold">Context</div>
              <div className="text-[10px] opacity-80">Provide details</div>
            </div>
          </div>

          <span className="text-slate-300 font-bold">→</span>

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-slate-50 text-slate-500 border-slate-200">
            <span className="w-6 h-6 rounded-full bg-slate-200 font-extrabold text-xs flex items-center justify-center text-slate-600">04</span>
            <div>
              <div className="text-xs font-bold">AI Routing</div>
              <div className="text-[10px] opacity-80">AI dispatch</div>
            </div>
          </div>

        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successData ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Report Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our AI model has analyzed your report and routed the workorder to the municipal department.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mx-auto text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">AI Category</span>
              <span className="font-extrabold text-[#1769AA] text-sm block mt-0.5">
                {successData.report?.ai_category || 'Civic Issue'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">SLA Deadline</span>
              <span className="font-extrabold text-amber-700 text-sm block mt-0.5">
                {new Date(successData.incident?.sla_deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSuccessData(null);
                setImageFile(null);
                setImagePreview('');
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 font-bold text-xs text-slate-700 bg-white"
            >
              Report Another Issue
            </button>
            <button
              onClick={() => navigate('/citizen/my-reports')}
              className="px-5 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4775] text-white font-bold text-xs shadow-md shadow-blue-900/20"
            >
              View My Reports →
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Controlled Photo Upload Dropzone */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Upload Photo Evidence <span className="text-red-500">*</span>
              </h3>
              <span className="text-[10px] text-slate-400">Clear photos help AI detection accuracy</span>
            </div>

            {!imagePreview ? (
              <div className="relative border-2 border-dashed border-slate-300 hover:border-[#1769AA] rounded-2xl bg-slate-50/60 p-8 text-center transition-all flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1769AA] border border-blue-100 flex items-center justify-center mb-3 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-slate-800">
                    Drag & drop image here
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">or click to browse files</div>
                </div>

                <div className="mt-4">
                  <label className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4775] text-white font-bold text-xs cursor-pointer shadow-xs inline-block">
                    Browse Files
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                      required
                    />
                  </label>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-mono">JPG, PNG, WebP up to 10MB</div>
              </div>
            ) : (
              /* Two-column preview */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
                <div className="md:col-span-5 space-y-3">
                  <div className="text-xs font-extrabold text-slate-800">Uploaded Evidence</div>
                  <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                    <div>File: {imageFile?.name}</div>
                    <div>Size: {(imageFile?.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <label className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Change
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>

                <div className="md:col-span-7 flex justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-[280px] w-full object-cover rounded-xl border border-slate-200 shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Interactive Location Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#1769AA]" /> Incident Location <span className="text-red-500">*</span>
              </h3>
              <span className="text-xs font-mono font-bold text-[#1769AA] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                GPS: {formatCoordinates(latitude, longitude)}
              </span>
            </div>

            <InteractiveMap
              height="360px"
              interactive={true}
              selectedLocation={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }}
              onLocationSelect={handleLocationSelect}
              showCurrentLocationButton={true}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Context & Notes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Additional Context (Optional)
              </h3>
            </div>

            <textarea
              rows="4"
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder="Describe any additional details about the civic issue..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#1769AA] hover:bg-[#0D4775] text-white font-bold text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Analyzing Evidence via Gemini AI...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SUBMIT CIVIC REPORT</span>
              </>
            )}
          </button>
        </form>
      )}

    </div>
  );
};

export default SubmitReportPage;
