# Smart Civic System — Backend ↔ Frontend API Contract

> **Step 3 of the Integration Blueprint**  
> This document defines the REST API contract between the Node.js/Express Backend and the React Frontend.  
> All endpoints, request shapes, and response shapes documented here form the stable interface contract.  
> **No teammate may silently change a contract shape without updating this document first.**

---

## General Conventions

| Property | Value |
|---|---|
| Base URL (Development) | `http://localhost:4000/api/v1` |
| Base URL (Production) | `https://<backend-domain>/api/v1` |
| Protocol | HTTPS (production) |
| Request Content-Type | `application/json` (unless multipart for uploads) |
| Response Content-Type | `application/json` |
| Authentication | Supabase JWT Bearer Token (`Authorization: Bearer <token>`) |
| API Versioning | `/api/v1/` prefix |

---

## Authentication Headers

All protected endpoints require:

```http
Authorization: Bearer <supabase_access_token>
```

The Frontend obtains the Supabase JWT from `supabase.auth.getSession()`. The Backend validates the token server-side using the Supabase JWT secret.

---

## Standard Response Envelope

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

### Error Response
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
| `200` | OK — Request succeeded |
| `201` | Created — Resource created successfully |
| `400` | Bad Request — Validation error or malformed input |
| `401` | Unauthorized — Missing or invalid JWT |
| `403` | Forbidden — Authenticated but insufficient role/scope |
| `404` | Not Found — Resource does not exist |
| `409` | Conflict — Duplicate or state conflict |
| `422` | Unprocessable Entity — Business logic violation |
| `500` | Internal Server Error — Unexpected server failure |

---

## Endpoint Groups

1. [Auth & Profile](#1-auth--profile)
2. [Reports (Citizen Submissions)](#2-reports-citizen-submissions)
3. [Incidents](#3-incidents)
4. [Officers](#4-officers)
5. [Escalations](#5-escalations)
6. [Resolution Evidence](#6-resolution-evidence)
7. [Notifications](#7-notifications)
8. [Master Data (Zones, Departments, SLA)](#8-master-data)

---

## 1. Auth & Profile

### `GET /profile/me`
Returns the authenticated user's profile.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Citizen Name",
    "phone_number": "+91XXXXXXXXXX",
    "role": "citizen",
    "trust_score": 95,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### `PATCH /profile/me`
Updates the authenticated citizen's own profile (allowed fields: `full_name`, `phone_number` only).

**Auth**: Required  
**Role**: Any authenticated user

**Request Body**:
```json
{
  "full_name": "Updated Name",
  "phone_number": "+91XXXXXXXXXX"
}
```

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Updated Name",
    "phone_number": "+91XXXXXXXXXX",
    "role": "citizen",
    "trust_score": 95,
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## 2. Reports (Citizen Submissions)

### `POST /reports`
Citizen submits a new civic issue report.

**Auth**: Required  
**Role**: `citizen`  
**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | File | ✅ | Primary civic issue image |
| `voice_note` | File | ❌ | Optional audio recording |
| `latitude` | Number | ✅ | Decimal degrees |
| `longitude` | Number | ✅ | Decimal degrees |
| `voice_transcript` | String | ❌ | Client-side or server-side transcript |

**Backend Processing** (internal, not part of request):
1. Upload image to Supabase Storage → obtain `image_url`.
2. Send image to FastAPI ML Service for classification.
3. Insert `reports` row with `ai_category` and `ai_confidence` (via service role).
4. Execute spatial deduplication check (~50m radius against open incidents).
5. Create or link to existing `incident`.
6. Return created report and linked incident.

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "uuid",
      "image_url": "https://...",
      "location": { "latitude": 14.46, "longitude": 75.92 },
      "ai_category": "Pothole",
      "ai_confidence": 91.5,
      "created_at": "2026-01-01T00:00:00Z"
    },
    "incident": {
      "id": "uuid",
      "status": "OPEN",
      "priority_level": "HIGH",
      "sla_deadline": "2026-01-02T00:00:00Z",
      "is_new": true
    }
  },
  "message": "Report submitted successfully."
}
```

**`is_new`**: `true` if a new incident was created; `false` if linked to an existing deduplicated incident.

---

### `GET /reports`
List reports submitted by the authenticated citizen.

**Auth**: Required  
**Role**: `citizen`

**Query Parameters**:
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | Integer | `1` | |
| `limit` | Integer | `20` | Max `100` |
| `status` | String | — | Filter by linked incident status |

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "reports": [ { ... } ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

---

### `GET /reports/:reportId`
Get details of a single report (citizen sees own; officers see all authorized).

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "image_url": "https://...",
    "voice_note_url": null,
    "voice_transcript": null,
    "location": { "latitude": 14.46, "longitude": 75.92 },
    "ai_category": "Garbage Dump",
    "ai_confidence": 88.2,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## 3. Incidents

### `GET /incidents`
List incidents visible to the authenticated user (scoped by role/department/zone via Backend + DB RLS).

**Auth**: Required

**Query Parameters**:
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | Integer | `1` | |
| `limit` | Integer | `20` | |
| `status` | String | — | Filter by status |
| `priority_level` | String | — | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `department_id` | UUID | — | Filter by department |
| `zone_id` | UUID | — | Filter by zone |

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "uuid",
        "category": "Pothole",
        "severity": "HIGH",
        "priority_level": "HIGH",
        "status": "IN_PROGRESS",
        "current_level": 1,
        "location": { "latitude": 14.46, "longitude": 75.92 },
        "address": "MG Road, Davanagere",
        "zone_id": "uuid",
        "department_id": "uuid",
        "sla_deadline": "2026-01-02T00:00:00Z",
        "assigned_officer_id": "uuid",
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 12 }
  }
}
```

---

### `GET /incidents/:incidentId`
Get full details of a single incident including related reports, escalations, and status history.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "incident": { ... },
    "reports": [ { ... } ],
    "escalations": [ { ... } ],
    "status_history": [ { ... } ],
    "resolution_evidence": [ { ... } ]
  }
}
```

---

### `PATCH /incidents/:incidentId/status`
Officer updates operational status of an incident (allowed: `status`, `resolved_at` only).

**Auth**: Required  
**Role**: `ward_officer`, `aee`, `commissioner`, `admin`

**Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "resolved_at": null
}
```

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_PROGRESS",
    "updated_at": "2026-01-01T06:00:00Z"
  }
}
```

---

## 4. Officers

### `GET /officers`
List all officers (directory — readable by all authenticated users).

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "officers": [
      {
        "id": "uuid",
        "profile_id": "uuid",
        "full_name": "Officer Name",
        "level": 1,
        "department_id": "uuid",
        "zone_id": "uuid"
      }
    ]
  }
}
```

---

### `GET /officers/:officerId`
Get full profile of a specific officer.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "profile": { "full_name": "...", "role": "ward_officer" },
    "level": 1,
    "department": { "id": "uuid", "name": "Civil / Roads", "code": "ROADS" },
    "zone": { "id": "uuid", "name": "Zone 1 - City Center", "code": "ZONE1" }
  }
}
```

---

## 5. Escalations

### `POST /incidents/:incidentId/escalate`
Triggers an atomic escalation of the incident to the next municipal level.

**Auth**: Required  
**Role**: `ward_officer` (Level 1 → 2), `aee` (Level 2 → 3)

**Request Body**:
```json
{
  "reason": "Issue unresolved for 48 hours despite priority assignment."
}
```

**Backend internally calls**: `public.trigger_incident_escalation(p_incident_id, p_reason)` RPC.

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "escalation": {
      "id": "uuid",
      "incident_id": "uuid",
      "from_level": 1,
      "to_level": 2,
      "reason": "Issue unresolved for 48 hours despite priority assignment.",
      "triggered_at": "2026-01-01T08:00:00Z",
      "status": "TRIGGERED"
    },
    "incident": {
      "id": "uuid",
      "current_level": 2,
      "status": "ESCALATED"
    }
  },
  "message": "Incident escalated to Level 2 (AEE)."
}
```

**Error `403`** — Officer scope mismatch or incident not at expected level:
```json
{
  "success": false,
  "error": {
    "code": "ESCALATION_UNAUTHORIZED",
    "message": "Officer is not authorized to escalate this incident."
  }
}
```

**Error `422`** — Already at maximum level:
```json
{
  "success": false,
  "error": {
    "code": "ESCALATION_MAX_LEVEL",
    "message": "Incident is already at maximum escalation level (Level 3)."
  }
}
```

---

### `GET /incidents/:incidentId/escalations`
List all escalation records for a given incident.

**Auth**: Required  
**Role**: `ward_officer`, `aee`, `commissioner`, `admin`

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "escalations": [
      {
        "id": "uuid",
        "from_level": 1,
        "to_level": 2,
        "reason": "...",
        "triggered_at": "2026-01-01T08:00:00Z",
        "status": "TRIGGERED"
      }
    ]
  }
}
```

---

## 6. Resolution Evidence

### `POST /incidents/:incidentId/resolution`
Officer submits before/after image evidence of a resolved incident. Backend triggers AI verification with FastAPI.

**Auth**: Required  
**Role**: `ward_officer`, `aee`, `commissioner`, `admin`  
**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required |
|---|---|---|
| `before_image` | File | ✅ |
| `after_image` | File | ✅ |

**Response `201`**:
```json
{
  "success": true,
  "data": {
    "resolution_evidence": {
      "id": "uuid",
      "incident_id": "uuid",
      "before_image_url": "https://...",
      "after_image_url": "https://...",
      "ai_verification_passed": true,
      "ai_confidence": 93.5,
      "created_at": "2026-01-01T10:00:00Z"
    }
  },
  "message": "Resolution evidence submitted. AI verification passed."
}
```

---

### `GET /incidents/:incidentId/resolution`
Get resolution evidence records for an incident.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "resolution_evidence": [ { ... } ]
  }
}
```

---

## 7. Notifications

### `GET /notifications`
List notifications for the authenticated user.

**Auth**: Required

**Query Parameters**:
| Param | Type | Default |
|---|---|---|
| `unread_only` | Boolean | `false` |
| `page` | Integer | `1` |
| `limit` | Integer | `20` |

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Incident Updated",
        "message": "Your reported issue has been assigned to a Ward Officer.",
        "is_read": false,
        "created_at": "2026-01-01T09:00:00Z"
      }
    ],
    "unread_count": 3,
    "pagination": { "page": 1, "limit": 20, "total": 7 }
  }
}
```

---

### `PATCH /notifications/:notificationId/read`
Mark a notification as read (citizen updates `is_read` only).

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_read": true
  }
}
```

---

### `PATCH /notifications/read-all`
Mark all notifications for the authenticated user as read.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

---

## 8. Master Data

### `GET /zones`
List all municipal zones.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "zones": [
      { "id": "uuid", "name": "Zone 1 - City Center", "code": "ZONE1" }
    ]
  }
}
```

---

### `GET /departments`
List all municipal departments.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "departments": [
      { "id": "uuid", "name": "Civil / Roads", "code": "ROADS" }
    ]
  }
}
```

---

### `GET /sla-policies`
List SLA policy configurations.

**Auth**: Required

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "sla_policies": [
      {
        "id": "uuid",
        "priority_level": "CRITICAL",
        "resolution_hours": 12,
        "description": "Immediate civic emergency (12 Hours SLA)"
      }
    ]
  }
}
```

---

## Contract Stability Rules

1. **Breaking changes are prohibited** without explicit team sign-off and this document being updated first.
2. **Additive changes** (new optional fields in response objects) are non-breaking and acceptable.
3. **Removal or renaming** of existing response fields is a breaking change.
4. **Status code changes** are breaking changes.
5. The Frontend must not depend on any fields not listed in this document.

---

> **Next**: `docs/ML_CONTRACT.md` — Backend ↔ ML Service API Contract (Step 4)
