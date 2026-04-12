---

# Project Summary

This project implements a robust, production-grade backend API for a mobile dashboard, following the Backend-for-Frontend (BFF) pattern. The API is designed for resilience, maintainability, and strict contract alignment using OpenAPI as the single source of truth.

## Key Features

- **OpenAPI-Driven Development:** All endpoints and schemas are defined in OpenAPI and strictly validated at runtime. TypeScript types are generated from the contract.
- **Dashboard Endpoint:** The `/dashboard` endpoint aggregates company, card, spend, and transaction preview data in parallel, returning partial responses if any section fails (with per-section error objects). This ensures the UI remains responsive and resilient.
- **Service Extraction:** Spend and transaction preview logic are implemented as reusable services, supporting both dashboard aggregation and granular endpoints.
- **Resilience Patterns:**
  - **SLA Timeouts:** Each dashboard section has a per-section timeout (e.g., `DASHBOARD_SECTION_TIMEOUT_MS`) to prevent slow dependencies from blocking the whole response.
  - **Circuit Breaker:** All DB/service calls are wrapped in circuit breakers to prevent cascading failures and return partial data if a dependency is down.
  - **Rate Limiting:** Endpoints are protected with rate limiting to ensure fair usage and protect backend resources.
- **Error Handling:** Section-level errors are returned for partial failures, following the ProblemDetails (RFC 7807) pattern for machine-readable error responses.
- **Comprehensive Testing:**
  - Unit and integration tests cover all endpoints, including partial response scenarios (rate limit, circuit breaker open, timeouts).
  - Test/dev environments inject a fixed user for seamless local development and testing.
- **Automation:** OpenAPI bundle and type generation are automated in the build lifecycle, ensuring contract and types are always up to date.

## Technical Stack
- Node.js, Express, Sequelize ORM
- Jest for testing
- OpenAPI/Swagger for contract and docs
- Circuit breaker: Opossum
- Rate limiting: express-rate-limit

## Motivation
This architecture ensures:
- Fast, resilient, and user-friendly mobile dashboard experiences
- Clear separation of concerns and maintainability
- Easy onboarding and review for product, frontend, and backend teams
- Predictable, contract-driven development with minimal ambiguity

---

# Qred API

## First commit

- OpenAPI is the source of truth.
- Swagger UI is the easiest way to present that source of truth.
- This reduces ambiguity before implementation starts.

## API design phase

Introduce API design before implementation starts.

The contract for the mobile dashboard design lives in [openapi/qred-api.yaml](openapi/qred-api.yaml). This file is the single source of truth and should be reviewed collaboratively by Backend, Frontend, and PM before any endpoint is implemented.

The root spec is intentionally small. Paths live under [openapi/paths](openapi/paths) and reusable components live under [openapi/components](openapi/components).

### Why REST over GraphQL

The screen needs a small set of clearly defined operations: list available companies, fetch one company dashboard, list transactions, and activate a card. REST keeps those interactions explicit, easy to cache, easy to document in OpenAPI, and straightforward for Backend, Frontend, and PM to review together.

### Dashboard endpoint motivation and partial responses

The `/dashboard` endpoint is inspired by the Backend-for-Frontend (BFF) pattern: it provides a single, UX-focused API tailored for the mobile dashboard, aggregating data from multiple backend services in parallel. The mobile client does not need to coordinate dependencies itself—the API owns that aggregation.

If some sections are unavailable, the API returns partial data with per-section status (`ready`, `loading`, `error`). The UI can render what is available immediately and show loading or error states for missing sections. This keeps the app fast and resilient, and avoids blocking the whole dashboard on a single slow or failing dependency.

For advanced or power-user flows, granular endpoints are also available for direct access to specific resources (e.g., full transaction list, card activation).

### Collaborative workflow

1. PM defines the screen goal, business rules, and acceptance criteria.
2. Frontend identifies the exact view model required to render the design without guesswork.
3. Backend defines resource boundaries, data ownership, and operational constraints.
4. The team resolves naming, pagination, and error semantics in the OpenAPI contract.
5. Implementation starts only after the contract is agreed and versioned.

---

## Step -7

### Backend & API

- **OpenAPI contract:** Strictly followed as the source of truth; all endpoints and schemas updated accordingly.
- **Invoices:**
  - Added `/api/v1/companies/{companyId}/invoices/latest` endpoint to fetch the latest due invoice for a company.
  - Removed redundant invoice model attributes (`issuedAt`, `paidAt`).
  - Invoice model, service, controller, and routes refactored for maintainability and OpenAPI alignment.

### Circuit Breaker & Logging

- Invoice and transaction services now use a shared circuit breaker for DB calls.
- Centralized logging for errors and warnings in all service layers.

### Test Coverage

- **Invoices:**
  - Added robust unit tests for service and controller logic.
  - Added integration tests for `/invoices/latest` endpoint.
- **Transactions:**
  - Updated all unit and integration tests for new `userId` logic.
  - Improved test data setup and structure for maintainability.
    schema examples for improved documentation and testability.

---

## UI Component to Endpoint Mapping

This section maps each element of the mobile dashboard UI to its supporting API endpoint(s). This mapping ensures:

- Every user interaction is backed by a clear contract
- No UI feature is left unsupported by the backend
- Reviewers can trace requirements from design to implementation

**Best Practices:**

- Always maintain a UI-to-endpoint map for complex products
- Update the map as new features or endpoints are added
- Use diagrams for clarity in cross-team reviews
- Keep UI-only actions (like support buttons) out of the backend contract unless tracking is required

### Table: UI Elements and Endpoints

| UI Component                       | Endpoint(s)                                                                                                                                                                   | Notes                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Logo/Menu                          | UI only                                                                                                                                                                       | No backend needed                  |
| Company Selector                   | GET /v1/companies<br>PATCH /v1/user/company-selection                                                                                                                         | List and select company            |
| Invoice Due (chevron/button)       | GET /v1/dashboard<br>GET /v1/companies/{companyId}/invoices/{invoiceId}                                                                                                       | Preview and details                |
| Card Image (chevron/button)        | GET /v1/dashboard<br>GET /v1/companies/{companyId}/cards/{cardId}<br>PATCH /v1/companies/{companyId}/cards/{cardId}<br>POST /v1/companies/{companyId}/cards/{cardId}/activate | Preview, details, update, activate |
| Remaining Spend (chevron/button)   | GET /v1/dashboard<br>GET /v1/companies/{companyId}/remaining-spend                                                                                                            | Preview and details                |
| Latest Transactions (preview list) | GET /v1/dashboard<br>GET /v1/companies/{companyId}/transactions                                                                                                               | Preview and full list              |
| "54 more items" Button             | GET /v1/companies/{companyId}/transactions                                                                                                                                    | Full transaction list              |
| Activate Card Button               | POST /v1/companies/{companyId}/cards/{cardId}/activate                                                                                                                        | Card activation                    |
| Contact Qred Support Button        | UI only                                                                                                                                                                       | Opens chat/email/help, not backend |

---

## Mocking with Prism

This project uses [Prism](https://github.com/stoplightio/prism) to mock the OpenAPI
This allows the frontend to develop and test against realistic API responses before backend implementation is complete.

---

**Motivation:**

Maintaining a clear UI-to-endpoint map ensures that product, frontend, and backend teams are always aligned. It reduces ambiguity, speeds up onboarding, and makes it easy to spot gaps or over-engineering. Visual diagrams and tables help reviewers and new team members quickly understand how the API supports the user experience.

# 2nd commit

- Added OpenAPI contract and generated TypeScript types.
- Set up initial project structure: src/app.ts, src/server.ts, - Sequelize config, and folders for models, seed, mappers, routes, and services.
- Added /health route in src/routes/health.ts.

### Automation details

- The OpenAPI bundle and TypeScript types are always generated before dev, build, or start via npm lifecycle hooks (`predev`, `prebuild`, `prestart`).
- You never need to manually run the bundle/typegen steps unless you want to.

This ensures your API contract and types are always up to date with your codebase.

# Step 3: Summary of Recent Changes

- Implemented Data model required to support the api
- Sequelize was used as the ORM as it has advantages like Object oriented approach and sql injection prevention etc
- Implemented indexes and foreign keys to improve integrity and consistency of the data
- Seed script truncates all tables before inserting data, ensuring a clean state.

# Step 4: ESLint Integration

- For Consistent code quality for maintainability, collaboration, and reliability

# Step 5: Default Card Endpoint

## Summary of Changes

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

## Motivation

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

# Step 6: Transactions List Endpoint

## Summary of Changes

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

## Motivation

- **Consistency:** Align transactions behavior with the default card implementation quality bar.
- **Contract safety:** Keep runtime behavior and tests strictly synchronized with OpenAPI.
- **Resilience:** Reusing one shared DB circuit breaker centralizes protection under dependency failure.
- **Maintainability:** Shared pagination and circuit-breaker patterns reduce duplication and drift.

## /dashboard Endpoint Summary

The `/dashboard` endpoint provides a single, UX-focused API tailored for the mobile dashboard. It aggregates data from multiple backend services in parallel, including company info, card details, remaining spend, and a transaction preview. Each section is isolated with SLA timeouts and circuit breakers, ensuring that a failure or delay in one section does not block the entire response. If a section is unavailable, the API returns a partial response with per-section error objects, allowing the UI to render available data and display loading or error states for missing sections.

**Key Features:**

- Aggregates company, card, spend, and transaction preview data in parallel
- Per-section SLA timeouts and circuit breaker protection
- Returns partial responses with section-level errors on failure
- Strict OpenAPI contract validation and type safety
- Comprehensive integration and unit test coverage for all scenarios

This design ensures a fast, resilient, and user-friendly dashboard experience, even under backend failures or heavy load.
