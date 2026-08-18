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
from services import ml_service

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
    return {
        "success": True,
        "data": health_data
    }

@app.post("/ml/v1/detect")
async def detect_civic_issue(
    image: UploadFile = File(...),
    report_id: str = Form(None)
):
    start_time = time.time()
    try:
        image_bytes = await image.read()
        res = await ml_service.detect_civic_issue(image_bytes, image.filename, report_id)
        
        proc_time = int((time.time() - start_time) * 1000)
        return {
            "success": True,
            "data": {
                "report_id": report_id,
                "detected": res.get("detected", False),
                "ai_category": res.get("ai_category"),
                "ai_confidence": res.get("ai_confidence"),
                "bounding_boxes": res.get("bounding_boxes", []),
                "model_version": res.get("model_version", config.ML_MODEL)
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
                "ai_verification_passed": res.get("ai_verification_passed", True),
                "ai_confidence": res.get("ai_confidence", 80.0),
                "comparison_notes": res.get("comparison_notes", "Verification processed"),
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=True)
