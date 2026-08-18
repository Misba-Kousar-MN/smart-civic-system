# Smart Civic System — Realtime Event Contract

> **Step 5 of the Integration Blueprint**  
> This document defines the Supabase Realtime event contract for the Smart Civic System.  
> The Frontend and Backend subscribe to database change events for live UI updates and server-side triggers.  
> **No teammate may change the subscribed tables or event handling without updating this document.**

---

## Overview

| Property | Value |
|---|---|
| Provider | Supabase Realtime (PostgreSQL logical replication) |
| Protocol | WebSocket (Supabase client SDK) |
| Publication | `supabase_realtime` |
| Realtime-Enabled Tables | `incidents`, `escalations`, `resolution_evidence`, `notifications` |
| Frontend Client | `@supabase/supabase-js` |
| Backend Subscriber | Optional (Node.js `@supabase/supabase-js` or PostgreSQL `LISTEN/NOTIFY`) |

---

## Realtime-Enabled Tables

| Table | INSERT | UPDATE | DELETE | Subscriber |
|---|:---:|:---:|:---:|---|
| `incidents` | ✅ | ✅ | ❌ | Frontend (officer dashboards), Backend (optional) |
| `escalations` | ✅ | ✅ | ❌ | Frontend (officer/commissioner dashboards) |
| `resolution_evidence` | ✅ | ❌ | ❌ | Frontend (incident detail view) |
| `notifications` | ✅ | ✅ | ❌ | Frontend (notification bell/feed) |

> Tables not listed above are NOT in the `supabase_realtime` publication and will not emit live events.

---

## Supabase Realtime Channel Patterns

The Frontend uses filtered Supabase Realtime channels to subscribe to relevant events.

### Pattern 1 — Table-Level Subscription (Broadcast all changes)
```javascript
supabase
  .channel('channel-name')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: '<table_name>' },
    (payload) => handlePayload(payload)
  )
  .subscribe();
```

### Pattern 2 — Filtered Row Subscription (User-scoped)
```javascript
supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => handleNotification(payload)
  )
  .subscribe();
```

> **RLS Note**: Supabase Realtime respects Row Level Security for `postgres_changes`. A citizen will only receive events for rows they are permitted to see under active RLS policies.

---

## Event Contracts Per Table

---

### `incidents` Events

#### Event: `INSERT` (New Incident Created)
**Subscriber**: Officer dashboards (Level 1 Ward Officer, Level 2 AEE, Level 3 Commissioner), Admin dashboard.

**Payload Structure**:
```json
{
  "eventType": "INSERT",
  "schema": "public",
  "table": "incidents",
  "new": {
    "id": "uuid",
    "category": "Pothole",
    "severity": "HIGH",
    "priority_level": "HIGH",
    "status": "OPEN",
    "current_level": 1,
    "location": "...",
    "address": "MG Road, Davanagere",
    "zone_id": "uuid",
    "department_id": "uuid",
    "assigned_officer_id": null,
    "sla_started_at": null,
    "sla_deadline": "2026-01-02T00:00:00Z",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  "old": {}
}
```

**Frontend Action**: Append new incident card to relevant officer's incident list. Show toast notification.

---

#### Event: `UPDATE` (Incident Status or Level Changed)
**Subscriber**: Officer dashboards, citizen tracking view (for incidents linked to their reports).

**Payload Structure**:
```json
{
  "eventType": "UPDATE",
  "schema": "public",
  "table": "incidents",
  "new": {
    "id": "uuid",
    "status": "ESCALATED",
    "current_level": 2,
    "updated_at": "2026-01-01T06:00:00Z"
  },
  "old": {
    "id": "uuid",
    "status": "IN_PROGRESS",
    "current_level": 1,
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

**Frontend Action**: Update incident status badge and current level indicator in real-time. Trigger SLA timer refresh if `sla_deadline` changed.

---

### `escalations` Events

#### Event: `INSERT` (New Escalation Triggered)
**Subscriber**: Higher-level officer dashboards (Level 2 AEE when from_level=1, Level 3 Commissioner when from_level=2), Admin dashboard.

**Payload Structure**:
```json
{
  "eventType": "INSERT",
  "schema": "public",
  "table": "escalations",
  "new": {
    "id": "uuid",
    "incident_id": "uuid",
    "from_level": 1,
    "to_level": 2,
    "reason": "Issue unresolved past SLA deadline.",
    "triggered_at": "2026-01-01T08:00:00Z",
    "status": "TRIGGERED"
  },
  "old": {}
}
```

**Frontend Action**: Render new escalation alert in higher-level officer's dashboard. Show prominent alert banner with incident reference and reason.

---

#### Event: `UPDATE` (Escalation Status Acknowledged/Resolved)
**Subscriber**: Dashboards of officers involved in the escalation.

**Payload Structure**:
```json
{
  "eventType": "UPDATE",
  "schema": "public",
  "table": "escalations",
  "new": {
    "id": "uuid",
    "status": "ACKNOWLEDGED"
  },
  "old": {
    "id": "uuid",
    "status": "TRIGGERED"
  }
}
```

**Frontend Action**: Update escalation status badge from `TRIGGERED` → `ACKNOWLEDGED`.

---

### `resolution_evidence` Events

#### Event: `INSERT` (Resolution Evidence Submitted)
**Subscriber**: Admin dashboard, citizen tracking view (for their reported incidents).

**Payload Structure**:
```json
{
  "eventType": "INSERT",
  "schema": "public",
  "table": "resolution_evidence",
  "new": {
    "id": "uuid",
    "incident_id": "uuid",
    "before_image_url": "https://...",
    "after_image_url": "https://...",
    "ai_verification_passed": true,
    "ai_confidence": 87.3,
    "submitted_by": "uuid",
    "created_at": "2026-01-01T10:00:00Z"
  },
  "old": {}
}
```

**Frontend Action**: Show AI verification result badge on incident detail page. Display before/after image comparison widget. If `ai_verification_passed = true`, update incident status display.

---

### `notifications` Events

#### Event: `INSERT` (New Notification Received)
**Subscriber**: Authenticated user (filtered by `user_id = current user`).

**Payload Structure**:
```json
{
  "eventType": "INSERT",
  "schema": "public",
  "table": "notifications",
  "new": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Incident Updated",
    "message": "Your reported issue has been assigned to a Ward Officer.",
    "is_read": false,
    "created_at": "2026-01-01T09:00:00Z"
  },
  "old": {}
}
```

**Frontend Action**: Increment unread notification badge counter. Show toast notification with title and message. Append to notification feed.

---

#### Event: `UPDATE` (Notification Read Status Changed)
**Subscriber**: Authenticated user.

**Payload Structure**:
```json
{
  "eventType": "UPDATE",
  "schema": "public",
  "table": "notifications",
  "new": { "id": "uuid", "is_read": true },
  "old": { "id": "uuid", "is_read": false }
}
```

**Frontend Action**: Decrement unread notification badge counter. Remove `unread` styling from the notification item.

---

## Recommended Frontend Channel Setup

```javascript
// 1. User notifications (citizen/officer)
const notifChannel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${session.user.id}`
  }, handleNotificationEvent)
  .subscribe();

// 2. Incident updates (officer — scoped by department via RLS)
const incidentChannel = supabase
  .channel('officer-incidents')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'incidents'
  }, handleIncidentEvent)
  .subscribe();

// 3. Escalation alerts (officer)
const escalationChannel = supabase
  .channel('officer-escalations')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'escalations'
  }, handleEscalationEvent)
  .subscribe();

// 4. Resolution evidence (admin/citizen view)
const resolutionChannel = supabase
  .channel('resolution-evidence')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'resolution_evidence'
  }, handleResolutionEvent)
  .subscribe();
```

> **Important**: Always unsubscribe from channels on component unmount to avoid memory leaks and duplicate subscriptions.

---

## Supabase Realtime RLS Enforcement Note

Supabase Realtime enforces Row Level Security on `postgres_changes` events.

- A citizen will **only** receive `notifications` events for rows where `user_id = auth.uid()`.
- A Level 1 Ward Officer will **only** receive `incidents` events for incidents within their authorized department and zone scope.
- A Level 3 Commissioner will receive events for all incidents.

No additional client-side filtering is required for security — RLS handles it. However, the Frontend may implement client-side filtering for UX performance optimisation.

---

## Contract Stability Rules

1. **Realtime-enabled tables** (`incidents`, `escalations`, `resolution_evidence`, `notifications`) are stable. Adding a table to Realtime requires a contract update.
2. **Payload field additions** are non-breaking.
3. **Payload field removal or type changes** are breaking changes.
4. **Channel naming conventions** are internal implementation details; only the table subscriptions and payload shapes are contractual.

---

> **Next**: `docs/AUTH_CONTRACT.md` — Authentication & Role Contract (Step 6)
