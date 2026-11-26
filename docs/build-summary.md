# RationReady — Build Summary

> **Status:** Phase 3 Reporting, Freshness & Trust Engine Implementation  
> **Region:** AWS `ap-south-1` (Asia Pacific - Mumbai)

---

## 1. Technologies & Architecture Implemented

### 1.1 Backend Reporting, Freshness & Trust Engine (Phase 3)

- **Domain Models & Enums (`apps/api/src/domain/types.ts`):**
  - Report types: `QUEUE`, `EPOS`, `STOCK`.
  - Pilot commodity constraints: Strictly restricted to `ALLOWED_COMMODITY_CODES = ['RICE']`.
  - Expiry durations: `QUEUE` (7,200s / 2h), `EPOS` (14,400s / 4h), `STOCK` (86,400s / 24h).
  - Cooldown window: 60 seconds (`REPORT_COOLDOWN_SECONDS = 60`).
  - Canonical provenance labels: `'Community report'` (`REPORT_SOURCE_LABELS.COMMUNITY`) and `'Shop manager update'` (`REPORT_SOURCE_LABELS.SHOP_MANAGER`).
  - Error codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `COOLDOWN_ACTIVE` (429), `VALIDATION_ERROR` (400), `SHOP_NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405).
- **Backend Validators (`apps/api/src/validators/report.validator.ts`):**
  - `validateQueuePayload`: Enforces `waitMinutes` as an integer between 0 and 180 inclusive; rejects decimals, negatives, non-numeric values, and out-of-range inputs.
  - `validateEposPayload`: Enforces status strictly matching `WORKING` or `NOT_WORKING`.
  - `validateStockPayload`: Enforces commodity code strictly matching pilot allowlist (`RICE`) and availability matching `AVAILABLE`, `LIMITED`, or `UNAVAILABLE`.
  - `validateSubmitReportInput`: Validates user submission body and enforces security boundaries by rejecting client attempts to supply server-controlled fields (`reportId`, `reporterSub`, `reporterRole`, `createdAt`, `expiresAt`, `isDemoData`, `shopId`, `reportKey`).
  - `validateReport`: Complete entity schema validation before DynamoDB persistence.
- **Data Access Layer (`apps/api/src/repositories/report.repository.ts`):**
  - `getAllReportsByShopId`: Implements DynamoDB query pagination looping with `ExclusiveStartKey` until `LastEvaluatedKey` is undefined, returning full descending item history (`P3-10`).
  - `findRecentUserReport`: Queries recent reports for a shop within the cooldown window using an exclusive lower-bound sort key condition (`reportKey > REPORT#<cutoffIso>~`) and pagination loop (`LastEvaluatedKey` / `ExclusiveStartKey`) to enforce per-user rate limits (`P3-05`), returning immediately upon match and excluding reports created at or before cutoff. Fails closed if any query fails.
  - _Concurrency Notice:_ Query-before-write in DynamoDB without conditional transaction locks has a narrow race window for simultaneous requests from the same user sub; documented in accordance with project constraints.
- **Trust & Freshness Engine (`apps/api/src/services/reporting.service.ts`):**
  - Server-side timestamping (`createdAt` ISO-8601 UTC) and epoch second expiry calculations (`P3-04`).
  - 60-second cooldown verification across `(reporterSub, shopId, reportType, commodityCode?)` evaluated with millisecond precision against `now.getTime() - 60000` (`P3-05`).
  - Stale report exclusion: Reports with `expiresAt <= nowEpochSeconds` (including exact boundary `expiresAt === nowEpochSeconds`) are strictly filtered out before aggregation even if DynamoDB TTL has not yet deleted them (`P3-10`).
  - Single-user deduplication: Groups valid reports by user sub per category and preserves only the newest submission (`P3-06`).
  - Queue calculation: Computes median wait time across deduplicated reports and rounds to the nearest 5 minutes (`P3-06`).
  - ePOS calculation: Enforces strict majority ($> 50\%$) between `WORKING` and `NOT_WORKING`; splits and ties yield `'MIXED REPORTS'` (`P3-07`).
  - Stock calculation: Enforces strict majority per commodity; splits yield `'MIXED REPORTS'` (`P3-08`).
  - Confidence tiers: Computes `LOW`, `MEDIUM`, `HIGH`, or `MIXED` based on distinct reporter volume, agreement percentage, and queue time ranges (`P3-09`).
  - Provenance labels: Identifies contributing roles and outputs canonical source badges (`P3-09`).
- **HTTP Handlers & Routing (`apps/api/src/handlers/reports.ts`):**
  - `submitReportHandler`: Protected endpoint (`POST /shops/{shopId}/reports`). Enforces fail-closed authentication: missing Cognito claims or `claims.sub` immediately return HTTP 401 `UNAUTHORIZED` (`P3-11`). Extracts role from `cognito:groups`.
  - `getShopStatusHandler`: Public endpoint (`GET /shops/{shopId}/status`). Returns real-time status summary or `'UNKNOWN'` when no valid reports exist (`P3-12`).
  - Unified `handler`: Method and subpath router for HTTP API Gateway.
- **Infrastructure as Code (AWS SAM) (`infrastructure/sam/template.yaml`):**
  - Added `ReportsFunction` routing `GET /shops/{shopId}/status` and `POST /shops/{shopId}/reports`.
  - Attached least-privilege IAM policies: `DynamoDBReadPolicy` on `ShopsTable`, `DynamoDBReadPolicy` on `ReportsTable`, and `DynamoDBWritePolicy` on `ReportsTable`.

---

### 1.2 Prior Architecture Preserved (Phases 1 & 2)

- **Frontend (`apps/web`):**
  - React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.
  - Shop directory with locality filtering, search, result count, and shop detail views.
  - Prominent demonstration badges (`DEMO DATA`) and verified operating hours disclaimers.
  - Single environment configuration `VITE_API_URL` resolving from repository root `.env` via `envDir`.
- **Zero AWS Provisioning:**
  - In strict compliance with Phase 0 budget and billing requirements, no cloud infrastructure was provisioned or deployed. All tests mock AWS SDK interactions.

---

## 2. Cloud Resources Planned (AWS Region: `ap-south-1`)

- API Gateway HTTP API: `rationready-http-api-${Environment}`
- Cognito User Pool: `rationready-user-pool-${Environment}`
- DynamoDB Shops Table: `rationready-shops-${Environment}` (PK: `shopId`)
- DynamoDB Reports Table: `rationready-reports-${Environment}` (PK: `shopId`, SK: `reportKey`, TTL: `expiresAt`)
- Lambda Functions:
  - `HealthFunction`: Node.js 22 runtime, ARM64 architecture (`GET /health`)
  - `ShopsFunction`: Node.js 22 runtime, ARM64 architecture (`GET /shops`, `GET /shops/{shopId}`)
  - `ReportsFunction`: Node.js 22 runtime, ARM64 architecture (`GET /shops/{shopId}/status`, `POST /shops/{shopId}/reports`)
