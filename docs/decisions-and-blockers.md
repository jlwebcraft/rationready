# RationReady — Decisions, Status, and Blockers Log

> **Project:** RationReady  
> **Event:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Last Updated:** 23 November 2026  
> **Single Source of Truth:** `RATIONREADY_ROADMAP.md` (v1.0)

---

## 1. Confirmed Decisions

The following architectural and technical decisions are formally locked per `RATIONREADY_ROADMAP.md` Sections 1 and 2:

- **Product Positioning:** RationReady is a community-powered PDS visit assistant providing freshness-aware, crowd-reported waiting time, ePOS status, and commodity availability for Fair Price Shops. It is explicitly not an official government portal, does not issue ration, and does not conduct entitlement checks.
- **Technology Stack:**
  - **Frontend:** React + Vite + TypeScript with Tailwind CSS.
  - **Frontend Hosting:** AWS Amplify Hosting.
  - **Backend API:** TypeScript on AWS Lambda (Node.js 22 runtime) fronted by Amazon API Gateway HTTP API.
  - **Database:** Amazon DynamoDB (on-demand capacity) with two tables: `Shops` and `Reports`.
  - **Authentication:** Amazon Cognito User Pool with email/password.
  - **Infrastructure as Code:** AWS SAM / CloudFormation.
  - **Testing & Tooling:** Vitest for unit tests; Git + GitHub for version control.
- **Target AWS Region:** Asia Pacific (Mumbai) `ap-south-1`.
- **Role Permissions & Security:**
  - 4 fixed roles: `Visitor` (public read), `Beneficiary` (submit reports via sign-in), `Shop Manager` (updates for assigned shop only), `Administrator` (manage shops and role assignments; outside public registration).
  - Identities and roles derived exclusively from validated Cognito JWT claims on the backend; never trusted from client request bodies.
- **Report Rules & Expiry Windows:**
  - **Queue:** Integer `waitMinutes` (0–180), valid for 2 hours.
  - **ePOS:** `WORKING` or `NOT_WORKING`, valid for 4 hours.
  - **Stock:** `commodityCode` + `AVAILABLE` / `LIMITED` / `UNAVAILABLE`, valid for 24 hours.
- **Aggregation & Confidence Logic:**
  - Evaluated strictly server-side. Stale reports (`expiresAt <= now`) excluded by query filter regardless of DynamoDB TTL execution timing.
  - Queue wait: median value rounded to nearest 5 minutes.
  - ePOS and Stock: strict majority rule; ties/disagreements display as `MIXED REPORTS`.
  - Reporter counting: maximum 1 active report per unique Cognito user sub per shop/type/commodity.
  - Confidence tiers: `LOW` (1 reporter), `MEDIUM`, `HIGH`, or `MIXED`.
- **Strict Out-of-Scope Guardrails:**
  - No Aadhaar or ration-card collection/storage.
  - No SMS OTP or paid third-party APIs.
  - No GPS tracking or map services.
  - No AI/ML prediction or chatbots.
  - No direct government ePOS integration.

---

## 2. Pending Human Decisions

The following items require explicit action or decision from the team:

1. **Designation of Team Leader (`P0-03`):**
   - Identify the primary Team Leader holding sole responsibility for submitting deliverables through the official Techfest portal.
2. **Participant Eligibility & Builder Center Verification (`P0-04`):**
   - Each participating student must confirm their AWS Builder Center profile and eligibility verification per event rules.
3. **Pilot Locality Selection (`P0-07`):**
   - Finalise selection of a specific geographic locality and 5–10 verifiable Fair Price Shops, or formally approve seeded fictional records (`Demo Shop 01`–`Demo Shop 05`, `isDemoData: true`) for initial phases.

---

## 3. Environment Issues

| Component | Detected State | Required State | Action Needed |
|---|---|---|---|
| Node.js | `v24.11.1` | Node.js 20+ / 22 compatible | Satisfied. |
| npm | `11.6.2` | npm 9+ | Satisfied. |
| Git | `2.52.0.windows.1` | Git 2.x | Satisfied. |
| AWS CLI | Not found in PATH | AWS CLI v2 installed & configured | Install AWS CLI v2 and add to PATH. |
| AWS SAM CLI | Not found in PATH | SAM CLI installed | Install AWS SAM CLI for infrastructure validation and deployment. |
| GitHub CLI (`gh`) | Not found in PATH | Optional / Recommended | Install or create repository directly via GitHub web UI. |

---

## 4. AWS Setup Requirements

Before any CloudFormation/SAM stack deployment:

1. **AWS Account & Service Access (`P0-05`):**
   - Confirm access to an active AWS account in region `ap-south-1`.
   - Verify IAM permissions for Lambda, API Gateway, DynamoDB, Cognito, IAM, and CloudWatch.
   - Confirm active credits / Free Tier coverage.
2. **AWS Credentials Configuration:**
   - Run `aws configure` to set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and default region `ap-south-1`.
3. **AWS Budget & Billing Alerts (`P0-06`):**
   - Create an AWS Budget alert with a conservative threshold (e.g., \$5 – \$10 USD) linked to team email/SNS before provisioning infrastructure.

---

## 5. Pilot Locality Status

- **Status:** Unconfirmed / Pending human input.
- **Current Assessment:** Real ration shop operational data cannot be invented.
- **Resolution Strategy:**
  - Proceed with Phase 0/1 setup using synthetic demo shop records (5 shops in `Demo Locality A`, marked with `isDemoData: true`).
  - Transition to real pilot data once the team provides verified public shop names, landmarks, and localities.

---

## 6. GitHub Repository Status

- **Status:** Local Git repository initialized; remote repository unconfigured.
- **Local State:** Repository initialized with `main` branch.
- **Action Required:**
  1. Create a remote GitHub repository named `rationready`.
  2. Add team collaborators.
  3. Add the remote: `git remote add origin <repo-url>`.
  4. Push `main` and `develop` branches.

---

## 7. Blockers and Resolutions Log

| Blocker ID | Description | Impact | Required Resolution | Status |
|---|---|---|---|---|
| `BLK-01` | AWS CLI and SAM CLI are not installed or not in PATH | Cannot verify AWS account, credits, or deploy SAM templates | User must install AWS CLI v2 and AWS SAM CLI on the development machine | Open |
| `BLK-02` | AWS credentials and budget alerts are unconfigured | Cannot proceed to Phase 6 deployment or verify cloud services | User must configure credentials (`aws configure`) and establish AWS Budget alert | Open |
| `BLK-03` | Team Leader and member Builder Center verifications pending | Required for official hackathon submission eligibility | Team members must complete Builder Center profiles and designate Leader | Open |
| `BLK-04` | GitHub remote repository not yet created | Team cannot share code, open PRs, or link AWS Amplify Hosting | Team Leader / Owner must create GitHub repository and configure `origin` | Open |
| `BLK-05` | Pilot locality and shops not yet selected | Cannot populate real shop directory | Adopt synthetic demo shops (`isDemoData: true`) until real locality is confirmed | Mitigated via Demo Data |
