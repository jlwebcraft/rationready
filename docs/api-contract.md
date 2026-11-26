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

#### 2.1 List Shops

- **Endpoint:** `GET /shops`
- **Query Parameters:**
  - `locality` (optional, string): Filter shops by locality (e.g. `Demo Locality A`). If omitted, returns all accessible shops.
- **Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "shops": [
      {
        "shopId": "demo-shop-001",
        "name": "Demo Shop 01",
        "locality": "Demo Locality A",
        "addressOrLandmark": "Fictional Demonstration Facility 01, Sector Alpha",
        "isDemoData": true,
        "createdAt": "2026-11-24T00:00:00.000Z",
        "updatedAt": "2026-11-24T00:00:00.000Z"
      }
    ],
    "count": 1,
    "locality": "Demo Locality A"
  }
}
```

- **Response `400 Bad Request`:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid locality parameter. Locality must be between 1 and 100 characters."
  }
}
```

#### 2.2 Get Shop Details

- **Endpoint:** `GET /shops/{shopId}`
- **Path Parameters:**
  - `shopId` (required, string): Shop ID between 1 and 64 characters using alphanumeric characters, hyphens (`-`), or underscores (`_`) (e.g. `demo-shop-001`).
- **Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "shopId": "demo-shop-001",
    "name": "Demo Shop 01",
    "locality": "Demo Locality A",
    "addressOrLandmark": "Fictional Demonstration Facility 01, Sector Alpha",
    "isDemoData": true,
    "createdAt": "2026-11-24T00:00:00.000Z",
    "updatedAt": "2026-11-24T00:00:00.000Z"
  }
}
```

- **Response `400 Bad Request`:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid shopId parameter. Only alphanumeric, hyphens, and underscores are allowed."
  }
}
```

- **Response `404 Not Found`:**

```json
{
  "success": false,
  "error": {
    "code": "SHOP_NOT_FOUND",
    "message": "Shop with ID 'unknown-shop' not found."
  }
}
```

### 3. Shop Status (Phase 3)

- **`GET /shops/{shopId}/status`**
- Returns aggregated current status (queue, ePOS, stock) with freshness age and confidence tier.

## Protected Endpoints (Phase 3 & Phase 5)

### 4. Submit Report

- **`POST /shops/{shopId}/reports`**
- Requires Cognito JWT Authorizer.
