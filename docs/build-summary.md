# RationReady — Build Summary

> **Status:** Phase 2 Shop Directory & Data Layer Implementation

---

## 1. Technologies & Architecture Implemented

- **Frontend:**
  - React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.
  - Application shell: Header, Navigation, Footer, Responsive States (LoadingState, EmptyState, ErrorState).
  - Shop Directory: Locality filtering, search by name/landmark, result count, and shop list (`ShopList`, `ShopFilter`, `ShopCard`).
  - Shop Detail: Individual shop view (`ShopDetail`) with locality, landmark, verified hours indication (_"Verified operating hours not yet provided"_ when unverified), last updated timestamp, and Phase 3 roadmap status notice.
  - API Client & Error Handling (`apps/web/src/features/shops/api.ts`):
    - Reads the single environment variable `VITE_API_URL` (aligned with `.env.example`).
    - Falls back to local synthetic demonstration fixtures **only** when `VITE_API_URL` is unconfigured.
    - When `VITE_API_URL` is configured, surfaces HTTP errors, network failures, and malformed response envelopes directly to `ErrorState` (with retry support), while mapping HTTP `404` on shop detail to `null` for the not-found view.
  - Prominent Demonstration Data transparency: Amber `DEMO DATA` badges and contextual warning banners across all synthetic records.
- **Backend:**
  - Node.js 22 AWS Lambda target with TypeScript 5.7.
  - Handlers:
    - `health`: `GET /health` service health check.
    - `shops`: `GET /shops` (with optional `locality` query filter) and `GET /shops/{shopId}`.
  - Repositories:
    - `ShopRepository`: `getShopById`, `listShops(locality?)`, and `saveShop` with `@aws-sdk/lib-dynamodb`.
    - `ReportRepository`: `createReport` and `getReportsByShopId(shopId, limit?)` in descending sort key order (`REPORT#<createdAt>#<reportId>`).
  - Validation: Request parameter validation (`validateShopId`, `validateLocality`) and standard response envelopes (`ApiResponse<T>` with `{ success: true, data }` or `{ success: false, error: { code, message, details } }`).
- **Data & Seed Layer:**
  - DynamoDB key schemas defined:
    - `Shops` table: PK `shopId` (String).
    - `Reports` table: PK `shopId` (String), SK `reportKey` (String: `REPORT#<createdAt>#<reportId>`), TTL attribute `expiresAt`.
  - Seed script (`scripts/seed-demo-data.ts`):
    - Generates 5 synthetic shops in `Demo Locality A` and 15 synthetic initial reports (`QUEUE`, `EPOS`, `STOCK`), all marked `isDemoData: true`.
    - Uses execution-time UTC ISO-8601 `createdAt` timestamps (injectable clock for tests) and roadmap-mandated TTL windows (`expiresAt` in Unix epoch seconds: 2h for `QUEUE`, 4h for `EPOS`, 24h for `STOCK`) with matching `reportKey` values.
    - Defaults to safe **dry-run** mode (`npx tsx scripts/seed-demo-data.ts`) with zero AWS network calls or database writes.
    - Explicit `--execute` mode validates `SHOPS_TABLE`, `REPORTS_TABLE`, and `AWS_REGION`, and persists all 20 records via DynamoDB `PutCommand` (`ShopRepository` and `ReportRepository`), reporting any partial or total failures accurately.
- **Infrastructure as Code (AWS SAM):**
  - SAM template (`infrastructure/sam/template.yaml`) updated with `ShopsFunction` routing `GET /shops` and `GET /shops/{shopId}` with scoped `DynamoDBReadPolicy` on `ShopsTable`.
  - On-demand DynamoDB tables: `ShopsTable` and `ReportsTable` (with TTL on `expiresAt`).
  - HTTP API Gateway with CORS enabled.
  - Cognito User Pool and application client scaffolded for Phase 5.
- **Tooling & Code Quality:**
  - ESLint, Prettier, strict TypeScript compilation (`tsc --noEmit`), Vitest testing framework across monorepo workspaces.

---

## 2. Cloud Resources Planned (AWS Region: `ap-south-1`)

- API Gateway HTTP API: `rationready-http-api-${Environment}`
- Cognito User Pool: `rationready-user-pool-${Environment}`
- DynamoDB Shops Table: `rationready-shops-${Environment}` (PK: `shopId`)
- DynamoDB Reports Table: `rationready-reports-${Environment}` (PK: `shopId`, SK: `reportKey`, TTL: `expiresAt`)
- Lambda Functions:
  - `HealthFunction`: Node.js 22 runtime, ARM64 architecture (`GET /health`)
  - `ShopsFunction`: Node.js 22 runtime, ARM64 architecture (`GET /shops`, `GET /shops/{shopId}`)
