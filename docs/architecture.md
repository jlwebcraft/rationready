# RationReady — System Architecture

> **Competition:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Status:** Phase 1 Foundation Architecture

---

## Architecture Diagram (Target Cloud Model)

```text
Beneficiary / Shop Manager
          |
          v
React + Vite Web Application (AWS Amplify Hosting)
          |
          +----------------------> Amazon Cognito User Pool
          |                         (sign-up / sign-in / roles)
          |
          v
Amazon API Gateway HTTP API
          |
          v
AWS Lambda (TypeScript, Node.js 22 runtime)
          |
          +----------------------> Amazon DynamoDB: Shops Table (PAY_PER_REQUEST)
          |
          +----------------------> Amazon DynamoDB: Reports Table (PAY_PER_REQUEST, TTL)
          |
          v
Amazon CloudWatch (Logs and Metrics)
```

## AWS Services Justification

- **AWS Amplify Hosting:** Fast static hosting for React + Vite single-page application.
- **Amazon API Gateway HTTP API:** Low-latency serverless REST endpoints with native Cognito JWT authorizer support.
- **AWS Lambda (Node.js 22):** Serverless compute for report aggregation and request validation.
- **Amazon DynamoDB:** Fully managed on-demand NoSQL database with TTL for automatic report storage cleanup.
- **Amazon Cognito:** Managed user identity for beneficiaries and shop managers.
- **Amazon CloudWatch:** Logging, debugging, and operational health monitoring.

---

## DynamoDB Data Architecture & Key Schemas (Phase 2 Specification)

Per `RATIONREADY_ROADMAP.md` Section 2 and task `P2-01`, two on-demand DynamoDB tables are defined:

### 1. Shops Table (`rationready-shops-{Environment}`)

- **Billing Mode:** `PAY_PER_REQUEST` (On-Demand capacity)
- **Primary Key Structure:**
  - **Partition Key (HASH):** `shopId` (`String`) — Unique shop identifier (e.g., `demo-shop-001`).
  - **Sort Key:** None.
- **Attributes:**
  - `shopId` (`String`, required): Unique shop identifier.
  - `name` (`String`, required): Shop title / name.
  - `locality` (`String`, required): Assigned operational locality (e.g., `Demo Locality A`).
  - `addressOrLandmark` (`String`, required): Address or verified landmark.
  - `isDemoData` (`Boolean`, required): Flag indicating synthetic demonstration records (`true`).
  - `createdAt` (`String`, required): ISO-8601 UTC creation timestamp.
  - `updatedAt` (`String`, required): ISO-8601 UTC update timestamp.
  - `latitude` (`Number`, optional): Geographic latitude coordinate.
  - `longitude` (`Number`, optional): Geographic longitude coordinate.
  - `openingHours` (`String`, optional): Verified operating hours.
- **Access Patterns:**
  - `GetShopById`: `GetItem` with key `{ shopId }`.
  - `ListShops`: Scan-and-filter by `locality` (tailored for the initial 5–10 shop pilot without premature GSI overhead).

### 2. Reports Table (`rationready-reports-{Environment}`)

- **Billing Mode:** `PAY_PER_REQUEST` (On-Demand capacity)
- **Primary Key Structure:**
  - **Partition Key (HASH):** `shopId` (`String`) — Associated shop identifier.
  - **Sort Key (RANGE):** `reportKey` (`String`) — Lexicographically sortable timestamp and report identifier (`REPORT#<createdAt>#<reportId>`).
- **Attributes:**
  - `shopId` (`String`, required): Partition key referencing the target shop.
  - `reportKey` (`String`, required): Range key for chronological sorting.
  - `reportId` (`String`, required): Unique report identifier.
  - `reportType` (`String`, required): `QUEUE`, `EPOS`, or `STOCK`.
  - `createdAt` (`String`, required): ISO-8601 UTC submission timestamp.
  - `expiresAt` (`Number`, required): Unix epoch seconds. DynamoDB Time to Live (TTL) attribute.
  - `reporterSub` (`String`, required): Cognito User Sub identifier (or demo reporter ID).
  - `reporterRole` (`String`, required): User role at time of reporting (`VISITOR`, `BENEFICIARY`, `SHOP_MANAGER`, `ADMIN`).
  - `payload` (`Map`, required): Specific report details (`waitMinutes` for Queue, `status` for ePOS, `commodityCode` + `availability` for Stock).
  - `isDemoData` (`Boolean`, required): Synthetic indicator.
- **Time to Live (TTL):** Enabled on `expiresAt` attribute.
- **Access Patterns:**
  - `QueryReportsByShop`: `Query` where `shopId = :shopId` ordered by `reportKey` descending.
