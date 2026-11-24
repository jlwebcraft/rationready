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
