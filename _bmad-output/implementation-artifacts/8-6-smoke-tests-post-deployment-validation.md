# Story 8.6: Smoke Tests (Post-Deployment Validation)

Status: ready-for-dev

## Story

As an operator validating a deployed SaaS foundation,
I want a repeatable smoke-test command that checks the web app, BFF, authentication, API access, and database connectivity,
so that I can quickly prove a Docker Compose or Kubernetes deployment is usable before handing it to users.

## Acceptance Criteria

1. Given the application is deployed and the operator has configured target URLs, when `npm run test:smoke` runs from the repository root, then the smoke suite executes against the configured deployment and exits with status `0` only when all smoke checks pass.
2. Given the BFF URL is configured, when the smoke suite requests `GET /health`, then the response is HTTP `200` and contains the existing BFF health payload with `status: "healthy"`, `service: "bff"`, and a timestamp.
3. Given the web URL is configured, when the smoke suite requests or opens `/login`, then the response is HTTP `200` and the login page renders the existing "Welcome Back" heading plus email and password inputs.
4. Given smoke-test credentials for a seeded or dedicated direct-login user are configured, when the smoke suite signs in through the existing credentials flow, then authentication succeeds, the browser is redirected to `/dashboard`, and a NextAuth session cookie is present.
5. Given the authenticated session is active, when the smoke suite validates a protected user path, then an authenticated page or API call succeeds and an unauthenticated request to the same protected surface does not silently pass as authenticated.
6. Given the BFF is reachable from the test runner or through the deployed web app, when the smoke suite checks customer data access, then `/api/customers` returns HTTP `200` and a non-empty customer list in the existing response shape.
7. Given database migrations and seed data have been applied, when the smoke suite performs the database-connectivity check, then it verifies a Prisma-backed route returns data for the logged-in user, not just mock BFF data.
8. Given any required URL, credential, service, or database prerequisite is missing, when the smoke suite runs, then it fails with a clear diagnostic and non-zero exit code rather than skipping the core deployment checks.
9. Given the suite is committed, when developers review repository scripts and docs, then all required environment variables and local/Kubernetes examples are documented without committing real credentials or production secrets.
10. Given the smoke suite is reviewed for deployment safety, when it runs against a configured remote deployment, then it does not accidentally start or validate local dev servers unless the operator explicitly chooses a local mode.

## Tasks / Subtasks

- [ ] Add a smoke-test entrypoint and keep it separate from existing e2e tests. (AC: 1, 8, 10)
  - [ ] Add root `package.json` script `test:smoke` that delegates to the web workspace smoke runner.
  - [ ] Add `apps/web/package.json` script `test:smoke` that runs Playwright with a smoke-specific config.
  - [ ] Add `apps/web/playwright.smoke.config.ts` or equivalent, with no default `webServer` startup for deployed-target mode.
  - [ ] Keep existing `apps/web/playwright.config.ts` and `apps/web/src/tests/e2e/auth-flow.spec.ts` behavior intact.
- [ ] Create the smoke test directory and primary test file. (AC: 1-8)
  - [ ] Create root `tests/smoke/` as requested by the epic.
  - [ ] Add `tests/smoke/post-deployment.spec.ts` for the smoke checks.
  - [ ] Configure the smoke Playwright config to use `../../tests/smoke` as its `testDir` when run from `apps/web`.
- [ ] Implement configurable deployment targets. (AC: 1, 8, 9, 10)
  - [ ] Read `SMOKE_WEB_URL` for the web app origin, defaulting only to `http://localhost:3000` for explicit local runs.
  - [ ] Read `SMOKE_BFF_URL` for the BFF origin, defaulting only to `http://localhost:3001` for explicit local runs.
  - [ ] Read `SMOKE_LOGIN_EMAIL` and `SMOKE_LOGIN_PASSWORD`, with optional fallback to existing `E2E_LOGIN_EMAIL` and `E2E_LOGIN_PASSWORD`.
  - [ ] Fail before running tests if required smoke credentials are missing.
  - [ ] Normalize origins by trimming trailing slashes so URL construction is stable.
- [ ] Verify BFF health. (AC: 2)
  - [ ] Request `${SMOKE_BFF_URL}/health` using Playwright API requests.
  - [ ] Assert HTTP `200`.
  - [ ] Assert JSON fields match the existing `apps/bff/src/index.ts` health shape.
- [ ] Verify web login page availability. (AC: 3)
  - [ ] Navigate to `${SMOKE_WEB_URL}/login`.
  - [ ] Assert the page renders the existing "Welcome Back" heading.
  - [ ] Assert `#email` and `#password` inputs are visible.
- [ ] Verify credentials login and session creation. (AC: 4, 5, 8)
  - [ ] Prefer browser-driven login through the existing `/login` page because it exercises the same `next-auth/react` `signIn("credentials")` flow users use.
  - [ ] Fill configured credentials and click the existing `Sign In` button.
  - [ ] Wait for `/dashboard` and assert the dashboard heading is visible.
  - [ ] Assert the browser context contains a NextAuth session cookie, allowing both secure and non-secure cookie names used by NextAuth.
  - [ ] If implementing API-level login instead of browser login, first fetch `/api/auth/csrf` and preserve CSRF cookies before posting to `/api/auth/callback/credentials`.
- [ ] Verify authenticated protected access and API behavior. (AC: 5, 6)
  - [ ] Visit `/customers` after login and assert the protected page does not redirect to `/login`.
  - [ ] Assert the page renders customer data or, if the page reports BFF failure, include the BFF failure details in the smoke-test error.
  - [ ] Directly request `${SMOKE_BFF_URL}/api/customers` and assert the existing response has a `customers` array and numeric `total`.
  - [ ] Do not add authentication to the BFF just for smoke tests; architecture says the BFF trusts the web app and remains private.
- [ ] Verify database connectivity through a Prisma-backed route. (AC: 7, 8)
  - [ ] Use the authenticated browser/session to request the existing web route `/api/preferences`, which calls Prisma for the current user.
  - [ ] Assert HTTP `200` and a response email matching the logged-in user.
  - [ ] Treat `401`, `404`, or `500` as deployment failures with specific messages: missing session, missing seed user, or database/runtime error.
  - [ ] Do not count `GET /api/customers` as database validation because it currently returns mock data from `apps/bff/src/routes/customers.ts`.
- [ ] Document smoke-test operation. (AC: 1, 8, 9, 10)
  - [ ] Add `tests/smoke/README.md` or a focused `DEPLOYMENT.md` section covering environment variables and commands.
  - [ ] Include local example using seed credentials from `apps/web/prisma/seed.js`: `admin@example.com` / `Password123!`.
  - [ ] Include deployed example using operator-provided credentials and real deployment URLs.
  - [ ] State that real production credentials must be supplied via CI/CD secret storage or a local uncommitted environment file.
  - [ ] Include Kubernetes examples using web ingress or port-forwarded web service and BFF port-forward/internal access where appropriate.
- [ ] Validate the implementation. (AC: 1-10)
  - [ ] Run `npm run type-check` after config or TypeScript changes.
  - [ ] Run `npm run test:smoke` against local services if available.
  - [ ] If deployment services are unavailable, run the smoke suite enough to prove it fails fast on missing configuration and record the exact blocked live-checks in the Dev Agent Record.
  - [ ] Do not mark smoke ACs complete unless the command returns the expected process exit code in both passing and failing scenarios that can be exercised.

## Dev Notes

### Epic and Business Context

- Epic 8 covers deployment, database, and testing scripts so the foundation can be validated after Docker Compose or Kubernetes deployment. Story 8.6 is specifically the post-deployment smoke-test suite. [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story-8.6-Smoke-Tests-Post-Deployment-Validation`]
- PRD FR.08.06 requires smoke checks for BFF health, login page availability, authenticated API calls, and database connectivity. [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08-Deployment-Database--Testing-Scripts`]
- Phase 1 success includes Docker Compose and Kubernetes deployments with passing smoke tests. [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#Success-Criteria-Phase-1-Completion`]

### Current Repository State

- No root `tests/smoke/` directory exists.
- No root `scripts/` directory exists.
- No root `docker-compose.yml` exists in the current working tree.
- No `k8s/` directory exists in the current working tree, although Story 8.3 has a ready-for-dev story file for creating it.
- Root `package.json` currently has `test`, `test:unit`, `test:integration`, `test:e2e`, and database scripts, but no `test:smoke`. [Source: `package.json`]
- `apps/web/package.json` has Playwright available through `test:e2e`, but no `test:smoke`. [Source: `apps/web/package.json`]
- Existing Playwright config starts or reuses a web server by default. The smoke config must avoid this default for deployed validation so it does not silently test localhost instead of the target deployment. [Source: `apps/web/playwright.config.ts`]

### Existing Endpoints and Behaviors to Reuse

- BFF health endpoint exists at `GET /health`, returns `{ status: "healthy", service: "bff", timestamp }`, and is unauthenticated. [Source: `apps/bff/src/index.ts`]
- BFF listens on `process.env.PORT || 3001`, uses Helmet, Morgan, `express.json()`, and CORS restricted by `WEB_APP_URL || "http://localhost:3000"`. Preserve that behavior. [Source: `apps/bff/src/index.ts`]
- Web login page exists at `/login`, renders the "Welcome Back" heading, `#email`, `#password`, and a `Sign In` button. [Source: `apps/web/src/app/login/page.tsx`]
- Credentials auth is implemented through NextAuth CredentialsProvider in the web app. It lowercases/trims email, finds `Customer.email`, compares the bcrypt password, rejects social-only users, and creates a JWT session. [Source: `apps/web/src/app/api/auth/[...nextauth]/auth-options.ts`]
- Protected shell data uses `requireAuthenticatedSession()` and role-menu lookups before protected pages render. `/dashboard` and `/customers` are useful session validation surfaces. [Source: `apps/web/src/lib/role-menu.ts`; `apps/web/src/app/dashboard/page.tsx`; `apps/web/src/app/customers/page.tsx`]
- `/api/preferences` is an authenticated web API route that queries Prisma for the logged-in customer. It is the best existing database smoke proof because `/api/customers` currently returns BFF mock data. [Source: `apps/web/src/app/api/preferences/route.ts`; `apps/bff/src/routes/customers.ts`]
- Seed data creates direct-login users including `admin@example.com`, `sales@example.com`, `marketing@example.com`, and `user@example.com`, all with password `Password123!`. [Source: `apps/web/prisma/seed.js`]

### Architecture Guardrails

- Keep the BFF private. The smoke suite may call BFF health/customers directly only when the operator exposes it to the test runner through localhost, port-forwarding, CI network access, or internal network access. It must not require making BFF public. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04-BFF-as-Private-Service-ADOPTED`]
- Web app owns auth and presentation; BFF owns business/data routes and trusts the web app. Do not add an auth layer to BFF as part of this story. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-02-Authentication-Model-ADOPTED`]
- API responses should follow shared type contracts where existing routes already do. Do not duplicate response types in smoke helpers if `@saas/shared-types` can be reused. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-05-Shared-Types--Single-Source-of-Truth-ADOPTED`]
- Production `NEXTAUTH_URL` must be HTTPS and `NEXTAUTH_SECRET` must be consistent across web replicas; smoke login failures can indicate misconfigured auth URL/secret. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11-Security--Encryption-LOCKED`]
- Deployment checks must cover health, login, API calls, and database connectivity after Docker Compose or Kubernetes rollout. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10-Deployment-Targets-LOCKED`]

### File Structure Requirements

- Create or update:
  - `tests/smoke/post-deployment.spec.ts`
  - `tests/smoke/README.md` or a focused smoke-test section in `DEPLOYMENT.md`
  - `apps/web/playwright.smoke.config.ts`
  - root `package.json`
  - `apps/web/package.json`
- Do not modify:
  - Existing unit/integration/e2e tests except for shared helpers that are genuinely reused.
  - BFF auth behavior; the BFF remains private and trusted by web.
  - Seed data unless the smoke story explicitly needs a new dedicated smoke user. Prefer existing seeded direct users first.

### Smoke Configuration Contract

- Required variables:
  - `SMOKE_WEB_URL`: externally reachable web origin, for example `https://saas.example.com` or `http://localhost:3000`.
  - `SMOKE_BFF_URL`: BFF origin reachable from the test runner, for example `http://localhost:3001` or a port-forwarded service URL.
  - `SMOKE_LOGIN_EMAIL`: direct-login smoke user email.
  - `SMOKE_LOGIN_PASSWORD`: direct-login smoke user password.
- Optional compatibility fallback:
  - `E2E_LOGIN_EMAIL` and `E2E_LOGIN_PASSWORD` may be used if smoke-specific credentials are absent, but the test output should still say which credential variable family is being used.
- Recommended local values after `npm run db:seed`:
  - `SMOKE_LOGIN_EMAIL=admin@example.com`
  - `SMOKE_LOGIN_PASSWORD=Password123!`
- Do not commit real production smoke credentials. CI/CD should inject them as secrets.

### Testing Strategy

- Use Playwright because it is already installed in the web workspace and existing e2e tests already use it. [Source: `apps/web/package.json`; `apps/web/src/tests/e2e/auth-flow.spec.ts`]
- Use API requests for fast service checks (`/health`, `/api/customers`) and browser checks for login/session behavior.
- Keep smoke tests serial or low-parallelism by default. Smoke tests validate shared deployment state and should produce deterministic diagnostics.
- Prefer short, explicit timeouts. A smoke failure should identify the unavailable surface quickly instead of hanging for a long e2e timeout.
- Avoid test skips for core checks. Missing URLs or credentials should be setup failures.
- If BFF is internal-only in Kubernetes, document `kubectl port-forward -n saas-foundation svc/saas-bff-service 3001:3001` as one way to provide `SMOKE_BFF_URL=http://localhost:3001` without exposing the service publicly.

### Previous Story Intelligence

- Story 8.2 created ready-for-dev guidance for separate web and BFF Docker images. This smoke story should assume images may not yet be implemented and should fail clearly if deployed services are unavailable. [Source: `_bmad-output/implementation-artifacts/8-2-docker-images-multi-stage-builds.md`]
- Story 8.3 created ready-for-dev guidance for generic Kubernetes manifests and explicitly requires BFF to remain `ClusterIP` only. This smoke story should support port-forward/internal access rather than requiring public BFF exposure. [Source: `_bmad-output/implementation-artifacts/8-3-kubernetes-manifests-generic.md`]
- Sprint status currently shows `8-1-docker-compose-setup-local-dev` and `8-5-seed-data-script` as `in-progress`, while `8-4-database-backup-restore-scripts` remains `backlog`. Do not assume compose, seed automation in deployment, or backup/restore behavior is complete. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]
- The highest previous Epic 8 story file found is Story 8.3. No `8-4-*.md` or `8-5-*.md` story artifact exists in the implementation-artifacts folder at story creation time.

### Recent Git Intelligence

- Recent commits are admin/API focused, not deployment focused:
  - `352a315 fix: handle non-json admin api responses`
  - `29b9d0b feat: add admin audit trail logging`
  - `19782dc merge: complete admin role module mapping`
  - `c0d11e8 feat: complete admin role module mapping`
  - `aeeaf45 feat: add admin module management tab`
- Relevant pattern: when API response handling changed, tests were updated. Smoke implementation should include focused validation and type-checking rather than only adding scripts.

### Latest Technical Information

- Playwright supports API testing through `APIRequestContext`, which is appropriate for BFF health and API checks without opening a browser. Source: https://playwright.dev/docs/api-testing
- Playwright request contexts can expose storage state/cookies, which is useful when a login helper needs to preserve authenticated state between API and browser checks. Source: https://playwright.dev/docs/api/class-apirequestcontext
- Playwright `webServer.reuseExistingServer` can start or reuse a local server. Smoke tests for deployed targets should use a separate config without default web-server startup to avoid false positives against localhost. Source: https://playwright.dev/docs/test-webserver
- NextAuth credentials POSTs require CSRF handling through `/api/auth/csrf`; use the existing UI flow unless an API login helper deliberately preserves the CSRF cookie and token. Source: https://next-auth.js.org/getting-started/rest-api
- NextAuth custom credentials sign-in docs also call out passing the CSRF token to `/api/auth/callback/credentials`. Source: https://next-auth.js.org/configuration/pages

### Project Structure Notes

- The epic asks for `tests/smoke/`; keep the smoke specs at the repository root under that directory.
- Because Playwright is a web workspace dependency, run the root smoke script by delegating to `apps/web` rather than adding a duplicate root dependency.
- Keep smoke-test docs close to the test directory unless deployment-wide documentation needs a concise link from `DEPLOYMENT.md`.
- Do not put generated test artifacts under source control. Existing `reports/` folders are excluded by scan boundaries and should not be used for story context or committed smoke output.

### References

- Epic/story requirements: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story-8.6-Smoke-Tests-Post-Deployment-Validation`
- PRD smoke requirement: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FR.08.06-Smoke-tests`
- Architecture deployment target: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10-Deployment-Targets-LOCKED`
- Architecture BFF privacy rule: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04-BFF-as-Private-Service-ADOPTED`
- Architecture auth boundary: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-02-Authentication-Model-ADOPTED`
- Project testing and env conventions: `docs/project-context.md#Testing-Rules`, `docs/project-context.md#Environment-Variables`
- Existing BFF health endpoint: `apps/bff/src/index.ts`
- Existing customer API route: `apps/bff/src/routes/customers.ts`
- Existing web Playwright config: `apps/web/playwright.config.ts`
- Existing e2e login tests: `apps/web/src/tests/e2e/auth-flow.spec.ts`
- Existing login page: `apps/web/src/app/login/page.tsx`
- Existing NextAuth credentials config: `apps/web/src/app/api/auth/[...nextauth]/auth-options.ts`
- Existing Prisma-backed preferences route: `apps/web/src/app/api/preferences/route.ts`
- Existing seed users: `apps/web/prisma/seed.js`
- Playwright API testing docs: https://playwright.dev/docs/api-testing
- Playwright APIRequestContext docs: https://playwright.dev/docs/api/class-apirequestcontext
- Playwright web server docs: https://playwright.dev/docs/test-webserver
- NextAuth REST API docs: https://next-auth.js.org/getting-started/rest-api
- NextAuth pages/credentials docs: https://next-auth.js.org/configuration/pages

## Open Questions / Assumptions

- Assumption: The smoke suite should reuse existing seeded direct-login users for local validation and allow operator-provided credentials for deployed environments.
- Assumption: `/api/preferences` is acceptable as the database-connectivity proof because it is authenticated and Prisma-backed in the current code.
- Assumption: The BFF smoke URL may be a localhost port-forward in Kubernetes deployments; the story must not require changing the BFF service from private `ClusterIP` to public exposure.
- Open question for implementation: Should CI run smoke tests only on demand after deployment, or should a future CI story add an environment-gated post-deploy job?

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
