# Smart Civic System — Node.js/Express Backend API

This is the Express backend microservice for the Smart Civic System. It interfaces between the React Frontend, Supabase PostgreSQL / Auth database, and FastAPI ML detection service.

---

## Technical Stack

- **Runtime**: Node.js (>= 18)
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL + PostGIS (`@supabase/supabase-js`)
- **Authentication**: Supabase Auth JWT (`Authorization: Bearer <token>`)
- **ML Integration**: FastAPI Microservice (Axios / Multipart Form)
- **File Processing**: Multer (In-memory buffer)

---

## Directory Structure

```
backend/
  src/
    server.js                  # Entry point
    app.js                     # Express app setup & middleware registration
    config/
      env.js                   # Environment configuration & validation
      supabase.js              # Supabase clients (user context + service role)
    integrations/
      ml/
        mlClient.js            # FastAPI ML service integration client
    middleware/
      authMiddleware.js        # JWT authentication & role authorization
      uploadMiddleware.js      # Multer file upload handlers
      errorHandler.js          # Centralized error handler envelope
    errors/
      apiError.js              # Custom operational ApiError class
    controllers/
      profileController.js     # User profile handlers
      reportController.js      # Citizen report submission & listing
      incidentController.js    # Work order management, escalation, evidence
      notificationController.js# User notifications
      masterDataController.js  # Zones, Departments, SLA, Officers
    services/
      reportService.js         # Report processing, storage & deduplication
      incidentService.js       # Atomic RPC escalations & evidence verification
    routes/
      index.js                 # API v1 aggregator
      profileRoutes.js
      reportRoutes.js
      incidentRoutes.js
      notificationRoutes.js
      masterDataRoutes.js
  .env.example
  package.json
  README.md
```

---

## Local Setup & Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update credentials:

```bash
cp .env.example .env
```

### 3. Run Server

- **Development Mode**:
  ```bash
  npm run dev
  ```

- **Production Mode**:
  ```bash
  npm start
  ```

The server listens on `http://localhost:4000/api/v1`.

---

## Health Check Endpoint

```http
GET http://localhost:4000/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "smart-civic-backend",
    "timestamp": "2026-08-17T15:00:00.000Z"
  }
}
```

---

## Endpoint Inventory

| Method | Endpoint | Auth Required | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/profile/me` | Yes | Any | Returns authenticated user profile |
| `PATCH` | `/api/v1/profile/me` | Yes | Any | Updates user profile (`full_name`, `phone_number`) |
| `POST` | `/api/v1/reports` | Yes | `citizen` | Submits new report with image/voice note |
| `GET` | `/api/v1/reports` | Yes | `citizen` | Lists citizen's submitted reports |
| `GET` | `/api/v1/reports/:reportId` | Yes | Any | Gets single report details |
| `GET` | `/api/v1/incidents` | Yes | Any | Lists incidents (scoped by role/department/zone) |
| `GET` | `/api/v1/incidents/:incidentId` | Yes | Any | Gets incident details with history & evidence |
| `PATCH` | `/api/v1/incidents/:incidentId/status` | Yes | `ward_officer`, `aee`, `commissioner`, `admin` | Updates operational status |
| `POST` | `/api/v1/incidents/:incidentId/escalate` | Yes | `ward_officer`, `aee`, `admin` | Triggers atomic level escalation RPC |
| `GET` | `/api/v1/incidents/:incidentId/escalations` | Yes | `ward_officer`, `aee`, `commissioner`, `admin` | Lists escalation history |
| `POST` | `/api/v1/incidents/:incidentId/resolution` | Yes | `ward_officer`, `aee`, `commissioner`, `admin` | Submits before/after evidence with AI check |
| `GET` | `/api/v1/incidents/:incidentId/resolution` | Yes | Any | Gets resolution evidence records |
| `GET` | `/api/v1/notifications` | Yes | Any | Lists user notifications |
| `PATCH` | `/api/v1/notifications/:id/read` | Yes | Any | Marks notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | Yes | Any | Marks all notifications as read |
| `GET` | `/api/v1/zones` | Yes | Any | Lists municipal zones |
| `GET` | `/api/v1/departments` | Yes | Any | Lists municipal departments |
| `GET` | `/api/v1/sla-policies` | Yes | Any | Lists SLA policy configurations |
| `GET` | `/api/v1/officers` | Yes | Any | Lists officer directory |
| `GET` | `/api/v1/officers/:officerId` | Yes | Any | Gets specific officer profile |
