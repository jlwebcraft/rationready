# RationReady — Test Report

> **Status:** Phase 3 Reporting, Freshness & Trust Engine Verification  
> **Framework:** Vitest 2.1.9 across monorepo workspaces  
> **Pass Rate:** 100% (136 / 136 tests passing)

---

## 1. Test Execution Summary

A total of **136 automated unit tests** run across the monorepo via Vitest, achieving a 100% pass rate with zero flaky tests or mock leaks.

| Workspace          | Test Suite                                        | Tests         | Status         | Scope                                                     |
| ------------------ | ------------------------------------------------- | ------------- | -------------- | --------------------------------------------------------- |
| `@rationready/api` | `tests/health.test.ts`                            | 2             | Passed         | Health check endpoint & runtime environment               |
| `@rationready/api` | `tests/shop.validator.test.ts`                    | 13            | Passed         | Shop ID & locality validation rules                       |
| `@rationready/api` | `tests/report.validator.test.ts`                  | 17            | Passed         | Queue (0–180), ePOS, Stock (RICE pilot), client security  |
| `@rationready/api` | `tests/shop.repository.test.ts`                   | 5             | Passed         | DynamoDB Shops CRUD & locality queries                    |
| `@rationready/api` | `tests/report.repository.test.ts`                 | 7             | Passed         | Reports persistence, pagination loops, cooldown queries   |
| `@rationready/api` | `tests/shops.handler.test.ts`                     | 10            | Passed         | Shop directory endpoints & error formatting               |
| `@rationready/api` | `tests/reporting.service.test.ts`                 | 21            | Passed         | Medians, majorities, confidence tiers, cooldown, expiry   |
| `@rationready/api` | `tests/reports.handler.test.ts`                   | 16            | Passed         | Fail-closed auth, submit reports, status queries          |
| `@rationready/api` | `tests/seed-demo-data.test.ts`                    | 15            | Passed         | Seed generation, repeatable timestamps, dry-run safety    |
| `@rationready/web` | `src/components/__tests__/Shell.test.tsx`         | 6             | Passed         | Header, navigation, footer, responsive states             |
| `@rationready/web` | `src/features/shops/__tests__/env-config.test.ts` | 2             | Passed         | Vite root env configuration & prefix boundary             |
| `@rationready/web` | `src/features/shops/__tests__/api.test.ts`        | 12            | Passed         | API client fetching, local demo mode, HTTP error handling |
| `@rationready/web` | `src/features/shops/__tests__/Shops.test.tsx`     | 10            | Passed         | Shop list, filters, shop detail, not-found views          |
| **Total**          | **13 suites**                                     | **136 tests** | **All Passed** | **Monorepo Suite**                                        |

---

## 2. Phase 3 Test Coverage Details

### 2.1 Backend Validators (`report.validator.test.ts` — 17 tests)

- **Queue Payload (`P3-01`):** Validates integer constraints between 0 and 180 inclusive (testing boundaries 0, 45, 180); rejects negative values (-1), values exceeding 180 (181), floating-point decimals (15.5), strings, null, undefined, and non-object inputs.
- **ePOS Payload (`P3-02`):** Validates `WORKING` and `NOT_WORKING`; rejects invalid strings, casing variations (`working`), and non-string inputs.
- **Stock Payload (`P3-03`):** Validates pilot commodity restriction strictly to `RICE` with `AVAILABLE`, `LIMITED`, and `UNAVAILABLE`; asserts non-pilot commodities (`WHEAT`, `SUGAR`, `KEROSENE`) return descriptive errors; rejects invalid availability values.
- **Client Submission Security (`validateSubmitReportInput`):** Confirms valid payloads pass; asserts client attempts to inject server-controlled fields (`reportId`, `reporterSub`, `reporterRole`, `createdAt`, `expiresAt`, `isDemoData`, `shopId`, `reportKey`) are rejected.
- **Database Entity Validation (`validateReport`):** Asserts sound `Report` entities validate, and catches missing or malformed keys, invalid timestamp formats, or negative TTL epoch values.

### 2.2 Report Data Access Layer (`report.repository.test.ts` — 7 tests)

- **Persistence:** Verifies `createReport` issues `PutCommand` with correct table name and entity.
- **Querying:** Verifies `getReportsByShopId` issues descending sort-key query (`ScanIndexForward: false`).
- **Pagination Loop (`P3-10`):** Simulates multi-page DynamoDB responses, verifying the repository continues querying with `ExclusiveStartKey` until `LastEvaluatedKey` is undefined, accumulating all records.
- **Cooldown Lookups (`P3-05`):** Tests `findRecentUserReport` using sort key range expressions (`reportKey >= REPORT#<sinceIso>`); verifies differentiation across user subs, report types, and stock commodities.

### 2.3 Trust & Freshness Engine (`reporting.service.test.ts` — 21 tests)

- **Submit Report:**
  - Verifies 404 `SHOP_NOT_FOUND` when target shop does not exist.
  - Verifies server-generated metadata: UUID `reportId`, UTC ISO `createdAt`, `isDemoData: false`, and exact TTL calculations (`QUEUE: +7200s`, `EPOS: +14400s`, `STOCK: +86400s`).
  - Verifies 429 `COOLDOWN_ACTIVE` when a user attempts duplicate submission within 60 seconds (`P3-05`).
  - Verifies fail-closed behavior if DynamoDB query throws during cooldown check.
- **Freshness & Deduplication:**
  - Verifies reports with `expiresAt <= nowEpochSeconds` are strictly excluded from aggregation (`P3-10`).
  - Verifies single-user deduplication preserves only the newest report per user sub for each category (`P3-06`).
- **Queue Status (`P3-06`, `P3-09`):**
  - Odd report counts: Computes exact median and rounds to nearest 5 minutes.
  - Even report counts: Computes average of middle elements and rounds to nearest 5 minutes.
  - Confidence tiers: 1 reporter $\rightarrow$ `LOW`; 2 reporters with range $\le 15$m $\rightarrow$ `MEDIUM`, range $> 15$m $\rightarrow$ `MIXED`; 3+ reporters with range $\le 15$m $\rightarrow$ `HIGH`, range $16\text{--}30$m $\rightarrow$ `MEDIUM`, range $> 30$m $\rightarrow$ `MIXED`.
- **ePOS Status (`P3-07`, `P3-09`):**
  - Unanimous single report $\rightarrow$ `LOW` confidence.
  - 1-1 tie $\rightarrow$ `'MIXED REPORTS'` with `MIXED` confidence.
  - Majority $\ge 75\%$ (e.g., 3-1) $\rightarrow$ `WORKING` with `HIGH` confidence.
  - Strict majority $< 75\%$ (e.g., 3-2) $\rightarrow$ `WORKING` with `MEDIUM` confidence.
- **Stock Status (`P3-08`, `P3-09`):**
  - Unanimous consensus $\rightarrow$ `AVAILABLE` with `HIGH` confidence.
  - 3-way split (1 available, 1 limited, 1 unavailable) $\rightarrow$ `'MIXED REPORTS'` with `MIXED` confidence.
- **Source Provenance (`P3-09`):**
  - Beneficiary submissions map to `'Community report'`.
  - Shop manager submissions map to `'Shop manager update'`.
  - Mixed submissions output both canonical badges.

### 2.4 Reports HTTP Handlers (`reports.handler.test.ts` — 16 tests)

- **Cognito Auth Extraction (`P3-11`):** Tests extraction of `sub` and mapping of `SHOP_MANAGER` group; verifies missing context or empty `sub` fails closed.
- **Submit Report Handler:** Verifies 401 on missing auth, 400 on invalid shopId, 400 on malformed/missing body, 400 on server metadata injection, 400 on invalid payload rules, 404 on shop not found, 429 on cooldown active, and 201 Created on success.
- **Get Shop Status Handler (`P3-12`):** Verifies 400 on invalid shopId, 404 on shop not found, and 200 OK with full aggregated status payload.
- **Unified Routing:** Verifies correct routing for GET `/shops/{shopId}/status` and POST `/shops/{shopId}/reports`, and 405 Method Not Allowed for unsupported verbs.

---

## 3. Monorepo Quality Verification

- **Strict Type Checking:** `tsc --noEmit` completes with zero errors across all workspaces.
- **Linting:** ESLint verification passes with zero warnings or errors.
- **Formatting:** Prettier verification passes across all codebase files.
- **Zero AWS Provisioning:** Verified that all test suites operate offline using mocked AWS SDK clients with zero cloud infrastructure created.
