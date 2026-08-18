# Smart Civic System

> **AI-Powered Smart Civic Issue Detection, Reporting & Municipal Escalation Platform**  
> Designed for Davanagere Municipality

---

## What This System Does

The Smart Civic System allows citizens of Davanagere Municipality to report civic issues (potholes, garbage dumps, broken streetlights, water leakage) by submitting an image and their GPS location. The system automatically classifies the issue using AI, detects duplicate reports for the same incident, assigns the issue to the correct municipal department and zone, computes a dynamic SLA deadline, and routes the incident through a 3-level municipal officer hierarchy (Ward Officer → AEE → Commissioner) with a fully audited escalation and resolution workflow.

---

## Architecture Overview

```
React Frontend  ──────► Node.js / Express Backend ──────► Supabase PostgreSQL / PostGIS
                                   │
                                   ▼
                        FastAPI ML Service (YOLO / PyTorch / OpenCV)
```

| Module | Technology | Port (Dev) |
|---|---|---|
| Frontend | React (Vite or CRA) | `3000` / `5173` |
| Backend | Node.js + Express | `4000` |
| ML Service | FastAPI + YOLO + PyTorch | `8000` |
| Database | Supabase PostgreSQL + PostGIS | Supabase cloud |

---

## Repository Structure

```
smart-civic-system/
├── frontend/             # React UI (Developer 1)
├── backend/              # Node.js/Express API (Developer 2)
├── ml/                   # FastAPI ML Service (Developer 3)
├── supabase/
│   ├── migrations/
│   │   └── 20260817140108_smart_civic_system.sql   # FROZEN — DO NOT MODIFY
│   └── .gitignore
└── docs/                 # Architectural contracts — read before coding
    ├── ARCHITECTURE.md         # System architecture blueprint
    ├── DATABASE_CONTRACT.md    # 13-table schema reference (FROZEN)
    ├── API_CONTRACT.md         # Backend ↔ Frontend REST API contract
    ├── ML_CONTRACT.md          # Backend ↔ ML Service API contract
    ├── REALTIME_EVENTS.md      # Supabase Realtime event contract
    ├── AUTH_CONTRACT.md        # Authentication & role model
    ├── ERROR_STANDARDS.md      # Error codes & response standards
    ├── ENV_CONFIG.md           # Environment variable reference
    └── INTEGRATION_FLOW.md     # End-to-end workflow traces
```

---

## Quick Start — Developer Setup

### Prerequisites

- Node.js `>= 18`
- Python `>= 3.10`
- Git
- Supabase CLI (for local database work)
- A Supabase project (already provisioned — see team lead for credentials)

---

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd smart-civic-system
```

---

### Step 2 — Configure Your Module's Environment

Copy the environment template for your module and fill in the values provided by the team lead.

#### Frontend
```bash
cd frontend
cp .env.example .env.local
# Fill in: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
```

#### Backend
```bash
cd backend
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#           SUPABASE_JWT_SECRET, ML_SERVICE_URL, ML_INTERNAL_API_KEY
```

#### ML Service
```bash
cd ml
cp .env.example .env
# Fill in: ML_INTERNAL_API_KEY, DETECTION_MODEL_PATH, VERIFICATION_MODEL_PATH
```

> See [`docs/ENV_CONFIG.md`](docs/ENV_CONFIG.md) for the complete variable reference for every module.

---

### Step 3 — Install Dependencies

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
npm install
```

#### ML Service
```bash
cd ml
pip install -r requirements.txt
```

---

### Step 4 — Run Your Module Locally

#### Frontend
```bash
cd frontend
npm run dev
# Available at http://localhost:5173
```

#### Backend
```bash
cd backend
npm run dev
# Available at http://localhost:4000
```

#### ML Service
```bash
cd ml
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Available at http://localhost:8000
```

---

### Step 5 — Verify Integration

With all three services running:

1. Open `http://localhost:5173` in a browser.
2. Register a new citizen account.
3. Confirm a profile is auto-created in your Supabase dashboard under `public.profiles`.
4. Submit a test civic issue report.
5. Confirm the report appears in `public.reports` and a linked incident in `public.incidents`.
6. Check the ML service health: `GET http://localhost:8000/ml/v1/health`.

---

## Database

The database is deployed on Supabase and contains exactly **13 application tables**. The schema is **FROZEN**.

| Key Fact | Value |
|---|---|
| Tables | 13 (frozen) |
| Migration File | `supabase/migrations/20260817140108_smart_civic_system.sql` |
| Supabase Project | `smart-civic-system` |
| Spatial Extension | PostGIS (enabled) |
| RLS | Active on all 13 tables |
| Escalation | Atomic RPC: `public.trigger_incident_escalation()` |

> **Do not run any DDL (CREATE TABLE, ALTER TABLE, DROP TABLE) against the Supabase project without an explicit, team-agreed schema change.** The migration file is the single source of truth for the schema.

Full schema documentation: [`docs/DATABASE_CONTRACT.md`](docs/DATABASE_CONTRACT.md)

---

## Contracts — Read Before Writing Code

Every interface between modules is documented in `docs/`. Read the relevant contract **before** implementing any feature that touches another module's boundary.

| Document | When to Read |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Before starting any work |
| [`DATABASE_CONTRACT.md`](docs/DATABASE_CONTRACT.md) | Before any Supabase query |
| [`API_CONTRACT.md`](docs/API_CONTRACT.md) | Frontend dev: before building any API call; Backend dev: before building any endpoint |
| [`ML_CONTRACT.md`](docs/ML_CONTRACT.md) | Backend dev: before calling ML; ML dev: before building any endpoint |
| [`REALTIME_EVENTS.md`](docs/REALTIME_EVENTS.md) | Frontend dev: before implementing live updates |
| [`AUTH_CONTRACT.md`](docs/AUTH_CONTRACT.md) | All developers: before implementing any auth or access control |
| [`ERROR_STANDARDS.md`](docs/ERROR_STANDARDS.md) | Backend dev: before writing any error response; Frontend dev: before writing error handlers |
| [`ENV_CONFIG.md`](docs/ENV_CONFIG.md) | All developers: before configuring local environment |
| [`INTEGRATION_FLOW.md`](docs/INTEGRATION_FLOW.md) | All developers: to understand the full end-to-end workflow |

---

## Roles & Ownership

| Module | Owner | Primary Contact |
|---|---|---|
| `frontend/` | Developer 1 (Frontend) | — |
| `backend/` | Developer 2 (Backend) | — |
| `ml/` | Developer 3 (ML) | — |
| `docs/` + `supabase/` | All (shared) | Team Lead |

Each developer works independently within their assigned module. Cross-module changes require coordination and a contract document update first.

---

## Security Reminders

- **Never commit `.env` files** containing real credentials.
- **Never put `SUPABASE_SERVICE_ROLE_KEY`** in the frontend environment.
- **Never expose the ML service** publicly — it is an internal service behind the backend.
- **All escalations** must go through `public.trigger_incident_escalation()` — no direct `INSERT` into `escalations`.
- **AI fields** (`ai_category`, `ai_confidence`) must only be written by the Backend using the service role.
- **Citizens cannot create incidents** — incident creation is an internal backend workflow.

---

## Key Frozen Contracts

> These items must not be changed without explicit team agreement and contract document update:

1. 13-table database schema
2. `public.trigger_incident_escalation()` as the sole escalation path
3. Escalation levels: strictly Level 1 → 2 or Level 2 → 3 only
4. Backend as the sole orchestrator (Frontend does not call ML directly)
5. Supabase as the PostgreSQL/Auth/Storage/Realtime provider
6. Officer hierarchy: Level 1 (Ward Officer), Level 2 (AEE), Level 3 (Commissioner)

---

## Getting Help

1. Read the relevant contract document in `docs/` first.
2. Check [`docs/INTEGRATION_FLOW.md`](docs/INTEGRATION_FLOW.md) to understand the expected behaviour.
3. Raise the issue with the team before modifying any shared contract.