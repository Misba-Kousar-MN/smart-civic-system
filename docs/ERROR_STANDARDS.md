# Smart Civic System — Error & Response Standards

> **Step 7 of the Integration Blueprint**  
> This document defines the standardised error codes, HTTP status codes, response envelope shapes, and logging conventions for the Smart Civic System.  
> All Backend API responses must conform to this standard. Frontend must handle all documented error codes.

---

## Response Envelope

All Backend API responses — success or error — must use the following envelope structure.

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable context message"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description safe for display"
  }
}
```

> `"message"` in the success envelope is optional and used for user-facing confirmations (e.g., "Report submitted successfully.").  
> `"error.message"` in the error envelope must be safe to display to the user — never expose raw PostgreSQL errors, stack traces, or internal infrastructure details.

---

## HTTP Status Code Usage

| Code | Semantic | When to Use |
|---|---|---|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful resource creation (POST) |
| `400` | Bad Request | Missing required fields, invalid format, failed client validation |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Valid token but insufficient role or scope |
| `404` | Not Found | Requested resource does not exist |
| `409` | Conflict | Duplicate submission, unique constraint violation |
| `422` | Unprocessable Entity | Business rule violation (e.g., escalation max level reached) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server-side failure |
| `503` | Service Unavailable | ML service or database temporarily unavailable |

---

## Standard Error Codes

### Authentication & Authorization

| Code | HTTP | Description |
|---|---|---|
| `AUTH_TOKEN_MISSING` | `401` | No Authorization header present |
| `AUTH_TOKEN_INVALID` | `401` | JWT is malformed or signature invalid |
| `AUTH_TOKEN_EXPIRED` | `401` | JWT access token has expired |
| `AUTH_INSUFFICIENT_ROLE` | `403` | Authenticated user does not have the required role |
| `AUTH_SCOPE_VIOLATION` | `403` | Officer attempting to access incident outside dept/zone scope |

---

### Validation Errors

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_REQUIRED_FIELD` | `400` | A required field is missing from the request |
| `VALIDATION_INVALID_FORMAT` | `400` | Field value does not match expected type or format |
| `VALIDATION_INVALID_COORDINATES` | `400` | Latitude or longitude is out of valid range |
| `VALIDATION_FILE_TOO_LARGE` | `400` | Uploaded file exceeds the maximum allowed size |
| `VALIDATION_UNSUPPORTED_FILE_TYPE` | `400` | Uploaded file type is not accepted |

---

### Report Errors

| Code | HTTP | Description |
|---|---|---|
| `REPORT_SUBMIT_FAILED` | `500` | Unexpected failure during report submission |
| `REPORT_NOT_FOUND` | `404` | Requested report does not exist or is not accessible |

---

### Incident Errors

| Code | HTTP | Description |
|---|---|---|
| `INCIDENT_NOT_FOUND` | `404` | Requested incident does not exist or is not accessible |
| `INCIDENT_UPDATE_FORBIDDEN` | `403` | Officer attempted to modify a protected incident field |
| `INCIDENT_INVALID_STATUS_TRANSITION` | `422` | Requested status transition is not valid |

---

### Escalation Errors

| Code | HTTP | Description |
|---|---|---|
| `ESCALATION_UNAUTHORIZED` | `403` | Officer is not authorized to escalate this incident |
| `ESCALATION_MAX_LEVEL` | `422` | Incident is already at maximum escalation level (Level 3) |
| `ESCALATION_LEVEL_MISMATCH` | `422` | Incident's current level does not match expected escalation from_level |
| `ESCALATION_REASON_REQUIRED` | `400` | Escalation reason text is required |
| `ESCALATION_FAILED` | `500` | Atomic escalation transaction failed unexpectedly |

---

### Resolution Evidence Errors

| Code | HTTP | Description |
|---|---|---|
| `RESOLUTION_BEFORE_IMAGE_REQUIRED` | `400` | Before image file is required |
| `RESOLUTION_AFTER_IMAGE_REQUIRED` | `400` | After image file is required |
| `RESOLUTION_SUBMIT_FAILED` | `500` | Unexpected failure during evidence submission |
| `RESOLUTION_AI_VERIFICATION_FAILED` | `422` | AI verification determined issue is not resolved |

---

### Notification Errors

| Code | HTTP | Description |
|---|---|---|
| `NOTIFICATION_NOT_FOUND` | `404` | Notification not found or does not belong to user |
| `NOTIFICATION_UPDATE_FORBIDDEN` | `403` | Attempted to modify protected notification fields |

---

### ML Service Errors

| Code | HTTP | Description |
|---|---|---|
| `ML_SERVICE_UNAVAILABLE` | `503` | ML service is unreachable or model not loaded |
| `ML_DETECTION_FAILED` | `500` | Unexpected failure during YOLO inference |
| `ML_IMAGE_QUALITY_LOW` | `422` | Image quality insufficient for reliable detection |
| `ML_CATEGORY_INVALID` | `500` | ML returned an unrecognised category (Backend validation failure) |

---

### Database Errors

| Code | HTTP | Description |
|---|---|---|
| `DB_CONFLICT` | `409` | Unique constraint violated (e.g., duplicate primary report) |
| `DB_FOREIGN_KEY_VIOLATION` | `400` | Referenced entity (zone, department, officer) does not exist |
| `DB_UNEXPECTED` | `500` | Unhandled PostgreSQL error |

---

## Validation Error Response Format

When multiple fields fail validation, the Backend must return all errors at once (do not fail one field at a time).

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_REQUIRED_FIELD",
    "message": "One or more required fields are missing or invalid.",
    "fields": {
      "latitude": "Latitude is required.",
      "image": "An image file is required."
    }
  }
}
```

---

## Pagination Response Shape

All list endpoints must return pagination metadata.

```json
{
  "success": true,
  "data": {
    "<resource_name>": [ { ... } ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "total_pages": 8
    }
  }
}
```

---

## Backend Logging Standards

The Backend must log the following information for every request/response cycle. Logs must never include passwords, JWT tokens, service-role keys, or personally identifying information beyond user IDs.

| Log Field | Description |
|---|---|
| `timestamp` | ISO 8601 UTC timestamp |
| `method` | HTTP method |
| `path` | API endpoint path |
| `status_code` | HTTP response status code |
| `user_id` | Authenticated user UUID (if available) |
| `role` | User's application role (if resolved) |
| `duration_ms` | Request processing time |
| `error_code` | Standardised error code (if error) |

### Error Logging
- `4xx` errors: Log at `warn` level.
- `5xx` errors: Log at `error` level with full stack trace (server-side only — never sent to client).
- ML service failures: Log at `error` level with `processing_time_ms` and the ML error code.

---

## Frontend Error Handling Rules

1. **Always check `success` field** before accessing `data`.
2. **`401` responses**: Attempt token refresh via `supabase.auth.refreshSession()`. If refresh fails, redirect to login.
3. **`403` responses**: Show a role-specific forbidden message. Do not redirect to login.
4. **`422` responses**: Display the `error.message` directly in the UI (escalation limit, invalid transition, etc.).
5. **`500`/`503` responses**: Show a generic "Something went wrong. Please try again." message. Do not expose `error.message` from server errors to end users.
6. **Validation errors (`400`)**: Display `error.fields` inline on the form for each invalid field.

---

> **Next**: `docs/ENV_CONFIG.md` — Environment Configuration (Step 8)
