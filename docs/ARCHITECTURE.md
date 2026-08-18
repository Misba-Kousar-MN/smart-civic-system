# Smart Civic System — System Architecture Blueprint

> **System Source of Truth & Architectural Integration Guide**  
> *Target Municipality: Davanagere Municipality*

---

## Section 1 — System Overview

The **Smart Civic System** is an AI-powered civic issue detection, citizen reporting, and dynamic municipal escalation platform. It enables citizens of Davanagere Municipality to report civic issues (via images, voice notes, and spatial location data), processes incoming reports using an automated AI detection pipeline, deduplicates incidents, dynamically assigns resolution SLAs based on severity, and enforces a strict 3-level municipal escalation workflow.

### Core Application Architecture Flow
```
Citizen / Officer User
          ↓
   React Frontend
          ↓
Node.js / Express Backend
          ↓
Supabase PostgreSQL / PostGIS (13 Tables)
```

### AI Detection & Processing Flow
```
Node.js / Express Backend
          ↓
  FastAPI ML Service
          ↓
YOLO / PyTorch / OpenCV
          ↓
   Detection Result
          ↓
Node.js / Express Backend
          ↓
Supabase PostgreSQL
```

---

## Section 2 — Component Responsibilities

### A. Frontend — React

#### Responsibilities
* **User Interface & Experience (UI/UX)**: Render responsive web interfaces for citizens and municipal officers across desktop and mobile devices.
* **Authentication Views**: Provide login, registration, and session state management screens for citizens and officers.
* **Citizen Issue Submission**: Capture report inputs including image uploads, voice notes/audio inputs, and geo-location coordinates.
* **Map & Spatial Interface**: Display interactive maps for selecting issue locations and visualizing municipal incidents.
* **Dashboards**: Render specialized dashboards for citizens (report tracking), Level 1 Ward Officers, Level 2 AEEs, Level 3 Commissioners, and Administrators.
* **Incident & Resolution Tracking**: Display current incident status, assigned officer, dynamic SLA timers, escalation status, and AI resolution evidence.
* **Notifications UI**: Render real-time user notification badges and alert feeds.
* **Client Validation & API Consumption**: Perform client-side input validation and consume Node.js/Express Backend REST APIs.

#### MUST NOT
* Directly implement municipal business logic or workflow routing rules.
* Directly create incident records in the database.
* Directly perform AI classification or image analysis.
* Directly manipulate AI-protected fields (`ai_category`, `ai_confidence`).
* Directly execute municipal escalation logic.
* Bypass backend security or expose Supabase service-role credentials.
* Directly bypass Row Level Security (RLS) controls.

---

### B. Backend — Node.js / Express

#### Responsibilities
* **API Gateway & Layer**: Expose secure REST API endpoints for Frontend consumption.
* **Authentication & Authorization**: Authenticate user requests and enforce role-based and scope-based access controls.
* **Application Orchestration**: Coordinate multi-step workflows across the Database, FastAPI ML Service, and external services.
* **Report Submission Workflow**: Handle file uploads, ingest citizen reports, and trigger AI processing.
* **Incident Processing & Deduplication**: Orchestrate spatial deduplication (~50m radius check), map reports to incidents, determine primary reports, and calculate priority scores.
* **Department & SLA Assignment**: Assign incidents to appropriate municipal departments and zones, mapping priority levels to dynamic SLA deadlines.
* **Officer Workflow & Escalation**: Manage officer assignments and invoke the frozen database atomic escalation RPC (`public.trigger_incident_escalation()`).
* **Resolution & Verification Workflow**: Handle resolution evidence uploads and trigger AI verification checks before closing incidents.
* **Notification Management**: Generate system notifications for citizens and municipal officers upon status changes.
* **Database Access**: Interface securely with Supabase PostgreSQL using connection pools, service role credentials (when required for backend orchestration), and parameterised queries.

#### MUST NOT
* Expose Supabase service-role credentials to the Frontend client.
* Bypass the PostgreSQL database security model unnecessarily.
* Allow citizen clients to forge or modify AI classification results.
* Create escalation records through a competing or direct `INSERT` workflow outside `public.trigger_incident_escalation()`.
* Duplicate PostgreSQL-enforced escalation logic or trigger validation rules.

---

### C. ML Service — FastAPI

#### Responsibilities
* **Image Preprocessing**: Process incoming civic issue images (resizing, normalization, format conversion).
* **Object Detection & Classification**: Run YOLO, PyTorch, and OpenCV models to detect civic issues (e.g., potholes, garbage dumps, streetlight failures, water leakage).
* **Confidence Calculation**: Generate objective numerical confidence scores (`ai_confidence` between `0.00` and `100.00`).
* **Metadata Extraction**: Provide bounding boxes, class labels (`ai_category`), and secondary detection metadata.
* **Resolution Verification**: Compare "before" and "after" resolution images to verify whether reported civic issues have been physically resolved.

#### MUST NOT
* Directly own or execute municipal database business logic.
* Directly modify Supabase application tables (FastAPI operates strictly as a stateless processing service invoked by the Backend).
* Implement user authentication or municipal authorization logic.
* Implement officer escalation logic or department routing workflows.
* Determine database workflow transitions.

---

### D. Supabase Database — PostgreSQL / PostGIS

#### Responsibilities
* **Persistent Data Store**: Store and manage all application records across the frozen 13-table schema (`profiles`, `zones`, `departments`, `officers`, `sla_policies`, `incidents`, `reports`, `incident_reports`, `escalations`, `status_history`, `resolution_evidence`, `trust_history`, `notifications`).
* **Relational & Spatial Integrity**: Enforce foreign key constraints, unique constraints, PostGIS spatial geometries (`geography(Point, 4326)`, `geometry(Polygon, 4326)`), and spatial GIST indexing.
* **Row Level Security (RLS)**: Enforce declarative RLS policies across all 13 application tables for `authenticated` and `anon` roles.
* **Database Triggers & Integrity Rules**:
  * `enforce_profile_column_protection()`: Prevents non-admin updates to `id`, `role`, `trust_score`, `created_at`.
  * `enforce_report_ai_field_protection()`: Prevents citizen clients from forging `ai_category` or `ai_confidence`.
  * `enforce_notification_column_protection()`: Prevents non-admin updates to notification content (citizens update `is_read` only).
  * `enforce_incident_column_protection()` & `validate_officer_incident_update()`: Locks protected incident fields for Level 1/2 officers.
  * `handle_new_user()`: Automatically creates citizen profiles upon `auth.users` insertion.
* **Atomic Escalation Transaction**: Provide the sole authorized escalation creation pathway via `public.trigger_incident_escalation()`.
* **Append-Only Audit Logs**: Maintain immutable status history (`status_history`) and reputation logs (`trust_history`).
* **Realtime Publication**: Broadcast real-time change events for `incidents`, `escalations`, `resolution_evidence`, and `notifications`.

---

## Section 3 — Responsibility Boundary Matrix

| Responsibility | Frontend (React) | Backend (Express) | ML (FastAPI) | Database (Supabase) |
|---|:---:|:---:|:---:|:---:|
| **Authentication UI & Session State** | **Owner** | Integrates | — | Storage (`auth.users`) |
| **Authorization & Role Checks** | UI Guard Only | **Owner** | — | Enforces (RLS / Definer Functions) |
| **UI Renders & Dashboard Displays** | **Owner** | — | — | — |
| **Report Form & Media Submission** | **Owner** | Handles | — | Stores (`reports`) |
| **Image Preprocessing & Analysis** | — | Triggers | **Owner** | — |
| **AI Category Detection & Confidence** | — | Receives | **Owner** | Protected (`reports.ai_*`) |
| **Incident Creation & Mapping** | — | **Owner** | — | Enforces (`incidents`, `incident_reports`) |
| **Incident Spatial Deduplication** | — | Orchestrates | — | PostGIS Spatial Index & Queries |
| **Priority & Dynamic SLA Calculation**| — | **Owner** | — | Master Config (`sla_policies`) |
| **Officer Assignment & Scope Checks** | — | **Owner** | — | Hierarchy Checks (`officers`) |
| **Escalation Execution** | Requests | Orchestrates | — | **Owner** (`trigger_incident_escalation`) |
| **Audit Log Generation** | — | Writes | — | **Owner** (`status_history`, `trust_history`) |
| **Notification Processing** | UI Alert Feed | Triggers | — | Stores & Broadcasts (`notifications`) |
| **Realtime Event Broadcast** | Subscribes | Subscribes/Triggers | — | **Owner** (`supabase_realtime`) |
| **Spatial Geofencing & Indexing** | Map Coordinates | Queries | — | **Owner** (PostGIS GIST) |
| **Data Persistence & Integrity** | — | — | — | **Owner** (13 Frozen Tables) |
| **Row Level Security Enforcement** | — | — | — | **Owner** (Declarative RLS) |

---

## Section 4 — High-Level Data Flows

### Flow 1 — Citizen Report Workflow
```
[Frontend]
   │ 1. Citizen submits image, voice note, geo-coordinates
   ▼
[Backend]
   │ 2. Validates request & authenticates user
   │ 3. Stores raw report media & invokes ML Service for analysis
   │ 4. Receives AI detection results
   │ 5. Executes spatial deduplication check against Supabase PostGIS
   │ 6. Creates new Incident OR links Report to existing Incident
   ▼
[Supabase Database]
   │ 7. Persists `reports`, `incidents`, `incident_reports` records
   ▼
[Frontend]
   └ 8. Displays submission confirmation and Incident Tracking ID
```

### Flow 2 — AI Detection Workflow
```
[Frontend / Client Upload]
   │ 1. Media payload received by Backend
   ▼
[Backend]
   │ 2. Sends image buffer/URL to FastAPI ML Service (`POST /ml/v1/detect`)
   ▼
[FastAPI ML Service]
   │ 3. Preprocesses image (YOLO / PyTorch / OpenCV)
   │ 4. Detects civic issue class & computes confidence percentage
   │ 5. Returns structured detection payload to Backend
   ▼
[Backend]
   │ 6. Writes verified AI fields (`ai_category`, `ai_confidence`) to Supabase
   ▼
[Supabase Database]
   └ 7. Protected triggers validate service-role origin and store AI data
```

### Flow 3 — Incident Lifecycle & Resolution Workflow
```
[Citizen Report]
   ▼
[Backend Incident Processing] (Determines Department, Zone, Priority Score, SLA)
   ▼
[Incident Created in OPEN state]
   ▼
[Municipal Officer Assignment] (Assigned to Ward Officer / JE - Level 1)
   ▼
[Officer Action] (Officer updates status to IN_PROGRESS via Backend API)
   ▼
[Resolution Submitted] (Officer uploads "before" & "after" evidence)
   ▼
[AI Resolution Verification] (FastAPI ML Service verifies physical resolution)
   ▼
[Incident CLOSED] (Status updated to RESOLVED/CLOSED; trust points awarded)
```

### Flow 4 — Dynamic Escalation Workflow
```
[Level 1 / Level 2 Officer]
   │ 1. Requests escalation via Backend API with valid justification
   ▼
[Backend]
   │ 2. Authenticates officer & validates departmental/zone scope
   │ 3. Calls `public.trigger_incident_escalation(p_incident_id, p_reason)` RPC
   ▼
[Supabase PostgreSQL Transaction]
   │ 4. Locks incident row `FOR UPDATE`
   │ 5. Validates current level & checks allowed progression (1→2 or 2→3)
   │ 6. Inserts `escalations` record
   │ 7. Updates `incidents.current_level` & sets status to `ESCALATED`
   │ 8. Appends entry to `status_history`
   │ 9. Commits single atomic transaction
   ▼
[Realtime & Notifications]
   └ 10. Realtime event notifies higher-level officer (Level 2 AEE or Level 3 Commissioner)
```

### Flow 5 — Realtime Event Pipeline
```
[Supabase Database Event] (INSERT/UPDATE on `incidents`, `escalations`, `notifications`)
   │
   ▼
[Supabase Realtime Publication] (`supabase_realtime`)
   │
   ├─────────────────────────────────────────┐
   ▼                                         ▼
[Backend Webhook / Subscriber]     [Frontend Realtime Client]
(Triggers push notifications)      (Updates UI badges & live dashboards)
```

---

## Section 5 — Security Architecture & Guidelines

1. **Untrusted Client Principle**: The React Frontend is an untrusted client environment. All security checks, authorization validation, and business rule enforcement must occur at the Backend or Database layer.
2. **Backend Orchestration Layer**: The Node.js/Express Backend is the sole authoritative application orchestration layer. Service-role credentials must reside exclusively on the Backend server.
3. **Internal ML Service Isolation**: The FastAPI ML Service is an internal microservice. It must only be accessible to the Backend server and must not accept direct unauthenticated requests from public clients.
4. **Active Row Level Security (RLS)**: Supabase RLS is enabled across all 13 tables. RLS policies enforce role-based access for citizens, officers, and admins.
5. **AI Field Forgery Prevention**: Database `BEFORE INSERT OR UPDATE` triggers (`enforce_report_ai_field_protection()`) guarantee that citizen clients cannot forge `ai_category` or `ai_confidence` fields.
6. **Strict Atomic Escalation**: Escalations cannot be inserted directly by ordinary authenticated users via direct table queries. All escalations must execute via `public.trigger_incident_escalation()`.
7. **Database Column Protection Triggers**: Database triggers enforce strict field immutability on `profiles`, `incidents`, `reports`, and `notifications` to prevent illegal column updates.
8. **Append-Only Audit Logs**: `status_history` and `trust_history` tables strictly disallow `UPDATE` and `DELETE` operations for application users to preserve audit integrity.

---

## Section 6 — Development Ownership & Directory Structure

To allow three developers to build independently without code conflicts or contract mismatches, the project repository is partitioned into three distinct top-level directories:

```
smart-civic-system/
├── frontend/             # Owned by Developer 1 (React Frontend UI/UX)
├── backend/              # Owned by Developer 2 (Node.js/Express API Orchestrator)
├── ml/                   # Owned by Developer 3 (FastAPI AI/YOLO Detection Service)
├── supabase/             # Shared Database Configuration & Migrations
└── docs/                 # Shared Architectural Source of Truth & Interface Contracts
```

### Module Boundaries
* **`frontend/`**: Contains React UI code, page routes, dashboard layouts, map components, state management, and API client modules.
* **`backend/`**: Contains Express controllers, routes, authentication middleware, Supabase service client, ML integration service, deduplication logic, and notification orchestrators.
* **`ml/`**: Contains FastAPI app scripts, YOLO model weights, PyTorch inference pipelines, OpenCV preprocessing scripts, and API request schemas.

### Contract Directory (`docs/`)
Shared interface contracts will be documented in separate step-by-step specification files:
* `docs/API_CONTRACT.md` *(To be created in Step 3)*
* `docs/ML_CONTRACT.md` *(To be created in Step 4)*
* `docs/REALTIME_EVENTS.md` *(To be created in Step 5)*

---

## Section 7 — Integration Principle

> **"IMPLEMENTATION MAY CHANGE INTERNALLY, BUT INTERFACE CONTRACTS MUST REMAIN STABLE."**

### Operational Guidelines
1. **Frontend Independence**: The React Frontend depends exclusively on the documented Backend REST API contracts (`docs/API_CONTRACT.md`). Internal backend code refactoring must not break expected API request/response structures.
2. **ML Service Independence**: The Node.js Backend depends exclusively on the documented ML Service API contract (`docs/ML_CONTRACT.md`). Internal model weights or inference optimization in the ML service must preserve the established REST endpoint schema.
3. **Database Contract Stability**: The Backend depends on the frozen 13-table Supabase database schema and RPC definitions (`docs/DATABASE_CONTRACT.md`).
4. **Explicit Contract Updates**: No developer may unilaterally modify an inter-module API request schema, database table structure, or RPC function signature. Any proposed contract modification must be documented and agreed upon in the corresponding specification file under `docs/` before implementation begins.

---

## Section 8 — Frozen Architectural Components

The following core architectural elements are **FROZEN** and must not be altered:

1. **13-Table Database Schema**: The exact 13 application tables (`profiles`, `zones`, `departments`, `officers`, `sla_policies`, `incidents`, `reports`, `incident_reports`, `escalations`, `status_history`, `resolution_evidence`, `trust_history`, `notifications`).
2. **Supabase PostgreSQL / PostGIS Foundation**: Spatial data handling via `geography(Point, 4326)` and `geometry(Polygon, 4326)`.
3. **Row Level Security (RLS) & Protection Triggers**: Database-level security functions and column immutability triggers.
4. **Atomic Escalation Workflow**: The `public.trigger_incident_escalation()` RPC as the sole application escalation creation pathway.
5. **Architectural Tier Hierarchy**: React Frontend → Node.js/Express Backend → Supabase Database / FastAPI ML Service.
6. **Backend as Application Orchestrator**: Node.js/Express Backend as the central authority for business logic, authentication, and service orchestration.

---

## Section 9 — What Will Be Defined Next

The project integration blueprint will be completed in sequential, dedicated specification steps:

* **STEP 2**: Database Contract (`docs/DATABASE_CONTRACT.md`)
* **STEP 3**: Backend ↔ Frontend API Contract (`docs/API_CONTRACT.md`)
* **STEP 4**: Backend ↔ ML API Contract (`docs/ML_CONTRACT.md`)
* **STEP 5**: Realtime Event Contract (`docs/REALTIME_EVENTS.md`)
* **STEP 6**: Authentication & Role Contract (`docs/AUTH_CONTRACT.md`)
* **STEP 7**: Error & Response Standards (`docs/ERROR_STANDARDS.md`)
* **STEP 8**: Environment Configuration (`docs/ENV_CONFIG.md`)
* **STEP 9**: End-to-End Integration Flow (`docs/INTEGRATION_FLOW.md`)
* **STEP 10**: Developer README & Handoff Guide (`README.md`)
