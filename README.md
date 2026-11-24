# RationReady — Know before you go.

> **Project:** RationReady  
> **Competition:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Status:** Phase 1 — Foundation implementation under technical review.  
> **Repository:** [https://github.com/jlwebcraft/rationready](https://github.com/jlwebcraft/rationready)

---

## 1. Project Overview & Problem Statement

Public Distribution System (PDS) beneficiaries often travel to their assigned Fair Price Shop (ration shop) without knowing:

- Whether the shop is crowded with long waiting times.
- Whether the biometric electronic Point of Sale (ePOS) terminal is working.
- Whether essential commodities (such as rice, wheat, or sugar) are currently available.

A wasted visit costs daily-wage earners and vulnerable citizens travel expenses, physical effort, and lost wages.

**RationReady** is a lightweight, mobile-first community visit assistant that provides recent, time-stamped crowdsourced updates and authorised shop-side reports before people leave home.

**Positioning Notice:** RationReady is an informational visit-planning assistant. It is **not** an official government portal, does not issue ration, does not calculate entitlements, and does not replace official PDS/ePOS records.

---

## 2. Technology Stack

| Layer              | Technology                         | Details                                                                                                                                                    |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**       | React 18 + Vite 6 + TypeScript     | Fast static client application                                                                                                                             |
| **Styling**        | Tailwind CSS 3                     | Accessible, clean public-service design system                                                                                                             |
| **Hosting**        | AWS Amplify Hosting                | Git-connected static hosting (Target for Phase 6)                                                                                                          |
| **Backend API**    | AWS Lambda + TypeScript            | Serverless microservices on Node.js 22 runtime                                                                                                             |
| **API Gateway**    | Amazon API Gateway HTTP API        | HTTP API routing with CORS in Phase 1 (Target architecture includes Cognito JWT authorizer; will be attached when protected routes are added in Phase 4/5) |
| **Database**       | Amazon DynamoDB                    | On-demand tables (`Shops`, `Reports`) with TTL                                                                                                             |
| **Authentication** | Amazon Cognito User Pool           | User Pool, App Client, and Groups configured in SAM in Phase 1; API Gateway authorizer integration planned for later phases                                |
| **Infrastructure** | AWS SAM / CloudFormation           | Repeatable infrastructure as code                                                                                                                          |
| **AWS Region**     | Asia Pacific (Mumbai) `ap-south-1` | Target AWS deployment region                                                                                                                               |

---

## 3. Repository & Directory Structure

```text
rationready/
├── apps/
│   ├── web/                     # React + Vite + TypeScript frontend
│   │   ├── public/              # Static assets
│   │   └── src/
│   │       ├── app/             # Application shell & layout
│   │       ├── components/      # Shared components (Header, Nav, Footer, States)
│   │       ├── features/        # Feature modules (shops, queue, epos, stock, auth, manager)
│   │       ├── lib/             # API client, auth client, utilities
│   │       ├── hooks/           # Custom React hooks
│   │       ├── types/           # Shared frontend TypeScript interfaces
│   │       └── styles/          # Tailwind CSS global styles
│   └── api/                     # AWS Lambda backend
│       ├── src/
│       │   ├── handlers/        # Lambda entry points (health, shops, reports)
│       │   ├── services/        # Aggregation logic and business rules
│       │   ├── repositories/    # DynamoDB access layer
│       │   ├── validators/      # Request payload validation
│       │   ├── middleware/      # JWT claims and authorization
│       │   ├── domain/          # Domain models, entities, enums
│       │   └── utils/           # API Gateway response helpers
│       └── tests/               # Backend Vitest unit test suite
├── infrastructure/
│   └── sam/
│       ├── template.yaml        # AWS SAM template skeleton (Node 22 target)
│       └── samconfig.toml.example
├── scripts/
│   ├── seed-demo-data.ts        # Seed script for 5 approved demonstration shops
│   └── smoke-test.ts            # Smoke test runner
├── docs/                        # Project documentation & deliverables
├── .github/workflows/           # GitHub Actions CI workflow
├── .env.example                 # Environment configuration template
├── .gitignore                   # Multi-layer git exclusion rules
├── package.json                 # Monorepo root configuration & npm workspaces
├── README.md                    # Project documentation
└── RATIONREADY_ROADMAP.md       # Frozen master roadmap (v1.0)
```

---

## 4. Local Installation & Development

### Prerequisites

- **Node.js:** v20+ or v24+ (`v24.11.1` verified)
- **npm:** v9+ (`11.6.2` verified)
- **Git:** v2.x

### Step-by-Step Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/jlwebcraft/rationready.git
   cd rationready
   ```

2. **Install all dependencies:**

   ```bash
   npm install
   ```

3. **Configure local environment variables:**

   ```bash
   cp .env.example .env
   ```

4. **Start the frontend development server:**

   ```bash
   npm run dev
   # Server starts at http://localhost:3000
   ```

5. **Build all applications:**
   ```bash
   npm run build
   ```

---

## 5. Development & Testing Commands

| Command                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Starts the React + Vite frontend development server     |
| `npm run build`        | Compiles the frontend and backend applications          |
| `npm run test`         | Runs the full Vitest test suite across all workspaces   |
| `npm run typecheck`    | Executes strict TypeScript checks without emitting code |
| `npm run lint`         | Runs ESLint across frontend and backend code            |
| `npm run format`       | Formats all files using Prettier                        |
| `npm run format:check` | Verifies code formatting conformance                    |

---

## 6. Security Precautions & Data Privacy Guardrails

- **Zero Sensitive Data:** RationReady does **not** collect or store Aadhaar numbers, ration card identifiers, biometric details, household income, or caste data.
- **Strict Role Derivation:** In subsequent phases, user roles and identities are derived exclusively from verified Amazon Cognito JWT claims, never from client request bodies.
- **Demo Data Transparency:** All demonstration records are explicitly flagged with `isDemoData: true` and labelled **DEMO DATA**.
- **No Committed Secrets:** Credentials, access keys, and private configuration files are strictly excluded via `.gitignore`. Commit templates (`.env.example`) contain placeholders only.

---

## 7. Current Development Status

- **Phase 0 (Project Control & Preparation):** In progress (Team Leader `@jlwebcraft` confirmed; synthetic pilot dataset approved; AWS account & budget checks pending human verification).
- **Phase 1 (Foundation & Application Shell):** Phase 1 — Foundation implementation under technical review.
- **Future Phases (Not Yet Started):**
  - AWS Cloud Deployment (Phase 6): Cloud infrastructure not yet provisioned; scheduled for Phase 6 following AWS budget protection confirmation.
  - Live API Functionality & DynamoDB Integration: Scheduled for Phase 2 & Phase 3.
  - Working Beneficiary/Manager Authentication & API Protection: Cognito User Pool and role groups are scaffolded in SAM for Phase 1; API Gateway JWT authorizer configuration and authenticated submission routes are scheduled for Phase 4 & Phase 5.
  - Interactive Shop Directory & Reporting Flows: Scheduled for Phase 2 & Phase 4.
