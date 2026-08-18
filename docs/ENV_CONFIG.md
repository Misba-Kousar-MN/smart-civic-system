# Smart Civic System — Environment Configuration

> **Step 8 of the Integration Blueprint**  
> This document defines the environment variable contracts for all three modules.  
> Each developer must configure their local environment from this specification.  
> **Never commit real secrets to source control. Use `.env.local` or equivalent per-developer files.**

---

## Security Rules

1. `.env` files containing real credentials must be listed in `.gitignore`.
2. Supabase `SUPABASE_SERVICE_ROLE_KEY` must ONLY be set in the Backend environment. It must never appear in Frontend or ML environment files.
3. The ML internal API key (`ML_INTERNAL_API_KEY`) must ONLY be set in Backend and ML environments.
4. No secrets should be hardcoded in source code files.
5. All sensitive values in this document are shown as `<placeholder>`. Real values are provided separately.

---

## Frontend Environment (`frontend/.env.local`)

The React Frontend uses Vite or Create React App environment variables (prefix: `VITE_` or `REACT_APP_` depending on the build tool confirmed by the Frontend developer).

```env
# ============================================================
# FRONTEND ENVIRONMENT — Smart Civic System
# ============================================================

# Supabase Project Configuration (Public — Safe for browser)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>

# Backend API Base URL
VITE_API_BASE_URL=http://localhost:4000/api/v1

# Application Environment
VITE_APP_ENV=development

# Optional: Map provider configuration (e.g., Mapbox, Google Maps)
# VITE_MAP_API_KEY=<map_api_key>
```

### Frontend Variable Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key (safe for browser) |
| `VITE_API_BASE_URL` | ✅ | Backend Express API base URL |
| `VITE_APP_ENV` | ✅ | `development` or `production` |

> **Critical**: The `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in any frontend environment file.

---

## Backend Environment (`backend/.env`)

```env
# ============================================================
# BACKEND ENVIRONMENT — Smart Civic System
# ============================================================

# Server Configuration
PORT=4000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
SUPABASE_JWT_SECRET=<supabase_jwt_secret>

# ML Service Configuration (Internal only)
ML_SERVICE_URL=http://localhost:8000/ml/v1
ML_INTERNAL_API_KEY=<ml_internal_api_key>

# Supabase Storage Configuration
SUPABASE_STORAGE_BUCKET_REPORTS=civic-reports
SUPABASE_STORAGE_BUCKET_EVIDENCE=resolution-evidence

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Application Configuration
SPATIAL_DEDUPLICATION_RADIUS_METERS=50
SLA_TIMEZONE=Asia/Kolkata
```

### Backend Variable Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server port (default: `4000`) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key (for user-context queries) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key — **backend only, never expose** |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret for token validation |
| `ML_SERVICE_URL` | ✅ | Internal URL of the FastAPI ML service |
| `ML_INTERNAL_API_KEY` | ✅ | Shared secret for Backend → ML auth |
| `SUPABASE_STORAGE_BUCKET_REPORTS` | ✅ | Storage bucket name for citizen report images |
| `SUPABASE_STORAGE_BUCKET_EVIDENCE` | ✅ | Storage bucket name for resolution evidence |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated list of allowed Frontend origins |
| `SPATIAL_DEDUPLICATION_RADIUS_METERS` | ✅ | Radius for spatial incident deduplication (default: `50`) |
| `SLA_TIMEZONE` | ✅ | Timezone for SLA deadline calculations |

---

## ML Service Environment (`ml/.env`)

```env
# ============================================================
# ML SERVICE ENVIRONMENT — Smart Civic System
# ============================================================

# FastAPI Server Configuration
HOST=0.0.0.0
PORT=8000
APP_ENV=development

# Internal Security
ML_INTERNAL_API_KEY=<ml_internal_api_key>

# Model Configuration
DETECTION_MODEL_PATH=./models/yolov8-civic-v1.2.pt
VERIFICATION_MODEL_PATH=./models/resolution-verify-v1.0.pt
DETECTION_CONFIDENCE_THRESHOLD=0.45

# Processing Configuration
MAX_IMAGE_SIZE_MB=10
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

### ML Variable Reference

| Variable | Required | Description |
|---|---|---|
| `HOST` | ✅ | FastAPI bind host |
| `PORT` | ✅ | FastAPI server port (default: `8000`) |
| `APP_ENV` | ✅ | `development` or `production` |
| `ML_INTERNAL_API_KEY` | ✅ | Must match Backend `ML_INTERNAL_API_KEY` |
| `DETECTION_MODEL_PATH` | ✅ | Path to YOLO detection model weights |
| `VERIFICATION_MODEL_PATH` | ✅ | Path to resolution verification model weights |
| `DETECTION_CONFIDENCE_THRESHOLD` | ✅ | Minimum YOLO confidence to report a detection (0.0 – 1.0) |
| `MAX_IMAGE_SIZE_MB` | ✅ | Maximum image file size for inference |
| `ALLOWED_IMAGE_TYPES` | ✅ | Comma-separated MIME types |

---

## `.gitignore` Entries (Required in Each Module)

Each module's root `.gitignore` must include:

```gitignore
# Environment files — never commit secrets
.env
.env.local
.env.development.local
.env.production.local
.env.*.local

# ML model weights — store in model registry, not Git
ml/models/
*.pt
*.onnx
*.pth
```

---

## Environment Parity Rules

| Rule | Description |
|---|---|
| Same variable names across environments | Development and production use the same variable names; only values differ |
| No hardcoded fallback secrets | Code must fail clearly if a required variable is missing, not fall back to a hardcoded string |
| Startup validation | Backend and ML service must validate all required env variables at startup and exit with a clear error if any are missing |

---

## Supabase Credential Types (Reference)

| Credential | Location | Safe for Browser? |
|---|---|---|
| `SUPABASE_URL` | Frontend, Backend | ✅ Yes |
| `SUPABASE_ANON_KEY` | Frontend, Backend | ✅ Yes (read-only with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend ONLY | ❌ No — bypasses all RLS |
| `SUPABASE_JWT_SECRET` | Backend ONLY | ❌ No |

All four values are available in the Supabase dashboard under **Project Settings → API**.

---

> **Next**: `docs/INTEGRATION_FLOW.md` — End-to-End Integration Flow (Step 9)
