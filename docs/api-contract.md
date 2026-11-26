# RationReady — API Contract Specification

> **Base Path:** `/`  
> **Status:** Phase 3 Reporting, Freshness & Trust Engine Specification  
> **Region:** AWS `ap-south-1` (Asia Pacific - Mumbai)

---

## 1. General Principles

### Response Envelope

All API responses follow a uniform JSON envelope:

#### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_ENUM",
    "message": "Human-readable description of error.",
    "details": null
  }
}
```

### Standard Error Codes

| Code                 | HTTP Status | Description                                                            |
| -------------------- | ----------- | ---------------------------------------------------------------------- |
| `VALIDATION_ERROR`   | 400         | Invalid payload, path parameter, or forbidden client-supplied metadata |
| `UNAUTHORIZED`       | 401         | Missing or invalid Cognito JWT claims (`sub` claim missing or empty)   |
| `FORBIDDEN`          | 403         | Authenticated user lacks permission for the requested action           |
| `SHOP_NOT_FOUND`     | 404         | Target `shopId` does not exist                                         |
| `METHOD_NOT_ALLOWED` | 405         | HTTP method is not supported on this endpoint                          |
| `COOLDOWN_ACTIVE`    | 429         | Duplicate submission within the 60-second cooldown window              |
| `INTERNAL_ERROR`     | 500         | Unhandled server exception or database query failure                   |

---

## 2. Public Endpoints

### 2.1 Health Check

- **Endpoint:** `GET /health`
- **Authentication:** None (Public)
- **Response `200 OK`:**

```json
{
  "status": "healthy",
  "service": "rationready-api",
  "version": "0.1.0",
  "timestamp": "2026-11-26T12:00:00.000Z",
  "runtime": "nodejs22.x",
  "region": "ap-south-1"
}
```

---

### 2.2 List Shops

- **Endpoint:** `GET /shops`
- **Authentication:** None (Public)
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

---

### 2.3 Get Shop Details

- **Endpoint:** `GET /shops/{shopId}`
- **Authentication:** None (Public)
- **Path Parameters:**
  - `shopId` (required, string): Shop ID between 1 and 64 characters (`[a-zA-Z0-9_-]+`).
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
    "message": "Shop with ID 'unknown-shop' was not found."
  }
}
```

---

### 2.4 Get Aggregated Shop Status (Phase 3)

- **Endpoint:** `GET /shops/{shopId}/status`
- **Authentication:** None (Public)
- **Path Parameters:**
  - `shopId` (required, string): Target shop identifier.
- **Description:** Returns the real-time aggregated status for queue wait time, ePOS operating status, and commodity stock levels. Stale reports (`expiresAt <= nowEpochSeconds`) are strictly excluded. If no fresh reports exist for a metric, it reports `'UNKNOWN'`.
- **Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "shopId": "demo-shop-001",
    "generatedAt": "2026-11-26T12:00:00.000Z",
    "queue": {
      "waitMinutes": 25,
      "latestReportAt": "2026-11-26T11:45:00.000Z",
      "ageSeconds": 900,
      "distinctReporterCount": 3,
      "confidence": "HIGH",
      "sources": ["Community report", "Shop manager update"]
    },
    "epos": {
      "status": "WORKING",
      "latestReportAt": "2026-11-26T11:50:00.000Z",
      "ageSeconds": 600,
      "distinctReporterCount": 2,
      "confidence": "MEDIUM",
      "sources": ["Community report"]
    },
    "stock": [
      {
        "commodityCode": "RICE",
        "availability": "AVAILABLE",
        "latestReportAt": "2026-11-26T10:30:00.000Z",
        "ageSeconds": 5400,
        "distinctReporterCount": 4,
        "confidence": "HIGH",
        "sources": ["Shop manager update"]
      }
    ]
  }
}
```

#### Status Aggregation Rules

1. **Queue Wait Time:**
   - Single-user deduplication: Keeps only the newest report from each distinct user sub.
   - Calculates the median of valid report wait times.
   - Rounds the median to the nearest 5 minutes (`Math.round(val / 5) * 5`).
   - Confidence:
     - 1 reporter: `LOW`
     - 2 reporters: range $\le 15$m $\rightarrow$ `MEDIUM`; range $> 15$m $\rightarrow$ `MIXED`
     - 3+ reporters: range $\le 15$m $\rightarrow$ `HIGH`; range $16\text{--}30$m $\rightarrow$ `MEDIUM`; range $> 30$m $\rightarrow$ `MIXED`
   - 0 valid reports: `waitMinutes = "UNKNOWN"`, `confidence = "LOW"`.
2. **ePOS Operating Status:**
   - Strict majority requirement: `WORKING` or `NOT_WORKING` must receive $> 50\%$ of deduplicated votes.
   - Tied votes (e.g., 1-1, 2-2) produce `status = "MIXED REPORTS"`.
   - Confidence:
     - 1 reporter: `LOW`
     - 2 reporters: agreement $\rightarrow$ `MEDIUM`; tie $\rightarrow$ `MIXED`
     - 3+ reporters: majority $\ge 75\%$ $\rightarrow$ `HIGH`; majority $< 75\%$ $\rightarrow$ `MEDIUM`; tie $\rightarrow$ `MIXED`
   - 0 valid reports: `status = "UNKNOWN"`, `confidence = "LOW"`.
3. **Commodity Stock Availability:**
   - Pilot commodity: Strictly restricted to `RICE`.
   - Strict majority requirement across `AVAILABLE`, `LIMITED`, and `UNAVAILABLE`.
   - Lack of strict majority produces `availability = "MIXED REPORTS"`.
   - Confidence:
     - 1 reporter: `LOW`
     - 2 reporters: agreement $\rightarrow$ `MEDIUM`; disagree $\rightarrow$ `MIXED`
     - 3+ reporters: majority $\ge 75\%$ $\rightarrow$ `HIGH`; majority $< 75\%$ $\rightarrow$ `MEDIUM`; tie $\rightarrow$ `MIXED`
   - 0 valid reports: `availability = "UNKNOWN"`, `confidence = "LOW"`.
4. **Source Provenance:**
   - Aggregates unique labels: `'Community report'` (beneficiaries, visitors, admins) and `'Shop manager update'` (authorized FPS managers).

---

## 3. Protected Endpoints

### 3.1 Submit Report (Phase 3)

- **Endpoint:** `POST /shops/{shopId}/reports`
- **Authentication:** Required (Amazon Cognito JWT Bearer token)
  - Authorization Header: `Authorization: Bearer <Cognito-JWT-Token>`
  - API Gateway passes claims via `event.requestContext.authorizer.jwt.claims`.
  - **Fail Closed:** If authorizer claims or `claims.sub` are missing, the endpoint rejects the request with HTTP `401 Unauthorized` without reading or writing database records.
- **Path Parameters:**
  - `shopId` (required, string): Target shop identifier.

#### Request Body Schemas

##### 1. QUEUE Report

```json
{
  "reportType": "QUEUE",
  "payload": {
    "waitMinutes": 25
  }
}
```

- `waitMinutes`: Required integer between `0` and `180` inclusive. Decimals, negatives, values $> 180$, and strings are rejected.

##### 2. EPOS Report

```json
{
  "reportType": "EPOS",
  "payload": {
    "status": "WORKING"
  }
}
```

- `status`: Required enum strictly equal to `"WORKING"` or `"NOT_WORKING"`.

##### 3. STOCK Report

```json
{
  "reportType": "STOCK",
  "payload": {
    "commodityCode": "RICE",
    "availability": "AVAILABLE"
  }
}
```

- `commodityCode`: Required enum strictly restricted to `"RICE"` for the pilot. Any other commodity returns `400 VALIDATION_ERROR`.
- `availability`: Required enum strictly equal to `"AVAILABLE"`, `"LIMITED"`, or `"UNAVAILABLE"`.

#### Security & Server-Side Metadata Controls

Client requests attempting to supply server-controlled fields (`reportId`, `reporterSub`, `reporterRole`, `createdAt`, `expiresAt`, `isDemoData`, `shopId`, or `reportKey`) are rejected immediately with `400 VALIDATION_ERROR`.

Server-managed attributes are assigned as follows:

- `reportId`: `crypto.randomUUID()` generated on the server.
- `createdAt`: Current UTC ISO-8601 string.
- `expiresAt`: Current epoch seconds + validity window:
  - `QUEUE`: $+7,200$ seconds (2 hours)
  - `EPOS`: $+14,400$ seconds (4 hours)
  - `STOCK`: $+86,400$ seconds (24 hours)
- `reportKey`: `REPORT#<createdAt>#<reportId>`
- `reporterSub`: Derived from verified JWT `sub`.
- `reporterRole`: Derived from JWT `cognito:groups` (`SHOP_MANAGER` or `BENEFICIARY`).
- `isDemoData`: Always `false` for user submissions.

#### Duplicate Throttle & Cooldown Protection (P3-05)

A user sub is restricted to submitting at most one report per category every **60 seconds** for a given shop:
`(reporterSub, shopId, reportType, commodityCode?)`

- Evaluated with millisecond precision against `now.getTime() - 60000` converted to ISO-8601 UTC.
- A report submitted within the previous 60 seconds (age $< 60.000$s, e.g. 59.999s) is rejected with HTTP `429 Too Many Requests` (`COOLDOWN_ACTIVE`).
- A report submitted at exactly 60.000s or later (age $\ge 60.000$s, e.g. 60.000s, 60.001s) is permitted.
- The DynamoDB lookup paginates across all matching candidate records using `LastEvaluatedKey` / `ExclusiveStartKey` with an exclusive lower-bound sort key (`reportKey > REPORT#<cutoff>~`), returning immediately upon finding the first match and failing closed if queries fail.

> **Architectural Note on Concurrency:** Query-before-write in DynamoDB without conditional transaction locks has a narrow race window for simultaneous requests from the same user sub; this is a documented design decision consistent with project constraints and cost controls.

#### Responses

- **Response `201 Created`:**

```json
{
  "success": true,
  "data": {
    "shopId": "demo-shop-001",
    "reportKey": "REPORT#2026-11-26T12:00:00.000Z#8d5f308a-4421-4dcb-92fb-60e513812720",
    "reportId": "8d5f308a-4421-4dcb-92fb-60e513812720",
    "reportType": "QUEUE",
    "createdAt": "2026-11-26T12:00:00.000Z",
    "expiresAt": 1795701600,
    "reporterSub": "c8901b0f-7b7f-4ca1-8172-f38b34c38d58",
    "reporterRole": "BENEFICIARY",
    "payload": {
      "waitMinutes": 25
    },
    "isDemoData": false
  }
}
```

- **Response `401 Unauthorized`:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Valid Cognito authorization claims are missing."
  }
}
```

- **Response `400 Bad Request`:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid commodityCode 'WHEAT'. Pilot allowlist is restricted strictly to: RICE."
  }
}
```

- **Response `404 Not Found`:**

```json
{
  "success": false,
  "error": {
    "code": "SHOP_NOT_FOUND",
    "message": "Shop with ID 'shop-999' was not found."
  }
}
```

- **Response `429 Too Many Requests`:**

```json
{
  "success": false,
  "error": {
    "code": "COOLDOWN_ACTIVE",
    "message": "A recent report was already submitted. Please wait 60 seconds between submissions."
  }
}
```

---

## 4. User-Supplied Data Disclaimer

All queue estimates, ePOS device operational statuses, and commodity stock availability figures returned by `/shops/{shopId}/status` are derived from crowd-sourced beneficiary submissions and shop manager field updates. They are not official government records. RationReady provides median estimates and confidence tiers to aid decision-making, but does not guarantee real-time accuracy or inventory availability.
