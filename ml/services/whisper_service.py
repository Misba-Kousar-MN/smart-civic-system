import time
import tempfile
import os
import logging
import whisper

try:
    import imageio_ffmpeg
    import shutil
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    target_ffmpeg_exe = os.path.join(ffmpeg_dir, 'ffmpeg.exe')
    if not os.path.exists(target_ffmpeg_exe):
        shutil.copyfile(ffmpeg_exe, target_ffmpeg_exe)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.path.pathsep + os.environ.get("PATH", "")
except Exception as _e:
    pass

logger = logging.getLogger("whisper_service")

# Singleton model instance loaded ONCE
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        logger.info("[WHISPER] Loading Whisper 'tiny' speech-to-text model...")
        _whisper_model = whisper.load_model("tiny")
        logger.info("[WHISPER] Whisper model loaded successfully.")
    return _whisper_model

def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm"):
    start_time = time.time()
    model = get_whisper_model()
    
    clean_name = filename.split(';')[0] if filename else "audio.webm"
    ext = os.path.splitext(clean_name)[1].lower() if clean_name else ".webm"
    if ext not in [".webm", ".mp4", ".wav", ".ogg", ".mp3", ".m4a", ".aac", ".flac"]:
        ext = ".webm"
        
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
        
    try:
        result = model.transcribe(tmp_path, fp16=False)
        proc_time_ms = int((time.time() - start_time) * 1000)
        
        transcript_text = result.get("text", "").strip()
        language = result.get("language", "en")
        
        return {
            "success": True,
            "transcript": transcript_text,
            "language": language,
            "model_version": "whisper-tiny",
            "processing_time_ms": proc_time_ms
        }
    except Exception as e:
        logger.warn(f"[WHISPER] Transcription warning (audio unreadable/invalid format): {str(e)}")
        proc_time_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "transcript": None,
            "language": "en",
            "model_version": "whisper-tiny",
            "processing_time_ms": proc_time_ms,
            "error": str(e)
        }
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
