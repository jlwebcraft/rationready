# RationReady — Decisions, Status, and Blockers Log

> **Project:** RationReady  
> **Event:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Last Updated:** 24 November 2026  
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
- **Team Leadership & Submission Ownership (`P0-03`):**
  - **Team Leader:** Project owner.
  - **GitHub Identity:** `@jlwebcraft`.
  - **Repository:** `https://github.com/jlwebcraft/rationready`.
  - **Responsibility:** Sole authorised person for submitting the official hackathon entry through the Techfest portal.
  - **Scope of Responsibility:** Includes coordinating all final deliverables (idea brief, build summary, AWS architecture, demo video, project links) and ensuring the official submission is completed before the deadline.
- **Local Development Authorization & Phase Sequencing (24 November 2026):**
  - **Scope:** The project owner has explicitly authorised beginning local-only Phase 1 development while Phase 0 administrative and AWS verification tasks remain pending.
  - **Non-Waiver Condition:** Phase 0 remains formally incomplete. Tasks `P0-04` (Builder Center verification), `P0-05` (AWS account verification), and `P0-06` (AWS budget protection) remain pending and are not waived.
  - **Strict Guardrail:** No AWS cloud resources may be provisioned and no cloud deployments may be attempted during local development. AWS account verification and budget alerts must be completed before any Phase 6 infrastructure deployment.
- **Git Workflow Transition to Main-Only Development (26 November 2026):**
  - **Authorization:** Authorized explicitly by the project owner (@jlwebcraft).
  - **Decision:** Transition the repository from the previous branching model (`develop` + `feature/*`) to a `main`-only development workflow.
  - **Branch Model & Operating Rules:** `main` is the sole active development branch and the GitHub default branch. All future development commits are created directly on `main` and pushed to `origin/main`. No new `develop`, `feature/*`, or `fix/*` branches or routine pull requests will be created for ongoing development. Historical branches (`develop`, `feature/*`) remain preserved for reference but receive no further commits.
  - **Attribution Objective:** Ensures all eligible project commits are directly recorded on the project owner's GitHub contributions graph while maintaining strict testing, validation, Conventional Commit messages, and documentation requirements.

---

## 2. Pending Decisions

The following decisions and confirmations require human / team intervention:

1. **Team Member Collaborator Invitations (`P0-01`):**
   - Confirm all team members have accepted invitations to the public GitHub repository (`https://github.com/jlwebcraft/rationready`).
2. **Participant Eligibility & Builder Center Verification (`P0-04`):**
   - Confirm student eligibility and verification status on AWS Builder Center profiles for all participating team members.
3. **AWS Account, Credits & Service Access Verification (`P0-05`):**
   - Confirm via the AWS Console that the account plan, available credit balance, required service access (Lambda, API Gateway, DynamoDB, Cognito, CloudWatch), and region selection (`ap-south-1`) are verified.
4. **AWS Budget & Billing Notifications Verification (`P0-06`):**
   - Confirm via the AWS Console that an AWS Budget exists, a threshold is configured, and email billing notifications are active.
5. **Geographic Pilot Locality Validation (`P0-07` Follow-Up):**
   - The initial prototype dataset (5 synthetic shops in `Demo Locality A`, `isDemoData: true`) has been formally approved by the project owner. On-the-ground selection and validation of real Fair Price Shops remains a future team activity.
6. **Full Team Agreement on Product Specifications (`P0-08`):**
   - Formal sign-off and consensus from all team members on the fixed user flows, roles, report fields, and freshness/aggregation rules defined in Sections 1 and 2 of the roadmap.

---

## 3. Environment Status

| Component         | Detected State     | Required State                    | Status / Action Needed                                                                                                           |
| ----------------- | ------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Node.js           | `v24.11.1`         | Node.js 20+ / 22 compatible       | Satisfied.                                                                                                                       |
| npm               | `11.6.2`           | npm 9+                            | Satisfied.                                                                                                                       |
| Git               | `2.52.0.windows.1` | Git 2.x                           | Satisfied.                                                                                                                       |
| AWS CLI           | Not found in PATH  | AWS CLI v2 installed & configured | Tooling requirement: Install AWS CLI v2 locally for local SAM builds and deployments (does not affect AWS Console verification). |
| AWS SAM CLI       | Not found in PATH  | SAM CLI installed                 | Tooling requirement: Install AWS SAM CLI for local template validation and deployment.                                           |
| GitHub CLI (`gh`) | Not found in PATH  | Optional                          | Optional convenience tool; repository can be created via GitHub web interface.                                                   |

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

- **Repository Web URL:** `https://github.com/jlwebcraft/rationready`
- **Remote Origin URL:** `https://github.com/jlwebcraft/rationready.git`
- **Repository Visibility:** Public
- **Initial Push Milestones:**
  - Initial `main` branch push commit: `e21125baf90609e767eb7052966f28af8f666eeb`
  - Initial `develop` branch push commit: `b3bbcd1688d4743a49d12ce988dc6cd52786218a`
- **Upstream Tracking:** Successfully configured for both `main` (`origin/main`) and `develop` (`origin/develop`).
- **GitHub Integration:** Successfully connected and synchronized with remote repository without history rewriting or force-pushing.
- **Dynamic Branch HEADs:** Active branch HEADs progress dynamically with ongoing development and must be inspected live via GitHub or `git ls-remote origin` rather than hardcoded in static documentation.
- **Pending Action (`P0-01`):** Team member collaborator invitations have been initiated / require acceptance confirmation on GitHub. `P0-01` remains unchecked until all team members have been added and confirmed.

---

## 6. Pilot Locality Status

- **Approval Status:** Approved by project owner (23 November 2026).
- **Approved Pilot Dataset:** 5 synthetic demonstration shops.
- **Demonstration Locality:** `Demo Locality A` (all five demonstration shops belong to this single demonstration locality).
- **Data Integrity & Safety Guardrails:**
  - All records must explicitly have `isDemoData: true`.
  - All records are visibly marked **DEMO DATA** in UI components and documentation.
  - No synthetic record may be represented as a real ration shop.
  - No fictional operational information (queue times, ePOS health, or commodity stock) may be represented as verified information.
  - Fictional demonstration descriptions are used instead of real addresses.
  - Coordinates, verified opening hours, real stock information, and government registration details are not invented.
- **Future Pilot Validation:** Actual geographic pilot locality selection and on-the-ground validation remain a planned future activity.

### Approved Initial Demonstration Shops

| Shop ID         | Shop Name    | Locality        | Description / Landmark (Fictional)                  | Data Status | `isDemoData` |
| --------------- | ------------ | --------------- | --------------------------------------------------- | ----------- | ------------ |
| `demo-shop-001` | Demo Shop 01 | Demo Locality A | Fictional Demonstration Facility 01, Sector Alpha   | DEMO DATA   | `true`       |
| `demo-shop-002` | Demo Shop 02 | Demo Locality A | Fictional Demonstration Facility 02, Sector Beta    | DEMO DATA   | `true`       |
| `demo-shop-003` | Demo Shop 03 | Demo Locality A | Fictional Demonstration Facility 03, Sector Gamma   | DEMO DATA   | `true`       |
| `demo-shop-004` | Demo Shop 04 | Demo Locality A | Fictional Demonstration Facility 04, Sector Delta   | DEMO DATA   | `true`       |
| `demo-shop-005` | Demo Shop 05 | Demo Locality A | Fictional Demonstration Facility 05, Sector Epsilon | DEMO DATA   | `true`       |

---

## 7. Blockers and Required Resolutions

| Blocker ID | Description                                                                                                                                      | Impact                                                                                                                                                                                                                                                                                                                                                                 | Required Resolution                                                                                                                                                                                                                                  | Status                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `BLK-01`   | AWS Console verification of account plan, credits, and services pending (`P0-05`)                                                                | Cannot verify AWS service accessibility or credit coverage                                                                                                                                                                                                                                                                                                             | Account owner must check AWS Console (Account Plan, Credits, Services, `ap-south-1`) and confirm completion                                                                                                                                          | Open                               |
| `BLK-02`   | AWS Budget and billing email notifications unverified (`P0-06`)                                                                                  | Lacks cost protection before resource provisioning                                                                                                                                                                                                                                                                                                                     | Account owner must create an AWS Budget with email alert in AWS Billing Console and confirm completion                                                                                                                                               | Open                               |
| `BLK-03`   | Participant eligibility and AWS Builder Center verification pending (`P0-04`)                                                                    | Affects official hackathon registration and submission eligibility                                                                                                                                                                                                                                                                                                     | Team members must complete AWS Builder Center profile verifications. (Team Leader designation resolved: Project owner @jlwebcraft confirmed as sole submitter per `P0-03`)                                                                           | Pending (Participant Verification) |
| `BLK-04`   | Full team agreement on product flows and rules pending (`P0-08`)                                                                                 | Prerequisite for Phase 0 completion                                                                                                                                                                                                                                                                                                                                    | All team members must review and agree to Sections 1 and 2 of the roadmap                                                                                                                                                                            | Open                               |
| `BLK-05`   | Team collaborator invitations pending confirmation (`P0-01`)                                                                                     | Team members need GitHub access for review and contributions                                                                                                                                                                                                                                                                                                           | Repository owner must invite all team members via GitHub and confirm acceptance                                                                                                                                                                      | Pending Confirmation               |
| `BLK-06`   | Pilot dataset for initial prototype (`P0-07`)                                                                                                    | Initial shop directory required seed data                                                                                                                                                                                                                                                                                                                              | Initial prototype synthetic dataset (5 shops in `Demo Locality A`, `isDemoData: true`) is approved. Actual geographic pilot validation remains pending as a future activity                                                                          | Resolved (Synthetic Data Approved) |
| `BLK-07`   | AWS CLI v2 and AWS SAM CLI not installed in PATH                                                                                                 | Prevents local SAM build/deploy commands during Phase 1/Phase 6                                                                                                                                                                                                                                                                                                        | Install AWS CLI v2 and AWS SAM CLI on the local machine (tooling requirement)                                                                                                                                                                        | Open                               |
| `BLK-08`   | Acceptance criterion conflict: multiple-commodity test criterion vs approved single-commodity pilot scope (`ALLOWED_COMMODITY_CODES = ['RICE']`) | Acceptance criterion `P3-13` explicitly mentions testing multiple commodities. However, the approved pilot configuration strictly restricts commodities to `RICE`. Non-pilot commodities are rejected by validation as required, but multi-commodity aggregation tests cannot be demonstrated on the live domain model without violating the RICE-only pilot boundary. | Project owner / team review to decide whether to formally amend acceptance criterion `P3-13` to reflect the single-commodity pilot scope or address multiple commodities in a future phase. `P3-13` is temporarily reverted to `[ ]` until resolved. | Open (`P3-13` reverted to pending) |
