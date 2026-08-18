# Smart Civic System — Authentication & Role Contract

> **Step 6 of the Integration Blueprint**  
> This document defines the authentication model, user roles, and authorization rules for the Smart Civic System.  
> All modules (Frontend, Backend, ML) must implement authentication and role enforcement according to this contract.

---

## Authentication Provider

| Property | Value |
|---|---|
| Provider | Supabase Auth (GoTrue) |
| Supported Methods | Email + Password |
| JWT Issuer | Supabase project (`auth.users`) |
| Session Storage | Supabase client SDK (`localStorage` in browser) |
| Token Type | Supabase JWT (short-lived access token + refresh token) |
| Profile Auto-Creation | Yes — database trigger `handle_new_user()` on `auth.users INSERT` |

---

## Authentication Flow

```
[User] → Email + Password
             ↓
[Supabase Auth] → Validates credentials
             ↓
[Supabase Auth] → Returns: access_token, refresh_token, user.id
             ↓
[Frontend SDK] → Stores session (localStorage)
             ↓
[Frontend] → Passes Bearer token to Backend on every request
             ↓
[Backend] → Validates JWT using Supabase JWT secret
             ↓
[Backend] → Fetches user role from profiles table
             ↓
Authorized workflow proceeds
```

---

## User Roles

The `profiles.role` column defines the application role of every user.

| Role | Description | Level | Scope |
|---|---|---|---|
| `citizen` | Registered civilian user | — | Own data only |
| `ward_officer` | Level 1 municipal officer (Ward Officer / Junior Engineer) | 1 | Assigned department + zone |
| `aee` | Level 2 municipal officer (Assistant Executive Engineer) | 2 | Assigned department (all zones) |
| `commissioner` | Level 3 top-level municipal authority (Commissioner) | 3 | Municipality-wide |
| `admin` | Platform administrator (system management) | — | Full system access |

> **Role Assignment**: Citizens self-register and are always assigned `citizen` by default. Officer roles are assigned by an `admin` user through backend/admin operations only. Citizens cannot change their own role.

---

## JWT Claims & Role Resolution

When the Backend receives a request, it extracts the authenticated user's identity from the Supabase JWT:

```json
{
  "sub": "uuid",           // auth.users.id (maps to profiles.id)
  "email": "user@email.com",
  "role": "authenticated", // Supabase auth role
  "iat": 1234567890,
  "exp": 1234571490
}
```

The application role (`citizen`, `ward_officer`, `aee`, `commissioner`, `admin`) is stored in `profiles.role` and must be fetched by the Backend separately. It is NOT embedded in the Supabase JWT claim by default.

**Backend Role Resolution**:
```
JWT sub (user UUID)
     ↓
SELECT role FROM public.profiles WHERE id = $1
     ↓
Application role used for route-level authorization
```

---

## Role-Based Access Control Matrix

### Frontend — Route Access

| Route | citizen | ward_officer | aee | commissioner | admin |
|---|:---:|:---:|:---:|:---:|:---:|
| `/` (Home / Landing) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login`, `/register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/citizen/submit-report` | ✅ | — | — | — | — |
| `/citizen/my-reports` | ✅ | — | — | — | — |
| `/citizen/track/:incidentId` | ✅ | — | — | — | — |
| `/officer/dashboard` | — | ✅ | ✅ | ✅ | ✅ |
| `/officer/incidents` | — | ✅ | ✅ | ✅ | ✅ |
| `/officer/escalate/:incidentId` | — | ✅ | ✅ | — | ✅ |
| `/commissioner/dashboard` | — | — | — | ✅ | ✅ |
| `/admin/dashboard` | — | — | — | — | ✅ |
| `/profile` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Frontend Note**: Route guards are for UX only. All security enforcement happens at the Backend and Database layer.

---

### Backend — Endpoint Role Requirements

| Endpoint | Minimum Role Required |
|---|---|
| `GET /profile/me` | `authenticated` |
| `PATCH /profile/me` | `authenticated` |
| `POST /reports` | `citizen` |
| `GET /reports` | `authenticated` |
| `GET /incidents` | `authenticated` |
| `GET /incidents/:id` | `authenticated` |
| `PATCH /incidents/:id/status` | `ward_officer` or above |
| `POST /incidents/:id/escalate` | `ward_officer` or `aee` |
| `POST /incidents/:id/resolution` | `ward_officer` or above |
| `GET /notifications` | `authenticated` |
| `PATCH /notifications/:id/read` | `authenticated` |
| `GET /zones` | `authenticated` |
| `GET /departments` | `authenticated` |
| `GET /sla-policies` | `authenticated` |
| `GET /officers` | `authenticated` |
| Admin management endpoints | `admin` only |

---

### Database — RLS Enforcement

| Role | Database Behavior |
|---|---|
| `citizen` | Restricted to own rows; cannot create incidents, forge AI fields, or escalate |
| `ward_officer` | Access to incidents in assigned dept + zone; cannot modify protected fields |
| `aee` | Access to incidents in assigned dept (all zones); cannot modify protected fields |
| `commissioner` | Municipality-wide read/update access |
| `admin` | Full table access (INSERT, UPDATE, DELETE) |
| `service_role` | Bypasses RLS entirely — Backend use only for orchestration |

---

## Token Lifecycle & Security Rules

### Frontend Responsibilities
1. Store the Supabase session via the SDK only (`supabase.auth.getSession()`). Do not store raw JWT in custom variables.
2. Attach the Bearer token to every Backend API call: `Authorization: Bearer <access_token>`.
3. On session expiry (401 response from Backend), call `supabase.auth.refreshSession()` before retrying.
4. On logout, call `supabase.auth.signOut()` to clear session storage.

### Backend Responsibilities
1. Validate the Bearer JWT using the Supabase JWT verification library (`@supabase/auth-helpers` or manual JWKS verification).
2. Reject any request with an invalid, expired, or missing JWT with `401 Unauthorized`.
3. After JWT validation, always fetch the user's `profiles.role` from the database to determine application-level role. Do not trust role claims embedded in custom JWT metadata.
4. Never expose the Supabase service-role key in API responses or logs.
5. Use the service-role client only for trusted backend orchestration (incident creation, AI field writes, notification dispatch).

### ML Service Responsibilities
1. The ML Service does not perform user-level authentication.
2. ML endpoints are secured by an internal `X-Internal-API-Key` header only.
3. The ML service must never receive or process user JWT tokens.

---

## Officer Authorization Model

Officer scope enforcement is handled by the database function `public.is_officer_authorized_for_incident()`.

| Level | Scope Check |
|---|---|
| Level 1 (Ward Officer) | `officers.department_id = incidents.department_id` AND `officers.zone_id = incidents.zone_id` |
| Level 2 (AEE) | `officers.department_id = incidents.department_id` |
| Level 3 (Commissioner) | No restriction — full municipality-wide access |

The Backend must also verify officer scope before routing requests to the database to provide clear error messages before hitting RLS.

---

## Service Role Usage Policy

The Supabase `service_role` key bypasses all RLS policies.

| Permitted Use | Prohibited Use |
|---|---|
| Backend inserting `incidents` (trusted workflow) | Exposing to Frontend |
| Backend writing `ai_category` / `ai_confidence` to `reports` | Use in ML Service |
| Backend dispatching system `notifications` | Storing in browser environment |
| Backend calling `trigger_incident_escalation()` on behalf of officers | Logging in plaintext |
| Admin operations | Any operation that should respect RLS |

---

## Forbidden Actions Per Role

| Forbidden Action | Citizen | Ward Officer | AEE | Commissioner |
|---|:---:|:---:|:---:|:---:|
| Modify `profiles.role` | ❌ | ❌ | ❌ | ❌ |
| Modify `profiles.trust_score` directly | ❌ | ❌ | ❌ | ❌ |
| Create `incidents` directly | ❌ | ❌ | ❌ | — |
| Set `reports.ai_category` / `ai_confidence` | ❌ | ❌ | ❌ | — |
| Direct INSERT into `escalations` | ❌ | ❌ | ❌ | — |
| Modify protected incident fields | ❌ | ❌ | ❌ | — |
| UPDATE / DELETE `status_history` | ❌ | ❌ | ❌ | ❌ |
| UPDATE / DELETE `trust_history` | ❌ | ❌ | ❌ | ❌ |
| Modify other users' `notifications` | ❌ | ❌ | ❌ | ❌ |

---

> **Next**: `docs/ERROR_STANDARDS.md` — Error & Response Standards (Step 7)
