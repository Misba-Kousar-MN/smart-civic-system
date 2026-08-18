# Smart Civic System — Database Contract

> **Step 2 of the Integration Blueprint**  
> This document defines the frozen Supabase PostgreSQL / PostGIS database contract.  
> All three modules (Frontend, Backend, ML) must treat this as ground truth.  
> **The 13-table schema is FROZEN. No modifications are permitted.**

---

## Overview

| Property | Value |
|---|---|
| Provider | Supabase (PostgreSQL 15 + PostGIS) |
| Schema | `public` |
| Application Tables | **13 (FROZEN)** |
| Auth Tables | Supabase managed (`auth.users`) |
| Spatial Extension | PostGIS (`geography`, `geometry`) |
| Realtime | Enabled for 4 tables |
| RLS | Active on all 13 tables |

---

## Table Index

| # | Table | Purpose |
|---|---|---|
| 1 | `profiles` | Citizen & officer identity (extends `auth.users`) |
| 2 | `zones` | Municipal administrative geographic zones |
| 3 | `departments` | Municipal service departments |
| 4 | `officers` | Officer hierarchy mapping |
| 5 | `sla_policies` | Priority → SLA resolution time master config |
| 6 | `incidents` | Deduplicated core municipal work orders |
| 7 | `reports` | Individual citizen issue submissions |
| 8 | `incident_reports` | Many-to-one: reports mapped to incidents |
| 9 | `escalations` | Immutable municipal escalation log |
| 10 | `status_history` | Append-only incident status audit trail |
| 11 | `resolution_evidence` | Before/after AI-verified resolution proof |
| 12 | `trust_history` | Append-only citizen reputation score log |
| 13 | `notifications` | Per-user system alert records |

---

## Table Schemas

### 1. `profiles`

Extends `auth.users`. Auto-created by database trigger on Supabase sign-up.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `REFERENCES auth.users(id) ON DELETE CASCADE` | **MUST match `auth.users.id`. Never use `gen_random_uuid()`.** |
| `full_name` | `TEXT` | `NOT NULL` | Auto-extracted from auth metadata at sign-up |
| `phone_number` | `TEXT` | nullable | |
| `role` | `TEXT` | `NOT NULL`, `DEFAULT 'citizen'`, CHECK | Values: `citizen`, `ward_officer`, `aee`, `commissioner`, `admin` |
| `trust_score` | `INTEGER` | `NOT NULL`, `DEFAULT 100`, CHECK `0–100` | Citizen reliability score |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Immutable after creation |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Auto-updated by trigger |

**Column Protection (Database Trigger)**:
Citizens can update ONLY `full_name` and `phone_number`.  
`id`, `role`, `trust_score`, `created_at` are immutable for non-admin users.

**Protected RPC**: Use `public.update_my_profile(p_full_name, p_phone_number)` for citizen profile updates.

---

### 2. `zones`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL` | Human-readable zone name |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | e.g., `ZONE1`, `ZONE2`, `ZONE3` |
| `boundary` | `geometry(Polygon, 4326)` | nullable | PostGIS polygon for spatial containment |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**Note**: Seed zones (`ZONE1`, `ZONE2`, `ZONE3`) are **development placeholders** and do not represent official Davanagere ward boundaries.

---

### 3. `departments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `name` | `TEXT` | `NOT NULL` | |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | e.g., `ROADS`, `SANITATION`, `ELECTRICAL`, `UGD` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**Seeded Departments**:

| Code | Name |
|---|---|
| `ROADS` | Civil / Roads |
| `SANITATION` | Waste Management |
| `ELECTRICAL` | Streetlights / Electrical |
| `UGD` | Water Supply / Underground Drainage |

---

### 4. `officers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `profile_id` | `UUID` | `UNIQUE`, `NOT NULL`, `REFERENCES profiles(id) ON DELETE CASCADE` | One officer record per user profile |
| `department_id` | `UUID` | `REFERENCES departments(id) ON DELETE RESTRICT` | nullable for Commissioners |
| `zone_id` | `UUID` | `REFERENCES zones(id) ON DELETE RESTRICT` | nullable for Level 2/3 officers |
| `level` | `INTEGER` | `NOT NULL`, CHECK `IN (1, 2, 3)` | Municipal hierarchy level |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**Officer Level Definitions**:

| Level | Role | Scope |
|---|---|---|
| `1` | Ward Officer / Junior Engineer | Restricted to assigned `department` + `zone` |
| `2` | Assistant Executive Engineer (AEE) | Restricted to assigned `department` (all zones) |
| `3` | Commissioner | Municipality-wide authority |

---

### 5. `sla_policies`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `priority_level` | `TEXT` | `UNIQUE`, `NOT NULL`, CHECK | Values: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `resolution_hours` | `INTEGER` | `NOT NULL`, CHECK `> 0` | Target resolution window |
| `description` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**Seeded SLA Configuration (Production Values)**:

| Priority Level | Resolution Hours | Description |
|---|---|---|
| `CRITICAL` | 12 hours | Immediate civic emergency |
| `HIGH` | 24 hours | Urgent infrastructure breach |
| `MEDIUM` | 72 hours | Standard maintenance issue |
| `LOW` | 168 hours (7 days) | Routine civic request |

---

### 6. `incidents`

Core municipal work order. **Created only by the trusted Backend/service-role. Citizens cannot create incidents directly.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | **Immutable. Never allow override.** |
| `category` | `TEXT` | `NOT NULL` | Civic issue category (from AI detection or admin) |
| `severity` | `TEXT` | `NOT NULL` | e.g., `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `priority_score` | `NUMERIC(5,2)` | `NOT NULL`, `DEFAULT 0.00`, CHECK `0–100` | Calculated by Backend |
| `priority_level` | `TEXT` | `REFERENCES sla_policies(priority_level)` | Drives SLA deadline |
| `location` | `geography(Point, 4326)` | `NOT NULL` | PostGIS spatial point |
| `address` | `TEXT` | nullable | Human-readable address |
| `zone_id` | `UUID` | `REFERENCES zones(id) ON DELETE RESTRICT` | Municipal zone assignment |
| `department_id` | `UUID` | `REFERENCES departments(id) ON DELETE RESTRICT` | Assigned municipal department |
| `current_level` | `INTEGER` | `NOT NULL`, `DEFAULT 1`, CHECK `IN (1, 2, 3)` | Current escalation level |
| `assigned_officer_id` | `UUID` | `REFERENCES officers(id) ON DELETE SET NULL` | Assigned officer |
| `status` | `TEXT` | `NOT NULL`, `DEFAULT 'OPEN'`, CHECK | Values: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED`, `ESCALATED` |
| `sla_started_at` | `TIMESTAMPTZ` | nullable | SLA clock start timestamp |
| `sla_deadline` | `TIMESTAMPTZ` | nullable | Computed resolution deadline |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Auto-updated by trigger |
| `resolved_at` | `TIMESTAMPTZ` | nullable | Resolution timestamp |

**Permitted Status Transitions**:

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
OPEN → ESCALATED
IN_PROGRESS → ESCALATED
ESCALATED → IN_PROGRESS
RESOLVED → REOPENED
REOPENED → IN_PROGRESS
```

**Column Protection**: Level 1 and Level 2 officers may update ONLY `status` and `resolved_at`. All other columns require Admin, Commissioner, or service-role access.

---

### 7. `reports`

Individual citizen submissions. Linked to an Incident after deduplication.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NOT NULL`, `REFERENCES profiles(id) ON DELETE CASCADE` | Submitting citizen |
| `image_url` | `TEXT` | `NOT NULL` | Uploaded media URL (Supabase Storage) |
| `voice_note_url` | `TEXT` | nullable | Optional audio file URL |
| `voice_transcript` | `TEXT` | nullable | Optional voice-to-text transcript |
| `location` | `geography(Point, 4326)` | `NOT NULL` | PostGIS spatial point |
| `ai_category` | `TEXT` | nullable | **Written ONLY by trusted Backend/service-role** |
| `ai_confidence` | `NUMERIC(5,2)` | nullable, CHECK `0–100` | **Written ONLY by trusted Backend/service-role** |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**AI Field Protection (Database Trigger)**:  
`ai_category` and `ai_confidence` MUST be `NULL` on citizen INSERT. Citizen UPDATEs cannot modify them. Only the Backend (service-role context) may write these values.

---

### 8. `incident_reports`

Many-to-one junction between citizen reports and incidents.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `incident_id` | `UUID` | `NOT NULL`, `REFERENCES incidents(id) ON DELETE CASCADE` | |
| `report_id` | `UUID` | `UNIQUE`, `NOT NULL`, `REFERENCES reports(id) ON DELETE CASCADE` | Each report maps to at most ONE incident |
| `is_primary` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Primary report for this incident |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

**Partial Unique Index**: `idx_incident_reports_single_primary` — enforces exactly ONE primary report per incident.

---

### 9. `escalations`

Immutable escalation event log. **Direct INSERT by authenticated users is prohibited. All escalations must use `public.trigger_incident_escalation()`.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `incident_id` | `UUID` | `NOT NULL`, `REFERENCES incidents(id) ON DELETE CASCADE` | |
| `from_level` | `INTEGER` | `NOT NULL`, CHECK `IN (1, 2, 3)` | Escalation origin level |
| `to_level` | `INTEGER` | `NOT NULL`, CHECK `IN (1, 2, 3)` | Escalation target level |
| `reason` | `TEXT` | `NOT NULL` | Justification text |
| `triggered_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |
| `status` | `TEXT` | `NOT NULL`, `DEFAULT 'TRIGGERED'`, CHECK | Values: `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED` |

**Escalation Constraint**:
```sql
CONSTRAINT chk_valid_escalation_flow CHECK (
    (from_level = 1 AND to_level = 2) OR
    (from_level = 2 AND to_level = 3)
)
```

**No Level 1 → 3 jump. No downgrade. No Level 3 further escalation.**

---

### 10. `status_history`

Append-only incident audit trail. **No UPDATE or DELETE permitted.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `incident_id` | `UUID` | `NOT NULL`, `REFERENCES incidents(id) ON DELETE CASCADE` | |
| `old_status` | `TEXT` | nullable | Previous status value |
| `new_status` | `TEXT` | `NOT NULL` | New status value |
| `changed_by` | `UUID` | `REFERENCES profiles(id) ON DELETE SET NULL` | Actor who triggered the change |
| `remarks` | `TEXT` | nullable | Escalation reason or notes |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

---

### 11. `resolution_evidence`

Before/after image pairs submitted by officers, with AI verification status.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `incident_id` | `UUID` | `NOT NULL`, `REFERENCES incidents(id) ON DELETE CASCADE` | |
| `before_image_url` | `TEXT` | `NOT NULL` | Image prior to resolution |
| `after_image_url` | `TEXT` | `NOT NULL` | Image after resolution |
| `ai_verification_passed` | `BOOLEAN` | `NOT NULL` | AI comparison result |
| `ai_confidence` | `NUMERIC(5,2)` | nullable, CHECK `0–100` | AI verification confidence |
| `submitted_by` | `UUID` | `REFERENCES profiles(id) ON DELETE SET NULL` | Officer who submitted evidence |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

---

### 12. `trust_history`

Append-only citizen reputation score audit log. **No UPDATE or DELETE permitted.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NOT NULL`, `REFERENCES profiles(id) ON DELETE CASCADE` | |
| `points_changed` | `INTEGER` | `NOT NULL` | Positive (reward) or negative (penalty) delta |
| `reason` | `TEXT` | `NOT NULL` | Reason for score change |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | |

---

### 13. `notifications`

Per-user system alert records. Citizens can update `is_read` only.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `NOT NULL`, `REFERENCES profiles(id) ON DELETE CASCADE` | Notification recipient |
| `title` | `TEXT` | `NOT NULL` | |
| `message` | `TEXT` | `NOT NULL` | |
| `is_read` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Only citizen-mutable field |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Immutable |

**Column Protection (Database Trigger)**:  
`id`, `user_id`, `title`, `message`, `created_at` are immutable for non-admin/non-service-role users.

---

## Database Functions & RPCs

| Function | Purpose | Security |
|---|---|---|
| `public.trigger_incident_escalation(p_incident_id, p_reason)` | **Sole authorized escalation pathway** — atomic level progression + audit | `SECURITY DEFINER` |
| `public.update_my_profile(p_full_name, p_phone_number)` | Safe citizen profile update (restricted fields only) | `SECURITY DEFINER` |
| `public.is_officer_authorized_for_incident(p_user_id, p_incident_id)` | RLS helper: officer scope validation against department + zone | `SECURITY DEFINER` |
| `public.validate_officer_incident_update(...)` | RLS helper: verifies Level 1/2 officer update does not touch protected columns | `SECURITY DEFINER` |
| `public.can_officer_trigger_escalation(...)` | Internal: validates officer level/dept/zone for escalation authorization | `SECURITY DEFINER` |
| `public.get_user_role(p_user_id)` | RLS helper: returns role for a user ID | `SECURITY DEFINER` |
| `public.is_admin(p_user_id)` | RLS helper: boolean admin check | `SECURITY DEFINER` |
| `public.handle_new_user()` | Auth trigger: auto-creates `profiles` row on `auth.users` INSERT | `SECURITY DEFINER` |
| `public.set_updated_at()` | Trigger: stamps `updated_at` on row change | `SECURITY INVOKER` |

---

## `trigger_incident_escalation()` — Detailed Contract

This function is the **only** valid way to escalate an incident. It is called by the Backend via RPC.

```sql
SELECT * FROM public.trigger_incident_escalation(
    p_incident_id UUID,   -- Target incident
    p_reason      TEXT    -- Escalation justification (required)
);
```

**Returns**: A single `public.escalations` row.

**Atomic Operations (within a single transaction)**:
1. Lock incident row `FOR UPDATE`.
2. Read `current_level` from locked incident.
3. Determine `to_level`: Level 1 → 2, or Level 2 → 3 (Level 3 raises exception).
4. Validate officer authorization via `can_officer_trigger_escalation()`.
5. Insert into `public.escalations`.
6. Update `incidents.current_level` to `to_level`.
7. Update `incidents.status` to `ESCALATED`.
8. Insert into `public.status_history`.
9. Return escalation record.

**Failure Modes**:
| Condition | Exception |
|---|---|
| Not authenticated | `'Authentication required.'` |
| Incident not found | `'Incident not found.'` |
| Already at Level 3 | `'Incident is already at maximum escalation level (Level 3).'` |
| Officer not authorized | `'Officer is not authorized to escalate this incident.'` |

---

## Spatial Data Reference

| Table | Column | Type | Index |
|---|---|---|---|
| `incidents` | `location` | `geography(Point, 4326)` | `GIST` |
| `reports` | `location` | `geography(Point, 4326)` | `GIST` |
| `zones` | `boundary` | `geometry(Polygon, 4326)` | `GIST` |

**Spatial Deduplication**: Backend must check whether a new report falls within ~50 metres of an existing open incident using PostGIS `ST_DWithin` against `geography` columns.

---

## Row Level Security Summary

| Table | Citizen | Ward Officer | AEE | Commissioner | Admin |
|---|---|---|---|---|---|
| `profiles` | Read/Update own (limited columns) | Read all | Read all | Read all | Full |
| `zones` | Read | Read | Read | Read | Full |
| `departments` | Read | Read | Read | Read | Full |
| `officers` | Read | Read | Read | Read | Full |
| `sla_policies` | Read | Read | Read | Read | Full |
| `incidents` | Read (own reports only) | Read/Update (dept+zone) | Read/Update (dept) | Read/Update (all) | Full |
| `reports` | Read/Insert own | Read all | Read all | Read all | Full |
| `incident_reports` | Read own | Read/Write (authorized) | Read/Write (authorized) | Read/Write (all) | Full |
| `escalations` | — | Read | Read | Read | Full |
| `status_history` | Read (own incidents) | Read/Insert | Read/Insert | Read/Insert | Full |
| `resolution_evidence` | Read (own incidents) | Read/Insert | Read/Insert | Read/Insert | Full |
| `trust_history` | Read own | — | — | — | Full |
| `notifications` | Read/Update `is_read` own | — | — | — | Full |

**Service Role (Backend)**: Bypasses RLS. Used for trusted orchestration operations.

---

## Supabase Realtime Tables

| Table | Realtime Enabled |
|---|---|
| `incidents` | ✅ |
| `escalations` | ✅ |
| `resolution_evidence` | ✅ |
| `notifications` | ✅ |
| All other tables | ❌ |

---

## Frozen Status

> **The 13-table schema is FROZEN. No columns, constraints, indexes, triggers, or RLS policies may be modified without an explicit, team-agreed architectural review.**

The migration file is located at:
```
supabase/migrations/20260817140108_smart_civic_system.sql
```
