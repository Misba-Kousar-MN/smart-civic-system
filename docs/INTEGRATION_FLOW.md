# Smart Civic System — End-to-End Integration Flow

> **Step 9 of the Integration Blueprint**  
> This document traces all major end-to-end workflows across the Frontend, Backend, ML Service, and Database.  
> Use this as the definitive reference for understanding how all modules work together in each scenario.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      SMART CIVIC SYSTEM                      │
│                                                              │
│  ┌─────────────┐    REST API     ┌──────────────────────┐   │
│  │   React      │ ─────────────► │  Node.js / Express   │   │
│  │  Frontend    │ ◄───────────── │      Backend         │   │
│  └─────────────┘   JSON + JWT    └──────────┬───────────┘   │
│                                             │                │
│                                   ┌─────────┴─────────┐     │
│                                   │                   │     │
│                          ┌────────▼──────┐  ┌─────────▼───┐│
│                          │   Supabase    │  │   FastAPI   ││
│                          │  PostgreSQL   │  │  ML Service ││
│                          │   PostGIS     │  │ YOLO/PyTorch││
│                          └───────────────┘  └─────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## Flow 1 — Citizen Registration & Profile Setup

```
1.  [Frontend]   Citizen submits email + password via registration form
2.  [Supabase]   Auth creates auth.users record; returns access_token
3.  [DB Trigger] handle_new_user() fires AFTER INSERT ON auth.users
4.  [DB Trigger] Inserts profiles row: role='citizen', trust_score=100
5.  [Frontend]   Receives session; SDK stores access_token + refresh_token
6.  [Frontend]   Navigates to citizen dashboard
```

---

## Flow 2 — Citizen Submits Civic Issue Report

```
1.  [Frontend]   Citizen captures image, selects/pins GPS location, optionally records voice
2.  [Frontend]   Sends multipart/form-data POST /reports
                 → image file
                 → latitude, longitude
                 → voice_note (optional)
                 → Authorization: Bearer <token>

3.  [Backend]    Validates JWT; resolves user role = 'citizen'
4.  [Backend]    Validates required fields (image, coordinates)
5.  [Backend]    Uploads image to Supabase Storage → receives image_url
6.  [Backend]    Sends image to ML Service: POST /ml/v1/detect
                 → image file
                 → report_id (pre-generated UUID)

7.  [ML Service] Preprocesses image (OpenCV)
8.  [ML Service] Runs YOLO inference (PyTorch)
9.  [ML Service] Returns: ai_category, ai_confidence, bounding_boxes

10. [Backend]    Validates ML response:
                 → ai_category in canonical list
                 → ai_confidence between 0.00 and 100.00
                 → If ML unavailable: ai_category = null, ai_confidence = null

11. [Backend]    Using service_role client: INSERT INTO reports
                 → user_id = auth.uid
                 → image_url
                 → location = ST_Point(longitude, latitude)
                 → ai_category (from ML or null)
                 → ai_confidence (from ML or null)
                 [DB Trigger validates AI fields — service_role bypasses]

12. [Backend]    Executes spatial deduplication query:
                 SELECT id FROM incidents
                 WHERE status NOT IN ('CLOSED', 'RESOLVED')
                 AND ST_DWithin(location, ST_Point($lng, $lat)::geography, 50)
                 LIMIT 1

13a.[Backend]    IF duplicate found → links report to existing incident:
                 INSERT INTO incident_reports (incident_id, report_id, is_primary=false)

13b.[Backend]    IF no duplicate → creates new incident:
                 INSERT INTO incidents (category, severity, priority_score,
                   priority_level, location, address, zone_id, department_id,
                   current_level=1, status='OPEN', sla_started_at, sla_deadline)
                 [priority_level determined from priority_score → sla_policies lookup]
                 [sla_deadline = now() + INTERVAL (resolution_hours || ' hours')]

                 INSERT INTO incident_reports (incident_id, report_id, is_primary=true)

14. [Backend]    Dispatches system notification to citizen:
                 INSERT INTO notifications (user_id, title, message)
                 [via service_role client]

15. [Frontend]   Receives 201 response with report + incident summary
16. [Frontend]   Navigates citizen to incident tracking view
17. [DB Realtime] incidents INSERT event fires → officer dashboards update live
```

---

## Flow 3 — Officer Views Incident Dashboard

```
1.  [Frontend]   Officer logs in; Frontend establishes Supabase Realtime channels
2.  [Frontend]   GET /incidents (with Authorization Bearer token)
                 Optional filters: status, priority_level, department_id, zone_id

3.  [Backend]    Validates JWT; resolves role = 'ward_officer' / 'aee' / 'commissioner'
4.  [Backend]    Queries Supabase using authenticated user context
                 [RLS + is_officer_authorized_for_incident() scopes results]

5.  [Backend]    Returns paginated incident list with status, priority, SLA deadline

6.  [Frontend]   Renders incident cards with SLA countdown timers
7.  [Frontend]   Supabase Realtime channel receives live UPDATE events on incidents
8.  [Frontend]   Dashboard updates in real-time without page refresh
```

---

## Flow 4 — Officer Updates Incident Status

```
1.  [Frontend]   Officer selects incident; changes status (e.g., OPEN → IN_PROGRESS)
2.  [Frontend]   PATCH /incidents/:incidentId/status
                 Body: { "status": "IN_PROGRESS" }
                 Authorization: Bearer <token>

3.  [Backend]    Validates JWT; resolves role and officer scope
4.  [Backend]    Validates requested status is a permitted transition
5.  [Backend]    Updates incident using authenticated user context:
                 UPDATE incidents SET status='IN_PROGRESS' WHERE id=...
                 [DB Trigger enforce_incident_column_protection() runs]
                 [validate_officer_incident_update() called within RLS WITH CHECK]
                 [Confirms officer is NOT changing protected fields]

6.  [Backend]    Inserts status_history record (audit entry)
7.  [Backend]    Dispatches notification to citizen:
                 INSERT INTO notifications → "Your issue is now IN_PROGRESS"

8.  [Backend]    Returns 200 with updated incident data
9.  [DB Realtime] incidents UPDATE event fires → all subscribed dashboards update live
```

---

## Flow 5 — Officer Triggers Escalation

```
1.  [Frontend]   Officer clicks "Escalate" on an incident with justification text
2.  [Frontend]   POST /incidents/:incidentId/escalate
                 Body: { "reason": "Issue unresolved past SLA deadline." }
                 Authorization: Bearer <token>

3.  [Backend]    Validates JWT; resolves role = 'ward_officer' (from_level=1→2)
                                              or 'aee' (from_level=2→3)
4.  [Backend]    Pre-validates officer scope for escalation (dept/zone check)
5.  [Backend]    Calls Supabase RPC as service_role:
                 SELECT * FROM public.trigger_incident_escalation(
                   p_incident_id => $incidentId,
                   p_reason      => $reason
                 );

6.  [DB Function] trigger_incident_escalation() executes atomically:
                  a. SELECT * FROM incidents WHERE id=$1 FOR UPDATE
                  b. v_from_level := current_level
                  c. v_to_level := from_level + 1 (1→2 or 2→3)
                  d. Rejects if current_level = 3
                  e. Validates can_officer_trigger_escalation()
                  f. INSERT INTO escalations (from_level, to_level, reason)
                  g. UPDATE incidents SET current_level=v_to_level, status='ESCALATED'
                  h. INSERT INTO status_history (old_status, new_status='ESCALATED')
                  i. RETURNS escalation record

7.  [Backend]    Dispatches notification to Level 2/3 officer:
                 "Incident #XXX has been escalated to your level."

8.  [Backend]    Returns 201 with escalation record + updated incident
9.  [DB Realtime] escalations INSERT event → higher-level officer dashboard alerts
10. [DB Realtime] incidents UPDATE event → current_level and status badge update
```

---

## Flow 6 — Officer Submits Resolution Evidence

```
1.  [Frontend]   Officer uploads "before" image + "after" image via resolution form
2.  [Frontend]   POST /incidents/:incidentId/resolution
                 Form data: before_image file, after_image file
                 Authorization: Bearer <token>

3.  [Backend]    Validates JWT; checks officer is authorized for this incident
4.  [Backend]    Uploads before_image → Supabase Storage → before_image_url
5.  [Backend]    Uploads after_image → Supabase Storage → after_image_url

6.  [Backend]    Calls ML Service: POST /ml/v1/verify-resolution
                 → before_image file
                 → after_image file
                 → incident_id
                 → ai_category (original detection category)

7.  [ML Service] Runs before/after comparison (OpenCV + PyTorch)
8.  [ML Service] Returns: ai_verification_passed, ai_confidence, comparison_notes

9.  [Backend]    Inserts resolution_evidence record (service_role):
                 INSERT INTO resolution_evidence (
                   incident_id, before_image_url, after_image_url,
                   ai_verification_passed, ai_confidence, submitted_by
                 )

10. [Backend]    IF ai_verification_passed = true:
                   UPDATE incidents SET status='RESOLVED', resolved_at=now()
                   INSERT INTO status_history (new_status='RESOLVED')
                   INSERT INTO trust_history (points_changed=+10, reason='Issue resolved')
                   Notify citizen: "Your reported issue has been resolved."

11. [Backend]    IF ai_verification_passed = false:
                   Return 422 RESOLUTION_AI_VERIFICATION_FAILED
                   Officer must re-submit with corrected after image

12. [DB Realtime] resolution_evidence INSERT event → citizen tracking view updates
13. [DB Realtime] incidents UPDATE event → status badge updates to RESOLVED
```

---

## Flow 7 — Citizen Receives & Reads Notification

```
1.  [DB Realtime] Backend inserts notification into notifications table
2.  [DB Realtime] Supabase Realtime fires INSERT event on notifications
                  filtered by user_id = citizen.id (RLS enforced)

3.  [Frontend]   Realtime handler fires: increments unread badge counter
4.  [Frontend]   Shows toast notification with title + message
5.  [Frontend]   Citizen opens notification panel
6.  [Frontend]   PATCH /notifications/:notificationId/read

7.  [Backend]    UPDATE notifications SET is_read=true WHERE id=$1
                 [DB Trigger enforce_notification_column_protection() validates]
                 [Only is_read is changed; other fields immutable]

8.  [DB Realtime] notifications UPDATE event fires → badge count decrements
```

---

## Flow 8 — Citizen Tracks Their Report

```
1.  [Frontend]   Citizen navigates to tracking page for their report/incident
2.  [Frontend]   GET /incidents/:incidentId (report must be linked to incident)

3.  [Backend]    Validates JWT
4.  [Backend]    Queries incident; RLS confirms citizen is linked via incident_reports
5.  [Backend]    Returns full incident detail including status, current_level, sla_deadline,
                 escalations, resolution_evidence

6.  [Frontend]   Renders live SLA countdown timer
7.  [Frontend]   Supabase Realtime channel subscription updates status
                 in real-time as officers take action
```

---

## Integration Error Scenarios

| Scenario | Expected Behaviour |
|---|---|
| ML Service unavailable during report submission | Store report with `ai_category=null`, `ai_confidence=null`; return 201 with `"ai_status": "pending"` |
| Escalation attempt by unauthorized officer | DB function raises exception; Backend returns `403 ESCALATION_UNAUTHORIZED` |
| Duplicate primary report link attempt | `idx_incident_reports_single_primary` raises unique violation; Backend returns `409 DB_CONFLICT` |
| Officer tries to update protected incident field | DB trigger raises exception; Backend returns `403 INCIDENT_UPDATE_FORBIDDEN` |
| Citizen tries to set `ai_category` on their report | DB trigger raises exception; Backend must never expose this path anyway |
| Level 3 escalation attempted | DB function raises exception; Backend returns `422 ESCALATION_MAX_LEVEL` |
| JWT expired mid-session | Frontend detects `401`; calls `supabase.auth.refreshSession()`; retries request |

---

> **Next**: `README.md` — Developer Handoff Guide (Step 10)
