# RationReady — Fixed Hackathon Execution Roadmap

> **Product line:** Know before you go.  
> **Competition:** Techfest 2026–27 — Campus to Cloud Hackathon sponsored by AWS  
> **Roadmap version:** 1.0 — frozen on 23 November 2026  
> **Round 1 submission deadline:** 30 November 2026, 11:59 PM IST  
> **Final Demo Day:** 17 December 2026  
> **Status:** This is the single source of truth for the project scope and execution plan.

---

## 0. Instructions for Antigravity / coding agents

This file is the **approved, fixed project roadmap**. Follow it as written.

1. Do not redesign, rewrite, reorder, expand, remove, or silently reinterpret the roadmap, feature scope, technology stack, acceptance criteria, dates, or data rules.
2. Work through the phases in order. A task may be marked `[x]` only after the work is implemented and verified against its acceptance criteria. A partially implemented task stays `[ ]`.
3. After completing and verifying a checklist item, change only that item's checkbox from `[ ]` to `[x]`. Do not mark tasks complete based on generated code, a successful build alone, or an untested visual mock-up.
4. Do not mark a parent phase complete until all its required child tasks are complete and its acceptance criteria pass.
5. Do not add features, AWS services, dependencies, tables, API endpoints, routes, or new phases unless the project owner explicitly authorises the change. Suggestions may be written in `docs/decisions-and-blockers.md`; they must not alter this roadmap.
6. If a requirement is blocked, leave its checkbox unchecked and record: the blocker, evidence, impact, and smallest possible resolution in `docs/decisions-and-blockers.md`. Continue with independent tasks where possible.
7. Keep the application deployable. Before changing shared code, inspect the current Git status and branch. Never overwrite another contributor's uncommitted work.
8. Never commit credentials, access keys, passwords, real beneficiary information, ration-card numbers, Aadhaar numbers, or other sensitive personal information.
9. Use only synthetic/demo beneficiary accounts and clearly labelled demo records unless the project team has permission and verified public information for a real pilot.
10. At the end of each work session, report: completed checklist IDs, files changed, tests run and results, current Git branch/commit, deployment status, and blockers.

**Roadmap change control:** This plan remains frozen for the hackathon. A coding agent must not change it on its own. Only the project owner can explicitly authorise a roadmap change.

---

# 1. Product definition — do not change the MVP

## 1.1 The problem

Beneficiaries may travel to a Fair Price Shop (ration shop) without knowing whether it is crowded, whether its electronic Point of Sale (ePOS) device is working, or whether the required commodities were recently reported as available. An unsuccessful visit costs time and travel effort, especially for people with limited mobility, daily-wage workers, and people travelling from nearby villages or neighbourhoods.

## 1.2 The solution

**RationReady** is a community-powered Public Distribution System (PDS) visit assistant. It lets a beneficiary check recent, time-stamped reports about a selected Fair Price Shop before travelling there.

The product helps answer four practical questions:

1. Where is the shop and when was its information last updated?
2. What is the current reported queue/waiting time?
3. Is the ePOS device currently reported as working?
4. What is the latest reported availability of listed commodities?

Users can submit reports after visiting a shop. Authorised shop representatives can submit clearly labelled shop-side updates. RationReady displays the age, source, number of independent reports, and confidence of the information.

**Positioning:** RationReady is an information and visit-planning assistant. It is not a government portal, does not issue ration, does not determine entitlement, and does not replace official PDS/ePOS records.

## 1.3 Pilot boundary

- Launch with **one selected locality and 5–10 shops**.
- Use verified shop names and public location information only where the team can check them.
- Where real shop information cannot be verified in time, use fictional records such as `Demo Shop 01`, visibly marked **DEMO DATA**. Do not invent live stock or queue information for real shops.
- The first version is locality-based. It does not attempt nationwide discovery, turn-by-turn navigation, or government-system integration.
- The public prototype must always distinguish live user reports from seeded demonstration records.

## 1.4 Fixed user roles

| Role | Permissions |
|---|---|
| Visitor | Browse the shop directory and view currently valid aggregated reports. |
| Beneficiary | Visitor permissions, plus submit queue, ePOS, and commodity reports after sign-in. |
| Shop manager | Beneficiary permissions, plus submit updates for the shop assigned to that account and view recent reports for that shop. |
| Administrator | Seed/manage shop records and assign shop-manager accounts. Administrative account creation is handled outside the public sign-up flow. |

A person must never be able to grant themselves the `SHOP_MANAGER` or `ADMIN` role through the frontend.

## 1.5 Fixed MVP features

- Locality-filtered shop directory.
- Shop detail page with address/landmark, opening-hours field (only if verified), and last-updated time.
- Queue report and estimated waiting time.
- ePOS operational-status report.
- Commodity availability report for a fixed list configured for the pilot.
- Time-aware report expiry and visible freshness labels.
- Confidence/reliability indicator based on independent reporters.
- Beneficiary sign-up/sign-in.
- Restricted shop-manager dashboard for the manager's assigned shop.
- Responsive, accessible interface suitable for a low-end Android phone and slow mobile connection.
- Publicly accessible AWS-hosted prototype, repository, documentation, and a demo video under three minutes.

## 1.6 Explicitly out of scope for this hackathon

Do not implement these in the Round 1 MVP:

- Direct integration with state or central government PDS systems, ePOS devices, Aadhaar, or ration-card databases.
- Aadhaar/ration-card collection, entitlement checks, beneficiary identity verification, or storage of sensitive personal data.
- SMS/WhatsApp notifications, paid maps APIs, live GPS tracking, or turn-by-turn navigation.
- AI/ML prediction, chatbots, generative AI, or complex forecasting.
- Payment, grievance escalation, complaint filing, or a government officer portal.
- Photograph uploads, public comments, chat, social feeds, or gamification.
- Nationwide shop coverage or multi-state policy rules.

These exclusions protect the deadline and reduce privacy, integration, and reliability risks.

---

# 2. Fixed technical decisions

## 2.1 Technology stack

| Layer | Fixed choice | Reason |
|---|---|---|
| Frontend | React + Vite + TypeScript | Lightweight static frontend; avoids unnecessary server-rendering complexity. |
| Styling | Tailwind CSS | Fast, consistent responsive UI. |
| Frontend hosting | AWS Amplify Hosting | Git-connected hosting for the static web application. |
| Backend | TypeScript on AWS Lambda, Node.js 22 runtime | Serverless API with a familiar JavaScript/TypeScript stack. |
| API | Amazon API Gateway HTTP API | HTTPS endpoints and Cognito JWT authorisation. |
| Database | Amazon DynamoDB, on-demand capacity | Managed storage for shops and time-stamped reports. |
| Authentication | Amazon Cognito User Pool | Beneficiary accounts and controlled manager accounts. |
| Monitoring | Amazon CloudWatch | Lambda logs, errors, and operational checks. |
| Infrastructure | AWS SAM / CloudFormation | Repeatable infrastructure deployment from version-controlled templates. |
| Tests | Vitest for unit tests; browser/manual smoke tests for critical flows | Fast verification of report rules and user journeys. |
| Source control | Git + GitHub | Branching, review, history, tags, and rollback. |

Use AWS Region **Asia Pacific (Mumbai), `ap-south-1`**, unless a required service is unavailable there. If a service forces a different region, record that fact in the build summary before deployment.

## 2.2 Fixed AWS architecture

```text
Beneficiary / Shop Manager
          |
          v
React + Vite web application
          |
          +----------------------> Amazon Cognito User Pool
          |                         (sign-up / sign-in / roles)
          |
          v
Amazon API Gateway HTTP API
          |
          v
AWS Lambda (TypeScript, Node.js 22)
          |
          +----------------------> DynamoDB: Shops
          |
          +----------------------> DynamoDB: Reports
          |
          v
Amazon CloudWatch (logs and errors)

Web application hosting: AWS Amplify Hosting
Infrastructure deployment: AWS SAM / CloudFormation
```

Do not add S3, SNS, SQS, Bedrock, EC2, RDS, maps services, or any other AWS service to the MVP.

## 2.3 Fixed data model

Use UTC timestamps throughout. `createdAt` is an ISO-8601 UTC string; `expiresAt` is a Unix epoch timestamp in **seconds** so it can be used for DynamoDB TTL. The time portion of `reportKey` must be lexicographically sortable (ISO-8601 UTC is suitable).

### `Shops` table

- Partition key: `shopId` (string).
- Required attributes: `name`, `locality`, `addressOrLandmark`, `latitude` (optional), `longitude` (optional), `openingHours` (optional and verified only), `isDemoData`, `createdAt`, `updatedAt`.
- Store only information needed to identify and find the shop.

### `Reports` table

- Partition key: `shopId` (string).
- Sort key: `reportKey` (string), formed from report creation time and a unique report ID so recent reports can be queried in order.
- Required attributes: `reportId`, `reportType`, `createdAt`, `expiresAt`, `reporterSub`, `reporterRole`, `payload`, `isDemoData`.
- `reportType` is one of `QUEUE`, `EPOS`, or `STOCK`.
- `reporterSub` is the Cognito subject identifier; do not store the user's email or phone number in each report.
- Configure DynamoDB TTL on `expiresAt` as storage cleanup, but **the API must also filter expired reports itself**. TTL deletion is asynchronous and must not be treated as the freshness check.

## 2.4 Fixed report payloads and expiry rules

| Report type | Payload | Validity window |
|---|---|---:|
| Queue | `waitMinutes` as an integer from 0 to 180 | 2 hours |
| ePOS | `WORKING` or `NOT_WORKING` | 4 hours |
| Stock | `commodityCode` and `availability` (`AVAILABLE`, `LIMITED`, `UNAVAILABLE`) | 24 hours |

- `UNKNOWN` is a display state when there are no valid reports; it is not a user-submitted value.
- The backend calculates `createdAt` and `expiresAt`. Never trust a browser-supplied timestamp or expiry.
- Expired reports remain in history only if retained by the database; they must never contribute to the current status.
- Show the exact age/last-reported time beside every current status.

## 2.5 Fixed aggregation and trust rules

All aggregation happens on the backend. The frontend must not invent or calculate authoritative shop status.

1. Ignore reports where `expiresAt <= current server time`.
2. Count at most one active report per distinct Cognito user for each shop/report type/commodity when calculating current confidence. Repeated submissions by the same person must not inflate confidence.
3. Queue estimate: calculate the median `waitMinutes` from valid reports and round to the nearest five minutes. Show the number of distinct reporters and the age of the newest report.
4. ePOS status: use the majority of valid `WORKING`/`NOT_WORKING` reports. If the result is tied, show `MIXED REPORTS` rather than choosing a side.
5. Stock status: aggregate separately for each commodity using the majority of valid `AVAILABLE`/`LIMITED`/`UNAVAILABLE` reports. If there is no majority, show `MIXED REPORTS`.
6. Confidence labels use these fixed rules:
   - Queue: one distinct reporter = `LOW`; two = `MEDIUM` when their wait estimates are within 15 minutes, otherwise `MIXED`; three or more = `HIGH` when the full range is within 15 minutes, `MEDIUM` when the range is 16–30 minutes, and `MIXED` when it exceeds 30 minutes.
   - ePOS/stock: one distinct reporter = `LOW`; two agreeing reporters = `MEDIUM`; three or more = `HIGH` when at least 75% agree, `MEDIUM` when a strict majority agrees but is below 75%, and `MIXED` when there is no strict majority or the result is tied.
   - Always show the distinct reporter count. `MIXED` means reports are inconsistent; do not present it as a verified status.
7. Display a source label: `Community report` or `Shop manager update`. Do not imply that a shop-manager update is verified by a government system.
8. A report is information supplied by its reporter, not proof of official stock or ePOS state. Display this notice in the UI and documentation.

## 2.6 Fixed security and privacy rules

- Public users can read shop listings and aggregated current status.
- A signed-in beneficiary can submit reports.
- A shop manager can submit updates only for the shop assigned to that account.
- Only an administrator can create/modify shop records or assign manager accounts.
- Enforce permissions in the backend; hiding a button is not authorisation.
- Validate all request bodies, enum values, IDs, and numeric ranges on the backend.
- Add basic per-user report throttling and reject duplicate rapid submissions for the same shop/type.
- Never accept a role or `reporterSub` from an untrusted request body; derive identity and roles from validated Cognito claims.
- Do not collect Aadhaar, ration-card number, household details, caste, income, entitlement amount, or phone number for the MVP.
- Keep secrets in AWS-managed configuration or local environment variables. Commit only `.env.example` with placeholder values.
- Enable a budget alert and inspect AWS billing/credits before deployment. Do not assume every service or usage level is free.

---

# 3. Fixed repository and directory structure

Create the repository with this structure. Keep modules small and feature-oriented; do not place the whole application in one file.

```text
rationready/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   └── src/
│   │       ├── app/                 # route/page composition
│   │       ├── components/          # shared UI components
│   │       ├── features/
│   │       │   ├── shops/
│   │       │   ├── queue/
│   │       │   ├── epos/
│   │       │   ├── stock/
│   │       │   ├── auth/
│   │       │   └── manager/
│   │       ├── lib/                 # API client, auth client, helpers
│   │       ├── hooks/
│   │       ├── types/
│   │       └── styles/
│   └── api/
│       ├── src/
│       │   ├── handlers/            # Lambda entry point / route handlers
│       │   ├── services/            # aggregation and business rules
│       │   ├── repositories/        # DynamoDB access
│       │   ├── validators/          # request validation
│       │   ├── middleware/          # auth and role checks
│       │   ├── domain/              # domain types and enums
│       │   └── utils/
│       └── tests/
├── infrastructure/
│   └── sam/
│       ├── template.yaml
│       └── samconfig.toml.example
├── scripts/
│   ├── seed-demo-data.ts
│   └── smoke-test.ts
├── docs/
│   ├── idea-brief.md
│   ├── architecture.md
│   ├── api-contract.md
│   ├── build-summary.md
│   ├── test-report.md
│   ├── demo-script.md
│   └── decisions-and-blockers.md
├── .github/
│   └── workflows/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── RATIONREADY_ROADMAP.md
```

---

# 4. Fixed implementation roadmap and checklist

Dates are in IST. This is a deadline-led plan. Required MVP work takes priority over visual extras.

## Phase 0 — Project control and preparation
**23 November 2026**

- [ ] `P0-01` Create the GitHub repository named `rationready` (or confirm the agreed repository name) and add all team members.
- [x] `P0-02` Add this exact roadmap file to the repository root as `RATIONREADY_ROADMAP.md`.
- [x] `P0-03` Confirm the Team Leader and ensure only the Team Leader will submit the official entry.
- [ ] `P0-04` Confirm participant eligibility and each participant's AWS Builder Center profile/student verification status as required by the event instructions.
- [ ] `P0-05` Confirm the AWS account plan, available credits, and access to the selected services.
- [ ] `P0-06` Create an AWS budget alert and billing notifications before provisioning resources.
- [x] `P0-07` Select one pilot locality and prepare a list of 5–10 shops; mark unverified entries as demo data.
- [ ] `P0-08` Agree the fixed user flows, roles, report fields, and freshness/aggregation rules in Sections 1 and 2.
- [x] `P0-09` Create `docs/decisions-and-blockers.md` and record initial decisions, owners, and blockers.

**Phase 0 exit criteria:** Repository exists, team responsibilities are clear, AWS access/budget protection is checked, and pilot data is either verified or visibly marked as demo data.

## Phase 1 — Foundation and application shell
**24 November 2026**

- [x] `P1-01` Create the monorepo folders exactly as specified in Section 3.
- [x] `P1-02` Set up the root package scripts/workspaces and pin compatible dependency versions.
- [x] `P1-03` Initialise the React + Vite + TypeScript frontend in `apps/web`.
- [x] `P1-04` Configure Tailwind CSS and a small, consistent design system.
- [x] `P1-05` Initialise the TypeScript Lambda backend in `apps/api` for Node.js 22.
- [x] `P1-06` Add formatting, linting, type-check, and test scripts.
- [x] `P1-07` Configure `.gitignore` for dependencies, build output, local environment files, coverage, and AWS local files.
- [x] `P1-08` Create `.env.example` with variable names and placeholder values only.
- [x] `P1-09` Create the initial README with project purpose, stack, local setup, and security warning.
- [x] `P1-10` Create the initial `infrastructure/sam/template.yaml` with the application stack skeleton.
- [x] `P1-11` Build the shared application shell: header, navigation, footer, loading state, empty state, and error state.
- [x] `P1-12` Commit the working foundation and create Git tag `v0.1-foundation`.

**Phase 1 exit criteria:** Frontend starts locally, backend type-checks, repository structure is correct, no secrets are tracked, and the foundation commit/tag exists.

## Phase 2 — Shop directory and data layer
**25 November 2026**

- [ ] `P2-01` Define and document the `Shops` and `Reports` DynamoDB key schemas.
- [ ] `P2-02` Define shared TypeScript domain types and enums for shops, roles, and report payloads.
- [ ] `P2-03` Implement the DynamoDB repository functions for shop reads and report writes/queries.
- [ ] `P2-04` Create the public API endpoint to list shops by locality.
- [ ] `P2-05` Create the public API endpoint to retrieve one shop by `shopId`.
- [ ] `P2-06` Add backend validation and consistent API response/error formats.
- [ ] `P2-07` Create the demo-data seed script for 5–10 clearly labelled demo shops and initial demo reports.
- [ ] `P2-08` Build the frontend shop directory with locality filter and clear demo-data badges.
- [ ] `P2-09` Build the shop detail page with location/landmark, opening-hours field where verified, and last-updated information.
- [ ] `P2-10` Add responsive loading, empty, and API-error states to the directory and detail page.
- [ ] `P2-11` Add unit tests for shop validation, repository mapping, and directory filtering.
- [ ] `P2-12` Commit the working shop directory and create Git tag `v0.2-shop-directory`.

**Phase 2 exit criteria:** A user can browse the pilot shop directory, open a shop detail page, and see whether data is demo or verified. Shop APIs and tests pass.

## Phase 3 — Reporting, freshness, and trust engine
**26 November 2026**

- [ ] `P3-01` Implement backend validation for queue reports (`waitMinutes` 0–180).
- [ ] `P3-02` Implement backend validation for ePOS reports (`WORKING` / `NOT_WORKING`).
- [ ] `P3-03` Implement backend validation for stock reports and configured pilot commodities.
- [ ] `P3-04` Calculate `createdAt` and `expiresAt` on the server using the fixed 2-hour, 4-hour, and 24-hour rules.
- [ ] `P3-05` Implement per-user duplicate/throttle protection for rapid repeated reports.
- [ ] `P3-06` Implement the queue median calculation and five-minute rounding rule.
- [ ] `P3-07` Implement ePOS majority/tie handling.
- [ ] `P3-08` Implement per-commodity stock majority/tie handling.
- [ ] `P3-09` Implement independent-reporter counting and LOW/MEDIUM/HIGH/MIXED confidence labels.
- [ ] `P3-10` Ensure expired reports are excluded by backend logic even before DynamoDB TTL removes them.
- [ ] `P3-11` Create the protected `POST /shops/{shopId}/reports` API endpoint.
- [ ] `P3-12` Create the public `GET /shops/{shopId}/status` API endpoint for aggregated current information.
- [ ] `P3-13` Add unit tests for expiry boundaries, medians, ties, multiple commodities, duplicate reporters, and confidence labels.
- [ ] `P3-14` Document the API request/response contract in `docs/api-contract.md`.
- [ ] `P3-15` Commit and create Git tag `v0.3-reporting-engine` after tests pass.

**Phase 3 exit criteria:** Queue, ePOS, and stock reports can be submitted and aggregated. Stale information is not displayed as current. Every displayed status includes freshness and reporter-count information.

## Phase 4 — Beneficiary experience
**27 November 2026**

- [ ] `P4-01` Build the shop status summary on the shop detail page.
- [ ] `P4-02` Display queue estimate, ePOS status, and per-commodity stock status.
- [ ] `P4-03` Display newest report time, age, source, distinct reporter count, and confidence label.
- [ ] `P4-04` Display `UNKNOWN` when there are no valid reports and `MIXED REPORTS` when reports disagree.
- [ ] `P4-05` Build the queue-report form with client-side guidance and backend validation errors.
- [ ] `P4-06` Build the ePOS-report form.
- [ ] `P4-07` Build the commodity-report form.
- [ ] `P4-08` Add clear success, duplicate/throttle, validation, and network-error feedback.
- [ ] `P4-09` Add the information disclaimer explaining that reports are community/shop-submitted and not official government data.
- [ ] `P4-10` Test the complete browse → shop detail → submit report → updated status flow on desktop and a mobile viewport.
- [ ] `P4-11` Commit and create Git tag `v0.4-beneficiary-flow` after the flow works end to end.

**Phase 4 exit criteria:** A beneficiary can find a shop, understand the freshness/reliability of its reports, and submit each of the three report types.

## Phase 5 — Authentication and shop-manager tools
**28 November 2026**

- [ ] `P5-01` Create the Cognito User Pool and app client through the SAM/CloudFormation template.
- [ ] `P5-02` Configure email/password authentication; do not add SMS OTP to the MVP.
- [ ] `P5-03` Configure the `SHOP_MANAGER` and `ADMIN` groups; ordinary sign-ups must not self-assign either role.
- [ ] `P5-04` Configure API Gateway JWT authorisation using the Cognito User Pool issuer and app-client audience.
- [ ] `P5-05` Implement frontend sign-up, sign-in, sign-out, and session handling.
- [ ] `P5-06` Derive user identity and role from validated JWT claims in the backend; ignore client-supplied identity/role fields.
- [ ] `P5-07` Implement manager-to-shop assignment and enforce it for manager actions.
- [ ] `P5-08` Build a minimal shop-manager dashboard showing the assigned shop and its recent reports.
- [ ] `P5-09` Allow a shop manager to submit the same queue/ePOS/stock update types, labelled `Shop manager update`.
- [ ] `P5-10` Create manager test accounts through an administrator-controlled process; do not expose manager-role selection in public registration.
- [ ] `P5-11` Test unauthenticated report rejection, beneficiary permissions, manager shop isolation, and administrator-only shop management.
- [ ] `P5-12` Commit and create Git tag `v0.5-auth-manager` after permission tests pass.

**Phase 5 exit criteria:** Public browsing works, beneficiaries must sign in to report, shop managers can update only their assigned shop, and users cannot grant themselves privileged roles.

## Phase 6 — AWS deployment and integration
**29 November 2026**

- [ ] `P6-01` Complete the SAM template for Lambda, API Gateway HTTP API, Cognito, DynamoDB tables, IAM permissions, and outputs.
- [ ] `P6-02` Deploy the backend stack in `ap-south-1` (or document the required exception).
- [ ] `P6-03` Configure DynamoDB TTL on the Reports table and retain server-side expiry filtering.
- [ ] `P6-04` Configure the frontend production environment variables without committing secrets.
- [ ] `P6-05` Connect the GitHub repository to AWS Amplify Hosting and deploy the frontend.
- [ ] `P6-06` Configure CORS for the production frontend origin only.
- [ ] `P6-07` Seed the pilot shop data and clearly labelled demo reports.
- [ ] `P6-08` Verify the deployed shop list, shop detail, status, sign-in, report submission, and manager workflows against the live AWS API.
- [ ] `P6-09` Inspect CloudWatch logs and resolve all blocking runtime errors.
- [ ] `P6-10` Confirm the public prototype URL works from an incognito browser and a mobile device/network.
- [ ] `P6-11` Re-check AWS budget, credit balance, active resources, and region.
- [ ] `P6-12` Create deployment notes in `docs/architecture.md` and record resource names/regions (never credentials).
- [ ] `P6-13` Create Git tag `v0.9-deployed-prototype` after the live smoke test passes.

**Phase 6 exit criteria:** A live public URL works, backend data operations are on AWS, authentication/permissions work, and the deployed system has no known blocker.

## Phase 7 — Quality, evidence, and Round 1 submission
**30 November 2026**

- [ ] `P7-01` Run the complete frontend lint, type-check, and production build.
- [ ] `P7-02` Run the complete backend unit-test suite.
- [ ] `P7-03` Run the live end-to-end smoke test for all MVP user journeys.
- [ ] `P7-04` Test stale queue/ePOS/stock reports and confirm they display as unknown rather than current.
- [ ] `P7-05` Test ties/disagreement and confirm `MIXED REPORTS` is shown.
- [ ] `P7-06` Test that a manager cannot update another shop.
- [ ] `P7-07` Review mobile layout, form labels, keyboard focus, contrast, and error messages.
- [ ] `P7-08` Confirm the app contains no real personal data or misleading live-status claims.
- [ ] `P7-09` Complete `docs/idea-brief.md` (problem, target users, solution, pilot boundary, impact hypothesis).
- [ ] `P7-10` Complete `docs/build-summary.md` (implementation, AWS services used, and why each is used).
- [ ] `P7-11` Complete `docs/test-report.md` with actual test commands/results and known limitations.
- [ ] `P7-12` Complete the root README with setup instructions, architecture, API overview, demo credentials policy, and live URL.
- [ ] `P7-13` Prepare a demo script and record a video **under 3 minutes** showing problem, target users, working flow, impact, and AWS implementation.
- [ ] `P7-14` Create the Google Drive submission folder with the idea brief, build summary, live prototype URL, public repository link, and demo video.
- [ ] `P7-15` Verify registration/Builder Center alias details and the Team Leader's submission access.
- [ ] `P7-16` Freeze the submission build; create Git tag `v1.0-round1-submission` and record the deployed commit hash.
- [ ] `P7-17` Team Leader submits the Google Drive folder link through the official Techfest submission field before 11:59 PM IST.
- [ ] `P7-18` Save a screenshot/confirmation of the successful submission and the exact submitted links.

**Phase 7 exit criteria:** All required deliverables are submitted together, the live application remains accessible, and the submitted build is tagged and reproducible.

---

# 5. Post-submission plan — only after Round 1 is submitted

Do not delay Round 1 submission to work on these tasks. Do not add new product features during this track; focus on evidence, reliability, and presentation.

## Phase 8 — Pilot validation and reliability improvements
**1–5 December 2026**

The Round 1 result announcement is expected by 5 December 2026, according to the event brief.

- [ ] `P8-01` Review the Round 1 submission and preserve the exact `v1.0-round1-submission` code/tag.
- [ ] `P8-02` Collect feedback from a small number of beneficiaries, shop visitors, or relevant campus/community representatives where access is available.
- [ ] `P8-03` Record feedback without collecting ration-card numbers, Aadhaar, or unnecessary personal details.
- [ ] `P8-04` Correct reproducible bugs in a new branch and add regression tests.
- [ ] `P8-05` Improve the accuracy/clarity of timestamps, report sources, and confidence explanations based on observed confusion.
- [ ] `P8-06` Update documentation with actual pilot limitations and feedback; do not invent impact metrics.
- [ ] `P8-07` Deploy the tested fixes and create Git tag `v1.1-reliability`.

## Phase 9 — Finalist preparation and evidence
**6–12 December 2026**

- [ ] `P9-01` Prepare one deterministic demo dataset that clearly identifies demo records.
- [ ] `P9-02` Verify the live prototype from a clean browser session and a mobile device.
- [ ] `P9-03` Prepare a one-page AWS architecture explanation and justify every AWS service used.
- [ ] `P9-04` Prepare concise answers about report freshness, duplicate reporting, conflicts, privacy, access control, cost, and scaling.
- [ ] `P9-05` Prepare honest impact evidence: pilot scope, actual feedback, tests, and measured observations only.
- [ ] `P9-06` Check the Techfest portal and registered email for finalist instructions or rule changes.
- [ ] `P9-07` Create Git tag `v1.2-finalist-ready` after the demo environment passes its checks.

## Phase 10 — Final demo rehearsal and release freeze
**13–16 December 2026**

- [ ] `P10-01` Freeze feature development; accept only critical bug fixes.
- [ ] `P10-02` Rehearse the three-minute demo with a visible timer.
- [ ] `P10-03` Rehearse the two-minute Q&A with every team member.
- [ ] `P10-04` Prepare a recorded backup demo and screenshots in case venue connectivity fails.
- [ ] `P10-05` Confirm the live URL, demo accounts, seed data, API, and AWS services are operational.
- [ ] `P10-06` Record the final deployed commit hash and create Git tag `v1.3-demo-freeze`.

## Phase 11 — Techfest Demo Day
**17 December 2026**

- [ ] `P11-01` Present the problem and who experiences it in the opening 25 seconds.
- [ ] `P11-02` Demonstrate the shop discovery and current status flow.
- [ ] `P11-03` Demonstrate a report submission and the resulting freshness/confidence change.
- [ ] `P11-04` Explain the AWS architecture and the reason for the chosen services.
- [ ] `P11-05` Explain the pilot boundary, privacy safeguards, and limitations honestly.
- [ ] `P11-06` Complete the judges' Q&A with clear, evidence-backed answers.

---

# 6. Git operating rules

## Branch model

- `main`: always deployable; no direct feature work.
- `develop`: integration branch for completed features.
- `feature/<short-name>`: one feature or fix per branch.
- `fix/<short-name>`: targeted bug fixes.

Examples: `feature/shop-directory`, `feature/report-aggregation`, `feature/cognito-auth`, `fix/stale-report-filter`.

## Commit format

Use Conventional Commit-style messages:

```text
feat: add locality-based shop directory
feat: implement queue report aggregation
fix: exclude expired reports from shop status
test: cover mixed epos report handling
docs: document AWS deployment process
```

## Required Git habits

- Check `git status` before starting and before committing.
- Pull the latest `develop` before branching.
- Keep commits small and focused.
- Run relevant tests before opening/merging a pull request.
- Merge into `develop` only after review and verification.
- Merge a tested release from `develop` to `main`.
- Tag every stable milestone listed in the roadmap.
- Never force-push shared branches.
- Prefer `git revert <commit-hash>` to undo a bad shared commit; do not rewrite shared history with `reset --hard`.
- Record the commit hash used for every AWS deployment.

Useful commands:

```bash
git status --short
git switch develop
git pull --ff-only
git switch -c feature/shop-directory

git add .
git commit -m "feat: add locality-based shop directory"
git push -u origin feature/shop-directory

git log --oneline --graph --decorate --all
git tag --list
git revert <commit-hash>
```

---

# 7. Team execution and daily control

For a team of 3–4, use these workstreams. One person may own more than one workstream, but each task must have one named owner.

| Workstream | Main responsibility |
|---|---|
| Product + frontend | User flows, shop directory, beneficiary pages, responsive UI, demo narrative. |
| Backend | API, data model, validation, aggregation, tests. |
| AWS + integration | SAM, Cognito, API Gateway, DynamoDB, Amplify, deployment, budget checks. |
| QA + documentation | Test cases, pilot data verification, idea brief, build summary, demo video, submission folder. |

Daily 10–15 minute check-in:

1. What checklist IDs were completed and verified yesterday?
2. What is being worked on today?
3. What is blocked, and what evidence shows the blocker?
4. Is `main` still deployable?
5. What is the current deployed commit?

Do not allow parallel contributors to edit the same files without coordinating first. Integrate working code daily rather than combining everything on the final day.

---

# 8. Definition of done

A feature is complete only when all applicable conditions are true:

- Its behaviour matches the product definition and fixed data rules above.
- Backend validation and authorisation are implemented where required.
- Loading, empty, error, and success states are handled.
- It works at mobile and desktop widths.
- Tests cover important normal and failure cases.
- No secrets or sensitive personal information are introduced.
- The code is committed on the correct branch.
- The related checklist item is marked `[x]` only after verification.

The project is Round 1 complete only when the Phase 7 exit criteria are satisfied and the Team Leader has a successful submission confirmation.

---

# 9. Required submission contents

The official hackathon instructions require the deliverables to be placed together in one Google Drive folder. The folder must contain the live prototype URL, idea brief, build summary, code repository, and demo video. The demo video must be under three minutes. Only the Team Leader is authorised to submit on behalf of the team.

Recommended folder:

```text
RationReady_Techfest_Submission/
├── 01_Idea_Brief.pdf
├── 02_Build_Summary.pdf
├── 03_AWS_Architecture.pdf
├── 04_Demo_Video.mp4
├── 05_Test_Report.pdf
└── Project_Links.txt
```

`Project_Links.txt` must contain the live prototype URL, public GitHub repository URL, and any supporting documentation URL. Check that links are accessible to judges without requesting private permissions.

---

# 10. Final project guardrails

- Build the smallest complete solution that meets the defined MVP.
- Do not claim official government integration or verified inventory unless such integration genuinely exists and is authorised.
- Do not present demo data as real reports.
- Do not use AI/ML merely to make the project appear more advanced.
- Prioritise correct report expiry, honest confidence labels, access control, and a stable live deployment over decorative features.
- Do not change the approved project scope or roadmap without explicit approval from the project owner.

**The roadmap is frozen at version 1.0. Follow the checklist in order and update checkboxes only after verification.**
