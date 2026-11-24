# RationReady — API Contract Specification

> **Base Path:** `/`  
> **Status:** Phase 1 Initial Specification

---

## Public Endpoints

### 1. Health Check

- **`GET /health`**
- **Response `200 OK`:**

```json
{
  "status": "healthy",
  "service": "rationready-api",
  "version": "0.1.0",
  "timestamp": "2026-11-24T12:00:00.000Z",
  "runtime": "nodejs22.x",
  "region": "ap-south-1"
}
```

### 2. Shop Directory (Phase 2)

- **`GET /shops?locality={locality}`**
- Returns list of shops filtered by locality.

### 3. Shop Status (Phase 3)

- **`GET /shops/{shopId}/status`**
- Returns aggregated current status (queue, ePOS, stock) with freshness age and confidence tier.

## Protected Endpoints (Phase 3 & Phase 5)

### 4. Submit Report

- **`POST /shops/{shopId}/reports`**
- Requires Cognito JWT Authorizer.
