import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  AlertCircle,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Check,
  Lightbulb,
  Waves,
  Wrench,
  Mic,
  Shield,
  Info
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import InteractiveMap from '../components/InteractiveMap';
import VoiceRecorder from '../components/VoiceRecorder';

// Coherent Lucide Icon Set for 5 Citizen Categories with contextual hints
const CANONICAL_CATEGORIES = [
  { id: 'Pothole', label: 'Pothole', hint: 'Road damage', icon: AlertCircle },
  { id: 'Garbage Dump', label: 'Garbage', hint: 'Waste accumulation', icon: Trash2 },
  { id: 'Streetlight Failure', label: 'Street Light', hint: 'Lighting issue', icon: Lightbulb },
  { id: 'Drainage Blockage', label: 'Drainage', hint: 'Blocked or damaged drainage', icon: Waves },
  { id: 'Other', label: 'Others', hint: 'Something else', icon: Wrench }
];

const SubmitReportPage = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Details, 2: Location, 3: Media, 4: Review

  // Step 1: Details State
  const [selectedCategory, setSelectedCategory] = useState('Pothole');
  const [description, setDescription] = useState('');

  // Step 2: Location State
  const [latitude, setLatitude] = useState('14.467389');
  const [longitude, setLongitude] = useState('75.924080');

  // Step 3: Media & Voice State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Execution & Confirmation State
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

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
        },
        (err) => {
          console.warn('[LOCATION] Geolocation warning:', err.message);
        }
      );
    }
  };

  const handleSubmitReport = async () => {
    if (loading) return;

    if (!imageFile) {
      setError('Please attach a photo of the issue in Step 3.');
      setCurrentStep(3);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('category_hint', selectedCategory);

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (voiceFile) {
        formData.append('voice_note', voiceFile);
      }
      if (voiceTranscript.trim()) {
        formData.append('voice_transcript', voiceTranscript.trim());
      }

      const res = await reportApi.submitReport(formData);

      if (res?.success && res?.data) {
        setSuccessData(res.data);
      } else {
        throw new Error(res?.message || 'Report submission failed.');
      }
    } catch (err) {
      console.error('[SUBMIT_REPORT] Error:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (successData) {
    const rep = successData.report || {};
    const reportId = rep.id ? `RPT-2025-${rep.id.substring(0, 6)}` : 'RPT-2025-000123';

    return (
      <div className="max-w-[540px] mx-auto py-8 px-4 select-none">
        <div className="bg-white p-8 rounded-[20px] border border-[#DDE7E1] shadow-[0_4px_20px_rgba(15,60,40,0.06)] space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border border-[#DDE7E1] text-[#166534] flex items-center justify-center mx-auto shadow-xs">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#17332A]">
              Report Submitted Successfully!
            </h1>
            <p className="text-xs text-[#60736B]">
              Your report has been received and routed to the appropriate municipal department.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DDE7E1] space-y-1">
            <div className="text-[10px] font-bold text-[#60736B] uppercase tracking-wider">
              REPORT REFERENCE ID
            </div>
            <div className="text-sm font-mono font-extrabold text-[#166534]">
              {reportId}
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link to={`/citizen/reports/${rep.id || 'RPT-2025'}`} className="btn-civic-primary w-full py-3 text-xs font-semibold rounded-xl">
              Track Report Progress
            </Link>
            <Link to="/citizen/dashboard" className="btn-civic-secondary w-full py-3 text-xs font-semibold rounded-xl">
              Back to Dashboard
            </Link>
          </div>

          <div className="pt-2 text-[11px] text-[#8A9A93] flex items-center justify-center gap-1.5">
            <span>🍃 Thank you for helping keep our city clean and safe</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-2 select-none space-y-5">
      
      {/* 1. Top Header Area (Subtle Back Link, Page Title & Subtitle) */}
      <div className="space-y-1">
        <Link 
          to="/citizen/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60736B] hover:text-[#166534] transition-colors mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-[#17332A] tracking-tight leading-tight">
            Submit a new report
          </h1>
          <p className="text-[13px] text-[#60736B] font-normal mt-0.5">
            Tell us what you noticed and we'll help get it to the right place.
          </p>
        </div>
      </div>

      {/* 2. Refined Horizontal Stepper Progress Indicator */}
      <div className="relative py-2 flex items-center justify-between max-w-[660px]">
        {/* Connector Line */}
        <div className="absolute top-[20px] left-[32px] right-[32px] h-[2px] bg-[#DDE7E1] -z-0" />

        {[
          { step: 1, label: 'Details' },
          { step: 2, label: 'Location' },
          { step: 3, label: 'Media' },
          { step: 4, label: 'Review' }
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className="flex items-center gap-2 z-10 bg-[#F7FAF8] pr-2 cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#166534] text-white ring-4 ring-[#166534]/15 shadow-xs'
                    : isDone
                    ? 'bg-[#15803D] text-white'
                    : 'bg-[#FFFFFF] text-[#8A9A93] border border-[#DDE7E1]'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
              </div>
              <span
                className={`text-xs transition-colors ${
                  isActive
                    ? 'font-bold text-[#166534]'
                    : isDone
                    ? 'font-semibold text-[#17332A]'
                    : 'font-medium text-[#8A9A93]'
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#FBEDEC] border border-[#DC2626]/20 text-[#DC2626] text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Details Workspace */}
      {currentStep === 1 && (
        <div className="space-y-5">
          
          {/* Section 1: Category Selection Grid */}
          <div className="space-y-3">
            <div>
              <h2 className="text-[19px] font-semibold text-[#17332A] leading-tight">
                What did you notice?
              </h2>
              <p className="text-[13px] text-[#60736B] mt-0.5">
                Choose the issue that best describes what you found.
              </p>
            </div>

            {/* 3-Column Desktop Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {CANONICAL_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`relative min-h-[110px] rounded-[16px] transition-all duration-180 cursor-pointer flex flex-col justify-between p-4 select-none text-left ${
                      isSelected
                        ? 'border-2 border-[#15803D] bg-[#F0FDF4] ring-2 ring-[#15803D]/10 shadow-xs'
                        : 'border border-[#DDE7E1] bg-white hover:bg-[#F8FAF8] hover:border-[#15803D]/40 hover:-translate-y-[1px] shadow-[0_2px_8px_rgba(15,60,40,0.03)]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#15803D] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    
                    <IconComponent
                      className={`w-6 h-6 transition-colors ${
                        isSelected ? 'text-[#15803D]' : 'text-[#15803D]'
                      }`}
                    />

                    <div className="space-y-0.5 pt-2">
                      <div className={`text-[14px] leading-snug transition-colors ${
                        isSelected ? 'font-bold text-[#14532D]' : 'font-semibold text-[#17332A]'
                      }`}>
                        {cat.label}
                      </div>
                      <div className="text-[11.5px] text-[#60736B]">
                        {cat.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Guidance Banner */}
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#DDE7E1] flex items-center gap-2.5 text-xs text-[#14532D]">
            <Shield className="w-4 h-4 text-[#15803D] shrink-0" />
            <span>Your report will be reviewed and routed to the appropriate civic team.</span>
          </div>

          {/* Section 2: Description Input Area */}
          <div className="space-y-2">
            <div>
              <h2 className="text-[18px] font-semibold text-[#17332A]">
                Tell us a little more
              </h2>
              <p className="text-[13px] text-[#60736B] mt-0.5">
                Add anything that could help us understand the issue.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="e.g. Large pothole near the bus stop..."
                rows={3}
                className="w-full h-[115px] p-4 bg-white border border-[#DDE7E1] rounded-[16px] text-[14px] text-[#17332A] placeholder-[#8A9A93] focus:outline-none focus:border-[#15803D] focus:ring-3 focus:ring-[#15803D]/10 transition-all resize-none shadow-xs"
              />
              <div className="absolute bottom-3 right-3 text-[11px] font-mono text-[#8A9A93] pointer-events-none">
                {description.length} / 500
              </div>
            </div>
          </div>

          {/* Bottom Action Area: Right-aligned Continue Button */}
          <div className="flex justify-end pt-2 pb-4">
            <button
              type="button"
              disabled={!selectedCategory}
              onClick={() => setCurrentStep(2)}
              className="h-[46px] w-[140px] bg-[#166534] hover:bg-[#14532D] disabled:bg-[#B7C1BC] text-white text-[14px] font-semibold rounded-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 2: Location Workspace */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-[#17332A]">Where is the issue?</h2>
            <p className="text-[13px] text-[#60736B] mt-0.5">Confirm the geographic location on the map.</p>
          </div>

          <div className="h-[320px] rounded-[18px] overflow-hidden border border-[#DDE7E1] shadow-xs">
            <InteractiveMap
              center={[parseFloat(latitude), parseFloat(longitude)]}
              zoom={15}
              height="100%"
              onLocationSelect={handleLocationSelect}
            />
          </div>

          <div className="p-4 rounded-[14px] bg-[#F0FDF4] border border-[#DDE7E1] space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#17332A]">
              <MapPin className="w-4 h-4 text-[#15803D]" />
              <span>Detected Area: Davangere Municipal Zone</span>
            </div>
            <div className="text-[11px] text-[#60736B] pl-5">Ward 4 · Main Civic Center Sector</div>
            <div className="text-[10px] text-[#8A9A93] font-mono pl-5">
              Coordinates: {latitude}° N, {longitude}° E
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleGeolocation}
              className="text-xs font-semibold text-[#166534] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Use Current Location</span>
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-[46px] px-5 border border-[#DDE7E1] text-[#166534] text-xs font-semibold rounded-[12px] hover:bg-[#F0FDF4]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="h-[46px] w-[140px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-[12px] flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Media Workspace */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-[#17332A]">Add visual or audio evidence</h2>
            <p className="text-[13px] text-[#60736B] mt-0.5">Photos help municipal officers identify and resolve the issue faster.</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#17332A]">Photos</div>
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-[#DDE7E1] bg-white">
                  <img src={imagePreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[10px] font-bold cursor-pointer shadow-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#DDE7E1] hover:border-[#15803D] bg-white hover:bg-[#F0FDF4] p-8 rounded-[16px] flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                <Camera className="w-8 h-8 text-[#15803D] mb-2" />
                <span className="text-xs font-semibold text-[#166534]">Click or tap to upload photo</span>
                <span className="text-[11px] text-[#8A9A93] mt-0.5">High clarity image recommended</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Voice Note Container */}
          <div className="p-4.5 rounded-[16px] bg-[#F0FDF4] border border-[#DDE7E1] space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#166534] text-white flex items-center justify-center">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#17332A]">Add a Voice Note (Optional)</div>
                <div className="text-[11px] text-[#60736B]">Describe the issue hands-free</div>
              </div>
            </div>

            <VoiceRecorder
              onRecordingComplete={({ file, transcript }) => {
                setVoiceFile(file);
                if (transcript) setVoiceTranscript(transcript);
              }}
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="h-[46px] px-5 border border-[#DDE7E1] text-[#166534] text-xs font-semibold rounded-[12px] hover:bg-[#F0FDF4]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!imageFile) {
                  setError('Please attach a photo before proceeding.');
                  return;
                }
                setError('');
                setCurrentStep(4);
              }}
              className="h-[46px] w-[140px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-[12px] flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review Workspace */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-[#17332A]">Review report summary</h2>
            <p className="text-[13px] text-[#60736B] mt-0.5">Double check your information before submitting to the city team.</p>
          </div>

          <div className="p-5 rounded-[16px] bg-white border border-[#DDE7E1] space-y-3.5 text-xs shadow-xs">
            <div className="flex justify-between border-b border-[#DDE7E1] pb-2.5">
              <span className="text-[#8A9A93] font-bold">Category</span>
              <span className="font-bold text-[#17332A]">{selectedCategory}</span>
            </div>

            <div className="border-b border-[#DDE7E1] pb-2.5 space-y-1">
              <span className="text-[#8A9A93] font-bold block">Description</span>
              <p className="text-[#17332A] font-normal italic">
                "{description || 'Factual visual inspection details attached.'}"
              </p>
            </div>

            <div className="flex justify-between border-b border-[#DDE7E1] pb-2.5">
              <span className="text-[#8A9A93] font-bold">Location</span>
              <span className="font-bold text-[#17332A]">Davangere Municipal Sector</span>
            </div>

            {imagePreview && (
              <div className="space-y-1 pt-1">
                <span className="text-[#8A9A93] font-bold block">Attached Photo</span>
                <img src={imagePreview} alt="Evidence" className="w-20 h-20 rounded-xl object-cover border border-[#DDE7E1]" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="h-[46px] px-5 border border-[#DDE7E1] text-[#166534] text-xs font-semibold rounded-[12px] hover:bg-[#F0FDF4]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={loading}
              className="h-[46px] px-6 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-[12px] flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubmitReportPage;
