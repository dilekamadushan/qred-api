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