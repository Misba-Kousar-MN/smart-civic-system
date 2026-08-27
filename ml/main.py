import sys
from pathlib import Path

# Add ml root to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import time
import logging
from fastapi import FastAPI, Request, File, UploadFile, Form, Header, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import config
from services import ml_service, whisper_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_fastapi")

app = FastAPI(title="Smart Civic System ML Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Pre-warm Whisper model on startup
    try:
        whisper_service.get_whisper_model()
        logger.info("[STARTUP] Whisper model pre-warmed successfully.")
    except Exception as e:
        logger.warn(f"[STARTUP] Whisper pre-warm warning: {e}")

@app.middleware("http")
async def security_header_middleware(request: Request, call_next):
    # Enforce internal API key check on all /ml/v1 endpoints
    if request.url.path.startswith("/ml/v1"):
        api_key = request.headers.get("x-internal-api-key")
        if config.ML_INTERNAL_API_KEY and api_key != config.ML_INTERNAL_API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or missing X-Internal-API-Key header"
                    }
                }
            )
    response = await call_next(request)
    return response

@app.get("/ml/v1/health")
async def health_check():
    health_data = await ml_service.check_health()
    health_data["whisper_loaded"] = whisper_service._whisper_model is not None
    return {
        "success": True,
        "data": health_data
    }

@app.post("/ml/v1/detect")
async def detect_civic_issue(
    image: UploadFile = File(...),
    report_id: str = Form(None),
    category_hint: str = Form(None)
):
    start_time = time.time()
    try:
        image_bytes = await image.read()
        res = await ml_service.detect_civic_issue(image_bytes, image.filename, report_id, category_hint=category_hint)
        
        proc_time = int((time.time() - start_time) * 1000)
        return {
            "success": True,
            "data": {
                "report_id": report_id,
                "detected": res.get("detected", False),
                "ai_category": res.get("ai_category"),
                "ai_confidence": res.get("ai_confidence"),
                "description": res.get("description"),
                "bounding_boxes": res.get("bounding_boxes", []),
                "model_version": res.get("model_version", config.ML_MODEL),
                "gemini_called": res.get("gemini_called", False),
                "gemini_http_status": res.get("gemini_http_status", 200 if not res.get("gemini_called") else 500),
                "gemini_category": res.get("gemini_category"),
                "gemini_confidence": res.get("gemini_confidence")
            },
            "processing_time_ms": proc_time
        }
    except Exception as e:
        logger.error(f"[DETECT] Endpoint error: {str(e)}")
        proc_time = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "ML_DETECTION_FAILED",
                    "message": str(e)
                }
            }
        )

@app.post("/ml/v1/verify-resolution")
async def verify_resolution(
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...),
    incident_id: str = Form(None),
    ai_category: str = Form("Other")
):
    start_time = time.time()
    try:
        before_bytes = await before_image.read()
        after_bytes = await after_image.read()

        res = await ml_service.verify_resolution(before_bytes, after_bytes, incident_id, ai_category)
        
        proc_time = int((time.time() - start_time) * 1000)
        return {
            "success": True,
            "data": {
                "incident_id": incident_id,
                "ai_verification_passed": res.get("ai_verification_passed", False),
                "ai_confidence": res.get("ai_confidence"),
                "comparison_notes": res.get("comparison_notes", "Verification processed"),
                "same_issue": res.get("same_issue", True),
                "repair_completed": res.get("repair_completed", False),
                "service_error": res.get("service_error", False),
                "model_version": res.get("model_version", config.ML_MODEL)
            },
            "processing_time_ms": proc_time
        }
    except Exception as e:
        logger.error(f"[VERIFY] Endpoint error: {str(e)}")
        proc_time = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "ML_VERIFICATION_FAILED",
                    "message": str(e)
                }
            }
        )

@app.post("/ml/v1/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...)
):
    start_time = time.time()
    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) == 0:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "EMPTY_AUDIO_PAYLOAD",
                        "message": "Uploaded audio payload is empty."
                    }
                }
            )
            
        res = whisper_service.transcribe_audio(audio_bytes, audio.filename)
        
        if not res.get("success"):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "success": False,
                    "error": {
                        "code": "UNREADABLE_AUDIO_FORMAT",
                        "message": res.get("error", "Audio payload could not be decoded or processed by Whisper.")
                    }
                }
            )

        return {
            "success": True,
            "data": {
                "transcript": res.get("transcript", ""),
                "language": res.get("language", "en"),
                "model_version": res.get("model_version", "whisper-tiny"),
                "processing_time_ms": res.get("processing_time_ms", 0)
            }
        }
    except Exception as e:
        logger.error(f"[TRANSCRIBE] Endpoint error: {str(e)}")
        proc_time = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "TRANSCRIPTION_FAILED",
                    "message": str(e)
                }
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=True)
