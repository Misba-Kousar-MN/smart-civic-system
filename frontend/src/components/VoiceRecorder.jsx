import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, RefreshCw, AlertCircle, Loader2, Sparkles, CheckCircle2, Edit3, Check } from 'lucide-react';
import { reportApi } from '../api/reportApi';

const VoiceRecorder = ({
  onRecordingComplete,
  onAudioRecorded,
  onAudioDiscarded,
  onTranscriptGenerated,
  existingTranscript = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [error, setError] = useState('');
  
  // Transcription State Machine: 'IDLE' | 'TRANSCRIBING' | 'SUCCESS' | 'EMPTY_SPEECH' | 'FAILED'
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(existingTranscript);
  const [transcribeState, setTranscribeState] = useState(existingTranscript ? 'SUCCESS' : 'IDLE');
  const [transcribeErrorMessage, setTranscribeErrorMessage] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (existingTranscript) {
      setTranscript(existingTranscript);
      setEditedTranscript(existingTranscript);
      setTranscribeState('SUCCESS');
    }
  }, [existingTranscript]);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const t of types) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const notifyParent = (fileObj, text) => {
    if (onRecordingComplete) {
      onRecordingComplete({ file: fileObj, transcript: text });
    }
    if (onAudioRecorded) {
      onAudioRecorded(fileObj);
    }
    if (onTranscriptGenerated && text) {
      onTranscriptGenerated(text);
    }
  };

  const runTranscription = async (fileObj) => {
    if (!fileObj) return;
    try {
      setTranscribing(true);
      setTranscribeErrorMessage('');
      setTranscribeState('TRANSCRIBING');

      const formData = new FormData();
      formData.append('voice_note', fileObj);

      const res = await reportApi.transcribeAudio(formData);
      if (res?.success && res?.data) {
        if (res.data.empty_speech || !res.data.transcript) {
          setTranscribeState('EMPTY_SPEECH');
          setTranscribeErrorMessage('Whisper could not detect speech in this recording. Please try speaking clearly.');
          notifyParent(fileObj, '');
        } else {
          const text = res.data.transcript;
          setTranscript(text);
          setEditedTranscript(text);
          setTranscribeState('SUCCESS');
          notifyParent(fileObj, text);
        }
      } else {
        setTranscribeState('FAILED');
        setTranscribeErrorMessage(res?.message || 'Unable to transcribe this recording right now.');
        notifyParent(fileObj, '');
      }
    } catch (err) {
      console.warn('[VOICE_RECORDER] Whisper transcription warning:', err.message);
      setTranscribeState('FAILED');
      setTranscribeErrorMessage(err.message || 'Speech-to-text service unavailable.');
      notifyParent(fileObj, '');
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    setError('');
    setTranscribeErrorMessage('');
    setTranscript('');
    setEditedTranscript('');
    setIsEditingTranscript(false);
    audioChunksRef.current = [];
    setRecordingTime(0);
    setFinalDuration(0);
    setTranscribeState('IDLE');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser does not support microphone audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const rawMime = mediaRecorder.mimeType || 'audio/webm';
        const cleanMime = rawMime.split(';')[0].trim();
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });

        if (!audioBlob || audioBlob.size === 0) {
          setError('Recorded audio file is empty. Please try recording again.');
          return;
        }

        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const ext = cleanMime.includes('webm') ? 'webm' : cleanMime.includes('mp4') ? 'mp4' : cleanMime.includes('wav') ? 'wav' : 'ogg';
        const fileObj = new File([audioBlob], `voice_note_${Date.now()}.${ext}`, { type: cleanMime });
        setAudioFile(fileObj);

        stopTracks();

        // Transcribe immediately after recording stops
        runTranscription(fileObj);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[VOICE_RECORDER] Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser.');
      } else {
        setError('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setFinalDuration(recordingTime > 0 ? recordingTime : 1);
    }
  };

  const handleDiscard = () => {
    setAudioUrl('');
    setAudioFile(null);
    setRecordingTime(0);
    setFinalDuration(0);
    setTranscript('');
    setEditedTranscript('');
    setIsEditingTranscript(false);
    setTranscribeState('IDLE');
    setTranscribing(false);
    setTranscribeErrorMessage('');
    audioChunksRef.current = [];

    if (onAudioDiscarded) {
      onAudioDiscarded();
    }
    if (onRecordingComplete) {
      onRecordingComplete({ file: null, transcript: '' });
    }
  };

  const handleSaveEditedTranscript = () => {
    setIsEditingTranscript(false);
    setTranscript(editedTranscript);
    notifyParent(audioFile, editedTranscript);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = finalDuration > 0 ? finalDuration : recordingTime;

  return (
    <div className="space-y-4 bg-[#F0F8F5] p-5 rounded-[20px] border border-[#B8E0CB] shadow-xs select-none">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#1F5443] font-extrabold text-xs">
          <Mic className={`w-4 h-4 ${isRecording ? 'text-[#A6473D] animate-pulse' : 'text-[#349670]'}`} />
          <span>
            {isRecording
              ? 'Recording Voice Note...'
              : audioUrl
              ? `Voice Note Recorded · ${formatTime(displayDuration)}`
              : 'Add a Voice Note (Optional)'}
          </span>
        </div>

        {isRecording && (
          <div className="px-3 py-1 bg-[#FAECEB] border border-[#F3C5BF] text-[#A6473D] text-xs font-mono font-bold rounded-full animate-pulse">
            {formatTime(recordingTime)}
          </div>
        )}

        {!isRecording && audioUrl && (
          <span className="text-[11px] font-mono font-bold text-[#1F5443] bg-[#DCF0E6] px-2.5 py-0.5 rounded-full border border-[#B8E0CB]">
            {formatTime(displayDuration)}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#FAECEB] border border-[#F3C5BF] text-[#A6473D] text-xs rounded-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#A6473D]" />
          <span>{error}</span>
        </div>
      )}

      {/* STATE 1: Not Recorded Button */}
      {!isRecording && !audioUrl && (
        <div className="space-y-2">
          <p className="text-xs text-[#174437] font-medium">
            Describe the civic issue hands-free using your voice. Whisper AI will automatically transcribe your speech into report text.
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="w-full py-3.5 px-4 bg-[#349670] hover:bg-[#2B8260] text-white text-xs font-extrabold rounded-[12px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Tap to Record Voice Note</span>
          </button>
        </div>
      )}

      {/* STATE 2: Recording Controls */}
      {isRecording && (
        <button
          type="button"
          onClick={stopRecording}
          className="w-full py-3.5 px-4 bg-[#A6473D] hover:bg-[#8F3A31] text-white text-xs font-black rounded-[12px] flex items-center justify-center gap-2 shadow-md animate-pulse transition-all cursor-pointer"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>Stop Recording ({formatTime(recordingTime)})</span>
        </button>
      )}

      {/* STATE 3, 4, 5, 6: Recorded Audio Player & Realtime Whisper Transcript */}
      {audioUrl && !isRecording && (
        <div className="space-y-3 pt-1">
          {/* Audio Player Component */}
          <div className="p-2.5 bg-[#E6F4ED] rounded-xl border border-[#B8E0CB] space-y-1">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onLoadedMetadata={(e) => {
                if (e.target.duration && isFinite(e.target.duration)) {
                  setFinalDuration(Math.round(e.target.duration));
                }
              }}
              className="w-full h-10 rounded-lg"
            />
          </div>

          {/* Action Buttons: Re-record & Discard */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 py-2 px-3 bg-[#DCF0E6] hover:bg-[#CEEADA] border border-[#B8E0CB] text-[#174437] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-record</span>
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              className="py-2 px-3 bg-[#FAECEB] hover:bg-[#F5D8D5] text-[#A6473D] border border-[#F3C5BF] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          </div>

          {/* VOICE TRANSCRIPT CARD */}
          <div className="pt-2 border-t border-[#B8E0CB] space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#1F5443]">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#349670]" />
                <span>VOICE TRANSCRIPT</span>
              </span>
              <span className="text-[11px] font-semibold text-[#75998C] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#349670]" />
                Whisper Speech-to-Text
              </span>
            </div>

            {/* STATE 3: TRANSCRIBING */}
            {transcribing && (
              <div className="p-4 bg-[#E6F4ED] rounded-[14px] border border-[#B8E0CB] text-xs text-[#174437] font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-[#349670] animate-spin" />
                <span>⏳ Transcribing your voice note with Whisper AI...</span>
              </div>
            )}

            {/* STATE 4: TRANSCRIPTION SUCCESS */}
            {transcribeState === 'SUCCESS' && !transcribing && (
              <div className="p-4 bg-[#E6F4ED] rounded-[14px] border border-[#B8E0CB] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#216D51] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-[#216D51]" />
                    <span>✓ Transcribed with Whisper</span>
                  </span>

                  {!isEditingTranscript && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTranscript(true)}
                      className="text-[11px] font-bold text-[#174437] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-[#349670]" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingTranscript ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editedTranscript}
                      onChange={(e) => setEditedTranscript(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#B8E0CB] rounded-xl text-xs text-[#174437] font-medium focus:outline-none focus:border-[#349670]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingTranscript(false)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#75998C]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedTranscript}
                        className="px-3 py-1 bg-[#349670] text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save Edit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-[#174437] font-semibold leading-relaxed italic bg-[#F0F8F5] p-3 rounded-xl border border-[#B8E0CB]/60">
                    "{transcript}"
                  </p>
                )}
              </div>
            )}

            {/* STATE 5: TRANSCRIPTION FAILED */}
            {transcribeState === 'FAILED' && !transcribing && (
              <div className="p-4 bg-[#FAECEB] rounded-[14px] border border-[#F3C5BF] text-xs space-y-2">
                <div className="text-[#A6473D] font-bold">
                  ⚠ {transcribeErrorMessage || 'Unable to transcribe this recording right now.'}
                </div>
                <div className="text-[#A6473D] text-[11px]">
                  Your voice note is still attached to the report.
                </div>
                <button
                  type="button"
                  onClick={() => runTranscription(audioFile)}
                  className="px-3 py-1.5 bg-[#349670] text-white font-extrabold text-[11px] rounded-lg hover:bg-[#2B8260] cursor-pointer"
                >
                  Retry Transcription
                </button>
              </div>
            )}

            {/* STATE 6: EMPTY SPEECH DETECTED */}
            {transcribeState === 'EMPTY_SPEECH' && !transcribing && (
              <div className="p-4 bg-[#FAECEB] rounded-[14px] border border-[#F3C5BF] text-xs space-y-2">
                <div className="text-[#A6473D] font-bold">
                  ⚠ Whisper could not detect speech in this recording.
                </div>
                <div className="text-[#A6473D] text-[11px]">
                  Please try speaking clearly into the microphone.
                </div>
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1.5 bg-[#349670] text-white font-extrabold text-[11px] rounded-lg hover:bg-[#2B8260] cursor-pointer"
                >
                  Re-record Voice Note
                </button>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default VoiceRecorder;
