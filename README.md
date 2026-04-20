# Task - 1 - [Presentation](#https://docs.google.com/presentation/d/1L2A2PJD2Jn7Hlba91xe6iCpZgrJgySrIhVK-o8sUm8A/edit?usp=sharing)

# Task-2 Implementing Qred-API

This project implements a robust, production-grade backend REST API for a mobile dashboard, following the Backend-for-Frontend (BFF) pattern. The API is designed for resilience, maintainability, and strict
contract alignment using OpenAPI as the single source of truth.

## Table of Contents

- [Further Improvements](#further-improvements)
- [Key Features Implemented](#key-features--implemented)
- [Merged pull requests](#merged-pull-requests)
- [Getting started](#getting-started)
- [Commit History (commit history)](#commit-history)

## Further Improvements

- [Security and compliance](#security--compliance)
- [ Improve Observability and monitoring](#observability)
- Frontend Collaboration: Host the shared API mock server for frontend use.
- CI/CD Integration: Set up automated tests and linting in CI.
- [Performance](#performance--scalability)
- Data Integrity Enhancements - Add versioning to prevent lost updates in concurrent environments and implement Soft Deletes for recovery of data
- Business Logic/Test Improvements - cover edge cases in service layer and with integration tests

- Move to production grade database (Postgres SQL, MySQL)
- Real-time updates: Instantly push new transactions, card status changes, balance updates, or notifications to the user without polling through websockets
- [Improve DEV experience](#developer-experience)

### Security & Compliance

- **OAuth2/JWT:** Integrate with a real auth provider (e.g., Auth0, Azure AD) and enforce scopes/roles.
- **Audit Logging:** Track sensitive actions and data access for compliance.
- **Secrets Management:** Move secrets to a vault (e.g., AWS Secrets Manager, HashiCorp Vault).

### Observability

- **Structured Logging:** Integrate a structured logger (e.g., pino, winston) with trace IDs and correlation for all requests.
- **Metrics:** Expose Prometheus metrics for key API, DB, and circuit breaker events.

### Performance & Scalability

- **Caching:** Add Redis for hot-path caching (e.g., company, card, spend summaries).
- **Async Processing:** Move slow/side-effecting flows (e.g., invoice generation) to background jobs (BullMQ, SQS).
- **Horizontal Scaling:** Move first with serverless

### Developer Experience

- **Preview Environments:** Use ephemeral environments for every PR (e.g., with Docker Compose or Vercel/Nx).
- **Test Data Factories:** Use factories (e.g., fishery) for more expressive test data.

## Key Features Implemented

    ### Motivation
    This architecture ensures:
      - Fast, resilient, and user-friendly mobile dashboard experiences
      - Clear separation of concerns and maintainability
      - Easy onboarding and review for product, frontend, and backend teams
      - Predictable, contract-driven development with minimal ambiguity

- #### OpenAPI-Driven Development -
  - All endpoints and schemas are defined in OpenAPI and strictly validated at runtime. TypeScript types are generated from the contract.
- #### Code quality
  - Setting up prettier and lint for enhncing quality of code and readability
- #### BFF pattern
  - Dashboard Endpoint - The `/dashboard` endpoint aggregates company, card, spend, and transaction preview data in parallel, returning partial responses if any section fails (with per-section error objects). This ensures the UI remains responsive and resilient.
- #### Resilience Patterns:
  - SLA Timeouts: Each dashboard section has a per-section timeout (e.g., `DASHBOARD_SECTION_TIMEOUT_MS`) to prevent slow dependencies from blocking the whole response.
  - Circuit Breaker: All DB/service calls are wrapped in circuit breakers to prevent cascading failures and return partial data if a dependency is down.
  - Rate Limiting: Endpoints are protected with rate limiting to ensure fair usage and protect backend resources.
- #### Error Handling: Section-level errors are returned for partial failures, following the ProblemDetails (RFC 7807) pattern for machine-readable error responses.
- #### Comprehensive Testing:
  - Unit and integration tests cover all endpoints, including partial response scenarios (rate limit, circuit breaker open, timeouts).
  - Test/dev environments inject a fixed user for seamless local development and testing.
- #### Automation:
  - OpenAPI bundle and type generation are automated in the build lifecycle, ensuring contract and types are always up to date.
- #### Correlated Logging for Traceability & Monitoring -
  - Automatic Log Correlation: All log messages (logInfo, logWarn, logError).
  - Automatically include the current requestId, enabling end-to-end traceability in logs without manual parameter passing.

## Merged Pull requests

The changes to the repo were done in [pull requests](https://github.com/dilekamadushan/qred-api/pulls?q=is%3Apr+is%3Aclosed) so it's easier to track the progress and closer to working in a production scenario

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm

### Install

```bash
npm install
```

### Run API in Development

```bash
npm run dev
```

Default API URL:

- http://localhost:3000

### Build and Run Production Mode Locally

```bash
npm run build
npm start
```

### Database Setup

```bash
npm run db:setup
npm run db:seed
```

## Mock Server and API Docs

### Start Mock Server from OpenAPI

Static examples:

```bash
npm run mock
```

Dynamic example generation:

```bash
npm run mock:dynamic
```

Default mock URL:

- http://localhost:4010

### Start Swagger UI

```bash
npm run docs:swagger
```

Swagger UI URL:

- http://localhost:8080

---

## Commit History

### 1st step

- OpenAPI is the source of truth.
- Swagger UI is the easiest way to present that source of truth.
- This reduces ambiguity before implementation starts.

#### API design phase

Introduce API design before implementation starts.

The contract for the mobile dashboard design lives in [openapi/qred-api.yaml](openapi/qred-api.yaml). This file is the single source of truth and should be reviewed collaboratively by Backend, Frontend, and PM before any endpoint is implemented.

The root spec is intentionally small. Paths live under [openapi/paths](openapi/paths) and reusable components live under [openapi/components](openapi/components).

#### Why REST over GraphQL

The screen needs a small set of clearly defined operations: list available companies, fetch one company dashboard, list transactions, and activate a card. REST keeps those interactions explicit, easy to cache, easy to document in OpenAPI, and straightforward for Backend, Frontend, and PM to review together.

#### Dashboard endpoint motivation and partial responses

The `/dashboard` endpoint is inspired by the Backend-for-Frontend (BFF) pattern: it provides a single, UX-focused API tailored for the mobile dashboard, aggregating data from multiple backend services in parallel. The mobile client does not need to coordinate dependencies itself—the API owns that aggregation.

If some sections are unavailable, the API returns partial data with per-section status (`ready`, `loading`, `error`). The UI can render what is available immediately and show loading or error states for missing sections. This keeps the app fast and resilient, and avoids blocking the whole dashboard on a single slow or failing dependency.

For advanced or power-user flows, granular endpoints are also available for direct access to specific resources (e.g., full transaction list, card activation).

#### UI Component to Endpoint Mapping

This mapping ensures:

- Every user interaction is backed by a clear contract
- No UI feature is left unsupported by the backend
- Reviewers can trace requirements from design to implementation

#### Mocking with Prism

This project uses [Prism](https://github.com/stoplightio/prism) to mock the OpenAPI
This allows the frontend to develop and test against realistic API responses before backend implementation is complete.

### 2nd step

- Added OpenAPI contract and generated TypeScript types.
- Set up initial project structure: src/app.ts, src/server.ts, - Sequelize config, and folders for models, seed, mappers, routes, and services.
- Added /health route in src/routes/health.ts.

#### Automation details

- The OpenAPI bundle and TypeScript types are always generated before dev, build, or start via npm lifecycle hooks (`predev`, `prebuild`, `prestart`).
- You never need to manually run the bundle/typegen steps unless you want to.

This ensures your API contract and types are always up to date with your codebase.

### 3rd step

- Implemented Data model required to support the api
- Sequelize was used as the ORM as it has advantages like Object oriented approach and sql injection prevention etc
- Implemented indexes and foreign keys to improve integrity and consistency of the data
- Seed script truncates all tables before inserting data, ensuring a clean state.

### 4th Step: ESLint Integration

- For Consistent code quality for maintainability, collaboration, and reliability

### 5th Step 5

- Implemented a production-grade `/v1/companies/:companyId/card/default` endpoint with:
  - Controller and service layers for clear separation of concerns.
  - Strict OpenAPI contract validation (using express-openapi-validator).
  - ProblemDetails (RFC 7807) error responses for all error cases.
  - Full unit and integration test coverage (Jest, Supertest).
- Added robust resilience at the DB layer:
  - HTTP request throttling with `express-rate-limit` (per user/IP).
  - Database circuit breaker using `opossum` (prevents overload, returns 503 if dependency is down).
  - Sequelize connection pooling for efficient resource usage.
- Fixed OpenAPI schema bugs (e.g., ensured all `nullable` fields have a `type`).
- Removed `additionalProperties: true` to enforce strict contract and type safety.
- Updated all scripts to ensure lint, test, and build pass before deployment.

These changes ensure the API is robust, predictable, and easy to integrate with:

- **Strict contract:** OpenAPI is the single source of truth, so clients and backend always agree on data shapes. Removing `additionalProperties: true` enforces this.
- **Resilience:** Rate limiting and circuit breaker patterns protect the database and improve uptime, even under heavy load or dependency failures.
- **Error handling:** ProblemDetails responses make error cases clear and machine-readable for clients.
- **Test coverage:** Automated tests catch regressions and guarantee endpoint behavior.

This approach supports safe, maintainable growth as the API evolves and is ready for production use.

- **Global Authentication Enforcement:**
  - All `/api` routes are protected by authentication middleware. Integration tests verify that unauthenticated requests receive 401 responses.
- **Test & Dev Auth:**
  - In test/dev, the middleware injects a fixed user for all requests, making integration tests and local development seamless.

### 6th Step

- Implemented `GET /v1/companies/{companyId}/transactions` with strict OpenAPI response shape:
  - Supports `cursor`, `status`, `dateFrom`, `dateTo`, `pageSize`, `sortBy`, `sortOrder`, and `search`.
  - Returns OpenAPI-compliant `TransactionListResponse` with `data.items`, `data.page`, and `links`.
- Added robust cursor pagination:
  - Opaque base64 cursor encoding/decoding using shared cursor utils.
  - Stable ordering with deterministic tie-breaker on `id`.
- Added full test coverage for transactions:
  - Service unit tests for filtering, search, sorting, and cursor handling.
  - Controller unit tests for query parsing and response building.
  - Integration tests for filter/search/sort/date-range/cursor pagination and rate limiting.
- Reused one shared database circuit breaker for both default card and transactions flows:
  - Single shared breaker instance is now used across services.
  - Existing service exports remain stable for compatibility in tests and route logic.
  - Align transactions behavior with the default card implementation quality bar.

### 7th Step

- Added `/api/v1/companies/{companyId}/invoices/latest` endpoint to fetch the latest due invoice for a company.
- Removed redundant invoice model attributes (`issuedAt`, `paidAt`).
- Invoice model, service, controller, and routes refactored for maintainability and OpenAPI alignment.

- Invoice and transaction services now use a shared circuit breaker for DB calls.
- Centralized logging for errors and warnings in all service layers.
- Implemented unit tests and integration tests

### 8th Step

The `/dashboard` endpoint provides a single, UX-focused API tailored for the mobile dashboard. It aggregates data from multiple backend services in parallel, including company info, card details, remaining spend, and a transaction preview. Each section is isolated with SLA timeouts and circuit breakers, ensuring that a failure or delay in one section does not block the entire response. If a section is unavailable, the API returns a partial response with per-section error objects, allowing the UI to render available data and display loading or error states for missing sections.

This design ensures a fast, resilient, and user-friendly dashboard experience, even under backend failures or heavy load.

#### 9th Step

- Added `GET /api/v1/companies/{companyId}/remaining-spend` to fetch detailed remaining spend for a company.
- Implemented with clear separation of concerns and strict OpenAPI contract validation.
- Returns ProblemDetails (RFC 7807) error responses for all error cases, including 429 (rate-limited) and 503 (circuit breaker open).
- Full unit and integration tests for all success and error scenarios.
- Explicit tests for rate-limiting and circuit breaker failures.

### 10thStep

- Added `GET /api/v1/companies/` to fetch companies for user.
- Implemented with clear separation of concerns and strict OpenAPI contract validation.
- Returns ProblemDetails (RFC 7807) error responses for all error cases, including 429 (rate-limited) and 503 (circuit breaker open).
- Full unit and integration tests for all success and error scenarios.
- Explicit tests for rate-limiting and circuit breaker failures.

### 11th Step

- Added `POST /api/v1/card/:cardId/:status` to update card statuses.
- Implemented with best practices like transactions to ensure the integrity of data.
- Full unit and integration tests for all success and error scenarios.
- Explicit tests for rate-limiting and circuit breaker failures.
- Request ID Logging for Traceability & Monitoring -
  Automatic Log Correlation: All log messages (logInfo, logWarn, logError) automatically include the current requestId, enabling end-to-end traceability in logs without manual parameter passing.
