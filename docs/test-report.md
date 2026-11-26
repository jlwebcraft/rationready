# RationReady — Test Report

> **Status:** Phase 2 Shop Directory & Data Layer Verification

---

## 1. Test Execution Summary

A total of **70 automated unit tests** run across the monorepo via Vitest, achieving 100% pass rate.

| Workspace          | Test Suite                                    | Tests        | Status         |
| ------------------ | --------------------------------------------- | ------------ | -------------- |
| `@rationready/api` | `tests/health.test.ts`                        | 2            | Passed         |
| `@rationready/api` | `tests/shop.validator.test.ts`                | 13           | Passed         |
| `@rationready/api` | `tests/shop.repository.test.ts`               | 5            | Passed         |
| `@rationready/api` | `tests/report.repository.test.ts`             | 2            | Passed         |
| `@rationready/api` | `tests/shops.handler.test.ts`                 | 10           | Passed         |
| `@rationready/api` | `tests/seed-demo-data.test.ts`                | 10           | Passed         |
| `@rationready/web` | `src/components/__tests__/Shell.test.tsx`     | 6            | Passed         |
| `@rationready/web` | `src/features/shops/__tests__/api.test.ts`    | 12           | Passed         |
| `@rationready/web` | `src/features/shops/__tests__/Shops.test.tsx` | 10           | Passed         |
| **Total**          | **9 suites**                                  | **70 tests** | **All Passed** |

---

## 2. Test Details

### Backend Unit Tests (`apps/api`)

- **Health Handler (`health.test.ts`):** Validates 200 OK status, timestamp generation, and service metadata.
- **Shop Validators (`shop.validator.test.ts`):** Validates shop ID constraints, locality name constraints, full shop object validation, demo flag enforcement, and rejection of invalid/malformed payloads.
- **Shop Repository (`shop.repository.test.ts`):** Tests DynamoDB document client interactions using mocked AWS SDK calls: `getShopById` success and not-found, `listShops` without filter, `listShops` with locality filter, and `saveShop`.
- **Report Repository (`report.repository.test.ts`):** Tests `createReport` and `getReportsByShopId` verifying reverse chronological sorting and DynamoDB mapping.
- **Shops Handler (`shops.handler.test.ts`):** Validates `GET /shops` (all shops), `GET /shops?locality=...` (filtering), `GET /shops/{shopId}` (retrieval and 404), parameter validation errors (400), unsupported HTTP methods (405), and error envelope compliance.
- **Demo Data Seed Script (`seed-demo-data.test.ts`):** Validates 5 shops and 15 reports generation with `isDemoData: true`, clock-based UTC ISO-8601 timestamps, 2h/4h/24h TTL expiry calculations, matching `reportKey` formatting, zero DynamoDB writes in dry-run mode, `SHOPS_TABLE`/`REPORTS_TABLE`/`AWS_REGION` validation, all 20 mocked `PutCommand` writes in execution mode, and accurate partial-write failure reporting.

### Frontend Unit Tests (`apps/web`)

- **Application Shell (`Shell.test.tsx`):** Verifies header title, subtitle, navigation tabs, footer notices, and responsive states (`LoadingState`, `EmptyState`, `ErrorState`).
- **Shops API Client (`api.test.ts`):** Verifies `VITE_API_URL` configuration (ignoring `VITE_API_BASE_URL`), local synthetic demo shop fallback only when `VITE_API_URL` is unset, valid API responses, HTTP 404 returning `null` for `fetchShopById`, and explicit error throwing on non-success HTTP statuses, network failures, and malformed envelopes.
- **Shop Directory Components (`Shops.test.tsx`):**
  - `ShopCard`: Renders shop name, locality badge, demo badge, landmark, and view details CTA.
  - `ShopFilter`: Renders locality dropdown, search input, and calls filter change callbacks.
  - `ShopList`: Handles data fetching, locality selection, search filtering, empty states with reset, API error surfacing to `ErrorState`, and retry recovery.
  - `ShopDetail`: Fetches and displays shop details, landmark, verified hours notice, last updated date, roadmap status notice, back button interaction, `Shop Not Found` on 404/unknown ID, and `Shop Load Error` on API/network failures.

---

## 3. Monorepo Quality Verification

- **TypeScript Compilation:** Strict type checking (`tsc --noEmit`) passes with zero errors across `@rationready/api` and `@rationready/web`.
- **Linting:** ESLint verification passes with zero warnings or errors.
- **Formatting:** Prettier verification passes across all codebase files.
- **Demo Data Seed Verification:** Deterministic execution with dry-run mode tested via `npx tsx scripts/seed-demo-data.ts` (zero AWS network calls or writes).
