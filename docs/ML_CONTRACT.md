# Smart Civic System — Backend ↔ ML Service API Contract

> **Step 4 of the Integration Blueprint**  
> This document defines the REST API contract between the Node.js/Express Backend and the FastAPI ML Service.  
> The ML Service is an internal microservice. It must NOT be called directly by the Frontend.  
> **No teammate may silently change a contract shape without updating this document first.**

---

## Overview

| Property | Value |
|---|---|
| Service | FastAPI ML Detection & Verification Service |
| Caller | Node.js / Express Backend only |
| Base URL (Development) | `http://localhost:8000/ml/v1` |
| Base URL (Production) | `http://<ml-service-internal>/ml/v1` |
| Protocol | Internal HTTP (private network only; never exposed publicly) |
| Request Content-Type | `application/json` or `multipart/form-data` where noted |
| Response Content-Type | `application/json` |
| Authentication | Internal service API key (`X-Internal-API-Key: <secret>`) |

---

## Authentication

All Backend → ML requests must include:

```http
X-Internal-API-Key: <ml_service_internal_key>
```

The ML service must validate this header on every request. This secret must never be exposed to the Frontend or any public environment.

---

## Standard ML Response Envelope

### Success
```json
{
  "success": true,
  "data": { ... },
  "processing_time_ms": 312
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

---

## Standard HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK — Inference completed successfully |
| `400` | Bad Request — Invalid image or missing required field |
| `401` | Unauthorized — Invalid or missing internal API key |
| `422` | Unprocessable Entity — Image quality too low for reliable inference |
| `500` | Internal Server Error — Model inference failure |
| `503` | Service Unavailable — Model not loaded or GPU resource unavailable |

---

## Endpoints

### `POST /ml/v1/detect`
Performs civic issue detection on a submitted image. Returns the predicted issue category, confidence score, bounding box data, and detection metadata.

**Caller**: Backend only  
**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | File | ✅ | JPEG, PNG, or WebP. Max 10MB. |
| `report_id` | String (UUID) | ✅ | Report ID for traceability in ML logs |

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "report_id": "uuid",
    "detected": true,
    "ai_category": "Pothole",
    "ai_confidence": 91.5,
    "bounding_boxes": [
      {
        "class": "Pothole",
        "confidence": 91.5,
        "x_min": 120,
        "y_min": 340,
        "x_max": 480,
        "y_max": 620
      }
    ],
    "image_dimensions": { "width": 1280, "height": 960 },
    "model_version": "yolov8-civic-v1.2"
  },
  "processing_time_ms": 278
}
```

**Response when no civic issue detected `200`**:
```json
{
  "success": true,
  "data": {
    "report_id": "uuid",
    "detected": false,
    "ai_category": null,
    "ai_confidence": null,
    "bounding_boxes": [],
    "model_version": "yolov8-civic-v1.2"
  },
  "processing_time_ms": 195
}
```

**Error `422` — Low quality image**:
```json
{
  "success": false,
  "error": {
    "code": "IMAGE_QUALITY_LOW",
    "message": "Image resolution or clarity is insufficient for reliable detection."
  }
}
```

---

### Supported `ai_category` Values

The ML service must only return categories from the following canonical list. The Backend must validate the returned category against this list before writing to the database.

| Category | Description |
|---|---|
| `Pothole` | Road surface pothole or depression |
| `Road Damage` | Cracked or broken road surface |
| `Garbage Dump` | Illegal garbage or waste accumulation |
| `Drainage Blockage` | Blocked stormwater drain or gutter |
| `Streetlight Failure` | Non-functional or damaged streetlight |
| `Water Leakage` | Pipe burst or water supply leakage |
| `Broken Footpath` | Damaged pedestrian walkway or footpath |
| `Encroachment` | Illegal structure or road encroachment |
| `Tree Fall` | Fallen tree blocking road or public area |
| `Manhole Uncovered` | Open or missing manhole cover |
| `Other` | Detected civic issue not in primary categories |

---

### `POST /ml/v1/verify-resolution`
Compares "before" and "after" images of a resolved civic incident to determine whether the reported issue has been physically resolved.

**Caller**: Backend only  
**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Notes |
|---|---|---|---|
| `before_image` | File | ✅ | Image before resolution (from `resolution_evidence.before_image_url`) |
| `after_image` | File | ✅ | Image after resolution (from `resolution_evidence.after_image_url`) |
| `incident_id` | String (UUID) | ✅ | For traceability in ML logs |
| `ai_category` | String | ✅ | Original detected civic issue category (e.g., `Pothole`) |

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "incident_id": "uuid",
    "ai_verification_passed": true,
    "ai_confidence": 87.3,
    "comparison_notes": "Road surface restoration detected. Pothole area patched.",
    "model_version": "resolution-verify-v1.0"
  },
  "processing_time_ms": 410
}
```

**Response when verification fails `200`**:
```json
{
  "success": true,
  "data": {
    "incident_id": "uuid",
    "ai_verification_passed": false,
    "ai_confidence": 61.2,
    "comparison_notes": "Insufficient change detected between before and after images.",
    "model_version": "resolution-verify-v1.0"
  },
  "processing_time_ms": 388
}
```

---

### `GET /ml/v1/health`
Health check endpoint for the ML service. Backend may use this to verify ML service availability before routing a report.

**Auth**: Internal API Key required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "model_loaded": true,
    "gpu_available": true,
    "model_version": "yolov8-civic-v1.2",
    "uptime_seconds": 3600
  }
}
```

**Response `503` — Model not ready**:
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "ML model is still loading. Try again in a few seconds."
  }
}
```

---

## Backend Integration Rules

1. **Never call ML directly from Frontend**: The React Frontend must never know the ML service URL or credentials.
2. **Backend validates ML output**: Before writing `ai_category` and `ai_confidence` to Supabase, the Backend must:
   - Confirm `ai_category` is in the canonical category list.
   - Confirm `ai_confidence` is a valid numeric value between `0.00` and `100.00`.
   - Handle `detected: false` gracefully (store null values in DB).
3. **ML service failure handling**: If the ML service is unavailable or returns `500`/`503`, the Backend must still store the citizen report with `ai_category = null` and `ai_confidence = null`, and retry or flag the record for manual review.
4. **Processing time logging**: The `processing_time_ms` field must be logged by the Backend for monitoring but must not be returned to the Frontend.

---

## Technology Reference

| Component | Technology |
|---|---|
| API Framework | FastAPI (Python) |
| Object Detection | YOLO (Ultralytics YOLOv8 or later) |
| Inference Backend | PyTorch |
| Image Processing | OpenCV |
| Model Format | PyTorch `.pt` or ONNX (to be confirmed by ML developer) |

---

## Contract Stability Rules

1. **`ai_category` values** — The canonical category list is stable. New categories require team agreement and a contract update.
2. **Response field additions** are non-breaking (additive).
3. **Field removal or renaming** in the response is a breaking change requiring a contract version bump.
4. **ML model updates** must preserve the same endpoint schema. A model update is not a contract change unless the category list or response fields change.

---

> **Next**: `docs/REALTIME_EVENTS.md` — Realtime Event Contract (Step 5)
