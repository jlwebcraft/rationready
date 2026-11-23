# RationReady — Decisions, Status, and Blockers Log

> **Project:** RationReady  
> **Event:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Last Updated:** 23 November 2026  
> **Single Source of Truth:** `RATIONREADY_ROADMAP.md` (v1.0)

---

## 1. Confirmed Decisions

The following architectural and technical decisions are defined and locked per `RATIONREADY_ROADMAP.md` Sections 1 and 2:

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

## 2. Pending Decisions

The following decisions and confirmations require human / team intervention:

1. **Team Member Collaborator Invitations (`P0-01`):**
   - Confirm all team members have accepted invitations to the public GitHub repository (`https://github.com/jlwebcraft/rationready`).
2. **Designation of Team Leader (`P0-03`):**
   - Confirm the designated Team Leader who holds sole responsibility for submitting deliverables through the official Techfest portal.
3. **Participant Eligibility & Builder Center Verification (`P0-04`):**
   - Confirm student eligibility and verification status on AWS Builder Center profiles for all participating team members.
4. **AWS Account, Credits & Service Access Verification (`P0-05`):**
   - Confirm via the AWS Console that the account plan, available credit balance, required service access (Lambda, API Gateway, DynamoDB, Cognito, CloudWatch), and region selection (`ap-south-1`) are verified.
5. **AWS Budget & Billing Notifications Verification (`P0-06`):**
   - Confirm via the AWS Console that an AWS Budget exists, a threshold is configured, and email billing notifications are active.
6. **Pilot Locality & Shop Dataset Selection (`P0-07`):**
   - Select a specific geographic locality and 5–10 verifiable Fair Price Shops, or approve the adoption of synthetic demo shops (`Demo Shop 01`–`Demo Shop 05`, `isDemoData: true`) for initial development.
7. **Full Team Agreement on Product Specifications (`P0-08`):**
   - Formal sign-off and consensus from all team members on the fixed user flows, roles, report fields, and freshness/aggregation rules defined in Sections 1 and 2 of the roadmap.

---

## 3. Environment Status

| Component | Detected State | Required State | Status / Action Needed |
|---|---|---|---|
| Node.js | `v24.11.1` | Node.js 20+ / 22 compatible | Satisfied. |
| npm | `11.6.2` | npm 9+ | Satisfied. |
| Git | `2.52.0.windows.1` | Git 2.x | Satisfied. |
| AWS CLI | Not found in PATH | AWS CLI v2 installed & configured | Tooling requirement: Install AWS CLI v2 locally for local SAM builds and deployments (does not affect AWS Console verification). |
| AWS SAM CLI | Not found in PATH | SAM CLI installed | Tooling requirement: Install AWS SAM CLI for local template validation and deployment. |
| GitHub CLI (`gh`) | Not found in PATH | Optional | Optional convenience tool; repository can be created via GitHub web interface. |

---

## 4. AWS Requirements

AWS setup is divided into Console verifications (immediate Phase 0 requirements) and local deployment tooling (Phase 1 / Phase 6 requirements):

### 4.1 AWS Console Verifications (`P0-05` & `P0-06`)
These tasks must be verified directly through the AWS Console by the account owner before provisioning resources:
- **`P0-05` Account Verification:**
  - Active AWS account plan.
  - Available AWS credits or Free Tier status.
  - Verified access to required AWS services: Lambda, API Gateway HTTP API, DynamoDB, Amazon Cognito, and Amazon CloudWatch.
  - Active region set to Asia Pacific (Mumbai) `ap-south-1`.
- **`P0-06` Budget Protection:**
  - AWS Budget created in AWS Billing Console.
  - Budget threshold configured (recommended: \$5 – \$10 USD).
  - Billing alert email notifications configured and active.

### 4.2 Local AWS Tooling & Deployment Setup
- Install AWS CLI v2 and AWS SAM CLI on the development workstation.
- Configure local developer profile via `aws configure` targeting `ap-south-1` (needed when building and deploying backend stacks in Phase 6).

---

## 5. GitHub Status

- **Remote Origin URL:** `https://github.com/jlwebcraft/rationready.git`
- **Repository Web URL:** `https://github.com/jlwebcraft/rationready`
- **Repository Visibility:** Public
- **Pushed Remote Branches:**
  - `main`: `e21125baf90609e767eb7052966f28af8f666eeb` (tracked by local `main`)
  - `develop`: `b3bbcd1688d4743a49d12ce988dc6cd52786218a` (tracked by local `develop`)
- **Upstream Tracking:** Successfully set up for both `main` and `develop`.
- **Integration Status:** Successful. Remote repository connection and initial pushes completed without history rewrite or force-pushing.
- **Pending Action (`P0-01`):** Team member collaborator invitations have been initiated / require acceptance confirmation on GitHub. `P0-01` remains unchecked until all team members have been added and confirmed.

---

## 6. Pilot Locality Status

- **Status:** Pending team decision (`P0-07`).
- **Current Assessment:** Real Fair Price Shop operational data cannot be invented or assumed.
- **Resolution Strategy:**
  - Seed initial development and tests with 5–10 clearly marked synthetic demo shop records (e.g., `Demo Shop 01`, `locality: "Demo Locality A"`, `isDemoData: true`).
  - Replace or augment with verified real shops once the team completes on-the-ground verification in the selected pilot locality.

---

## 7. Blockers and Required Resolutions

| Blocker ID | Description | Impact | Required Resolution | Status |
|---|---|---|---|---|
| `BLK-01` | AWS Console verification of account plan, credits, and services pending (`P0-05`) | Cannot verify AWS service accessibility or credit coverage | Account owner must check AWS Console (Account Plan, Credits, Services, `ap-south-1`) and confirm completion | Open |
| `BLK-02` | AWS Budget and billing email notifications unverified (`P0-06`) | Lacks cost protection before resource provisioning | Account owner must create an AWS Budget with email alert in AWS Billing Console and confirm completion | Open |
| `BLK-03` | Team Leader designation and participant Builder Center verification pending (`P0-03`, `P0-04`) | Affects official hackathon registration and submission eligibility | Team members must complete AWS Builder Center profile verifications and confirm Team Leader | Open |
| `BLK-04` | Full team agreement on product flows and rules pending (`P0-08`) | Prerequisite for Phase 0 completion | All team members must review and agree to Sections 1 and 2 of the roadmap | Open |
| `BLK-05` | Team collaborator invitations pending confirmation (`P0-01`) | Team members need GitHub access for review and contributions | Repository owner must invite all team members via GitHub and confirm acceptance | Pending Confirmation |
| `BLK-06` | Pilot locality and shop dataset unselected (`P0-07`) | Real shop directory cannot be populated | Team must select locality or formally approve synthetic demo dataset (`isDemoData: true`) | Mitigated via Demo Data |
| `BLK-07` | AWS CLI v2 and AWS SAM CLI not installed in PATH | Prevents local SAM build/deploy commands during Phase 1/Phase 6 | Install AWS CLI v2 and AWS SAM CLI on the local machine (tooling requirement) | Open |
