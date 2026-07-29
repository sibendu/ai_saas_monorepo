---
title: SaaS Foundation PRD
status: final
created: 2026-07-09
updated: 2026-07-09
project: saas_monorepo
type: personal
phase: 1-foundation-launch
---

# SaaS Foundation PRD

## Executive Summary

A production-grade, open-source SaaS foundation that provides all foundational infrastructure — multi-auth, role-based access control, configuration-driven menus, GDPR compliance, and cloud-agnostic deployment — so builders can launch differentiated products fast. Built as a monorepo reference implementation (Next.js 14+ frontend, Express BFF, Prisma/PostgreSQL), fully containerized (Docker Compose + Kubernetes), Apache 2.0 licensed.

**Outcome:** Foundation ready for external use; deployed successfully to Docker Compose and Kubernetes; feature-complete per all Phase 1 capabilities below.

---

## Product Overview

### Form & Shape

**Monorepo-structured reference implementation + starter kit:**
- **Next.js 14+ app** (frontend, port 3000)
- **Express.js BFF** (backend-for-frontend, port 3001)
- **PostgreSQL + Prisma** (database)
- **Shared types package** (TypeScript interfaces used by web + BFF)
- **Docker & Kubernetes** ready; deployment and seed scripts included

**Audience:** Solo founders, small teams, enterprises building internal SaaS.

**Go-to-Market:** Open-source on GitHub under Apache 2.0; free to use, fork, extend.

---

## Features

### FRx01: Multi-Provider Authentication

**What it does:** Users can register and log in via email/password, Google OAuth, or GitHub OAuth. System tracks registration intent to prevent unintended account linkage.

- **FR.01.01** Email/password auth: Registration form captures email, name, company. System sends activation email with reset link. User clicks link → password reset page → sets password → account activated. Users then log in via email and password.
- **FR.01.02** Google OAuth: Redirect to Google consent, return email + profile, create account on first sign-in.
- **FR.01.03** GitHub OAuth: Redirect to GitHub consent, return email + profile, create account on first sign-in.
- **FR.01.04** Registration intent: System sets cookie before OAuth flow to track intended provider; prevents users from registering with one provider then logging in with another.
- **FR.01.05** Session management: JWT session, 30-day expiry, stored in HTTP-only cookie. NextAuth manages token lifecycle.
- **FR.01.06** Protected routes: All pages except login, register, password reset require valid session. Unauthorized access redirects to login.

### FRx02: Password Reset

**What it does:** Users can request a password reset via email using a token-based approach that expires and complies with GDPR principles.

- **FR.02.01** Forgot password form: User enters email and receives token via nodemailer.
- **FR.02.02** Reset token: Unique, time-bound (1 hour expiry), stored in database with hash.
- **FR.02.03** Reset password form: User clicks email link, enters new password, and system consumes token.
- **FR.02.04** Token validation: System rejects expired or already-used tokens; clear error message displayed.

### FRx03: Configuration-Driven Menu System

**What it does:** Admin users can switch menu layout (left sidebar vs. top horizontal) and manage role-to-module mappings without code changes.

- **FR.03.01** Menu layout switching: System toggles between two layouts via config flag:
  - *Left-hand menu*: Modules with click-to-expand sub-modules (collapsible tree).
  - *Top-horizontal menu*: Modules as menu options; hover reveals sub-modules in dropdown.
- **FR.03.02** Menu data structure: Modules and sub-modules stored in database as JSON or relational tables. Each module/sub-module has `id`, `label`, `icon`, `href`.
- **FR.03.03** Role-module mapping: Admin panel allows CRUD:
  - Create/edit roles (name, description).
  - Map roles to allowed modules/sub-modules (many-to-many).
  - Assign users to roles (one user can have multiple roles).
- **FR.03.04** Access control enforcement: On page load, fetch user roles → resolve allowed modules → render menu. Hide modules user doesn't have access to.
- **FR.03.05** Layout responsiveness: Left menu collapses on mobile; top menu becomes hamburger on small screens.

### FRx04: Admin Panel

**What it does:** Role-restricted admin section for managing roles, users, and module access.

- **FR.04.01** Admin role requirement: Only users with `admin` role assigned can access `/admin`. Non-admin users see 403 or are redirected to dashboard.
- **FR.04.02** Role management: CRUD for roles — create new role, edit name/description, delete role (soft-delete recommended), view all roles.
- **FR.04.03** User management: List all users, edit user details (name, company, email), view assigned roles, change roles.
- **FR.04.04** Role assignment: Bulk or single user-role assignment; many-to-many relationship (one user → multiple roles).
- **FR.04.05** Module access mapping: Within role detail view, select which modules/sub-modules this role can access. Save as many-to-many relationship.
- **FR.04.06** Audit trail: Log (in database or console) who made what admin changes (role created, user assigned to role, etc.). No compliance blocker; informational only.

### FRx05: Themeable Styling

**What it does:** All colors, fonts, spacing, and other CSS properties configurable via stylesheet overrides. No code changes required for theme swaps.

- **FR.05.01** CSS variables: Define all brand colors, typography, spacing in CSS variables (e.g., `--color-primary`, `--font-family-body`, `--spacing-unit`).
- **FR.05.02** Tailwind integration: Use Tailwind's `theme` config to map CSS variables; allow custom theme files to override.
- **FR.05.03** Theme stylesheet: Default theme in `public/theme-default.css`; custom themes in `public/theme-{name}.css`. Load via `<link>` tag or via config.
- **FR.05.04** Admin or config: Admin users (or config file) can select active theme. If config-driven, restart app; if admin-driven, swap stylesheet dynamically.
- **FR.05.05** Out-of-box themes: Provide light and dark themes as examples.

### FRx06: Dashboard & Settings Scaffolds

**What it does:** Pre-built pages and placeholder components so new products don't start from zero.

- **FR.06.01** Dashboard page: `/dashboard` — shows user info, recent activity placeholder, quick-stats placeholder. Structured for easy customization.
- **FR.06.02** Settings section: navigation groups account configuration under Settings and currently contains Preferences, with room for additional settings pages later.
- **FR.06.03** Preferences page: `/preferences` — form for profile preferences including name and company. Saves to database and is protected by server-side session validation.
- **FR.06.04** Layout consistency: All pages use AppShell (sidebar + header + main content area). Navigation breadcrumbs optional but recommended.

### FRx07: Security & Encryption

**What it does:** Encryption enforced for data in transit and at rest. No user data export or deletion flows in Phase 1.

- **FR.07.01** Encryption in transit: All communication between web app and BFF uses TLS (HTTPS in production). Enforce via Helmet headers and certificate configuration.
- **FR.07.02** Encryption at rest: Database encryption configured at PostgreSQL level (e.g., pgcrypto for sensitive columns, or full-disk encryption in production).

### FRx08: Deployment, Database, & Testing Scripts

**What it does:** Foundation is deployable to both Docker Compose (local dev) and Kubernetes (production). Scripts provided for packaging, deployment, database management, seeding, and smoke testing.

- **FR.08.01** Docker Compose: `docker-compose.yml` defines services for web app, BFF, PostgreSQL. `docker-compose up` starts all three locally.
- **FR.08.02** Docker images: Dockerfile for web app (Node.js multi-stage build) and BFF (Node.js multi-stage build). Images pushed to registry or run locally.
- **FR.08.03** Kubernetes manifests: Deployment files for web pod, BFF pod, PostgreSQL (or external DB). Service + Ingress for routing.
- **FR.08.04** Database backup & restore scripts: `scripts/backup.sh` and `scripts/restore.sh` handle PostgreSQL backups (local dev + production). Store backups in versioned directory or S3.
- **FR.08.05** Seed data script: `scripts/seed.js` (or Prisma seeding) populates database with sample users, roles, modules, and mappings for testing.
- **FR.08.06** Smoke tests: Post-deployment validation:
  - Health check endpoint responds (`/health` on BFF).
  - Login page loads.
  - Authenticated API calls succeed (e.g., fetch user data).
  - Database connectivity confirmed.
  - Tests written in Playwright or simple shell scripts; run as post-deployment step.
- **FR.08.07** Deployment documentation: README or inline comments explain how to:
  - Build and push Docker images.
  - Deploy to Kubernetes (kubectl apply).
  - Seed database.
  - Run database backup/restore.
  - Run smoke tests.
  - Scale horizontally (if applicable).

---

## Non-Functional Requirements

### Performance

- **Page load time:** Initial dashboard load < 2 seconds on 4G network (optimized images, code splitting, caching).
- **API response time:** BFF endpoints respond in < 200ms under normal load (optimized queries, connection pooling).
- **Database query time:** All queries (auth, role lookup, module fetching) < 50ms (indexed appropriately).

### Security

- **Password hashing:** bcryptjs with salt rounds ≥ 10.
- **Session tokens:** JWT, signed with NEXTAUTH_SECRET, HTTP-only cookie.
- **CORS:** BFF restricts to WEB_APP_URL; credentials: true.
- **Helmet:** System enforces security headers (CSP, X-Frame-Options, etc.).
- **TLS in transit:** All web↔BFF communication encrypted.
- **SQL injection prevention:** Prisma parameterized queries (no string interpolation).
- **CSRF protection:** NextAuth CSRF tokens built-in.

### Scalability

- **Stateless design:** Web app and BFF are stateless; sessions stored in database or JWT (no server-side sessions).
- **Database:** Supports connection pooling (via Prisma or Postgres connection pool).
- **Horizontal scaling:** Can run multiple web and BFF replicas behind load balancer.
- **Caching:** Optional Redis for session caching (not required Phase 1, but architecture allows it).

### Compliance

- **Data encryption:** At-rest and in-transit as per FRx07 (TLS enforced, PostgreSQL encryption configured).
- **Privacy policy:** Not in scope (link to placeholder); update before production.

### Availability & Reliability

- **Health check:** `/health` endpoint on BFF (status, timestamp).
- **Graceful degradation:** If BFF is slow, web app shows error (does not hang).
- **Database backups:** Operator responsibility (outside foundation scope); document in README.
- **Logging:** Morgan logs all HTTP requests; errors logged to console (can integrate with external logging later).

---

## User Journeys

### Journey 1: New User Registration & First Login

**Protagonist:** Alex, solo founder building a small CRM app.

1. Alex visits foundation domain, clicks "Sign Up."
2. Sees three options: Email/Password, Google, GitHub.
3. Chooses Email/Password; enters email, password, name, company.
4. Account created; redirected to login (or auto-logged in).
5. Sees dashboard with sidebar menu (left or top, depending on config).
6. Opens Settings → Preferences, updates profile preferences, and saves.
7. Returns to dashboard.

### Journey 2: Admin User Configures Access Control

**Protagonist:** Pat, the admin for a team app built on the foundation.

1. Pat logs in with admin role.
2. Navigates to `/admin`.
3. Sees "Roles" tab; clicks "Create Role."
4. Creates role "Sales Manager" with description "Can access CRM and Reporting."
5. Clicks "Module Mapping"; selects "CRM" module and "Reporting" sub-module.
6. Saves role.
7. Goes to "Users" tab; searches for "Jordan."
8. Assigns Jordan to "Sales Manager" role (+ existing "User" role).
9. Jordan logs out and back in; dashboard now shows only CRM and Reporting modules.

### Journey 3: User Resets Forgotten Password

**Protagonist:** Morgan, user who forgot password.

1. Morgan visits login page; clicks "Forgot Password?"
2. Enters email; receives reset link via email.
3. Clicks link; sees "Reset Password" form.
4. Enters new password; submits.
5. Redirected to login; logs in with new password.

---

## Success Criteria (Phase 1 Completion)

✓ **All features (FRx01–FRx08) implemented and functional**
✓ **Architecture validated:** BFF pattern proven; containerized deployment working
✓ **Core auth flows tested:** All three providers + password reset working
✓ **Menu system working:** Both layouts (left + top) switchable; admin can map roles to modules
✓ **Admin panel functional:** CRUD for roles, users, role-module mappings
✓ **Themeable styling in place:** At least two themes provided; CSS variables system documented
✓ **Deployment tested:** Docker Compose deployment successful; Kubernetes deployment successful
✓ **Smoke tests passing:** Post-deployment validation confirms all core flows work
✓ **Security validated:** HTTPS/TLS enforced; bcrypt passwords; JWT sessions; CORS restricted
✓ **GDPR compliant:** Data export and deletion working; encryption in transit enforced
✓ **Foundation ready for external use:** Open-sourced on GitHub; README covers setup, deployment, customization

---

## Out of Scope (Phase 1)

- **Advanced features:** Multi-tenancy, audit logs, webhooks, API versioning
- **Real product builds:** Apps built *on* the foundation are separate projects
- **Exhaustive test coverage:** Smoke tests + deployment validation; full unit/integration/e2e testing added by products
- **Visual polish:** Functional design; professional enough for a reference implementation
- **Production documentation:** README + inline comments suffice; comprehensive docs in Phase 2
- **Monitoring & alerting:** Logging via Morgan; external monitoring (Datadog, etc.) operator responsibility

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Solo build pace may slip | Keep feature scope tight (all Phase 1 features are MVP); cut nice-to-haves ruthlessly. |
| Kubernetes deployment complexity | Use standard manifests; test early and often. Provide working YAML as reference. |
| Role-module mapping grows complex | Start simple (flat module list); add nested permissions only if needed. |
| Database schema changes mid-build | Use Prisma migrations; test migrations locally before applying. |
| Security compliance becomes blocker | GDPR compliance baked in from Day 1 (export, delete, TLS). No post-launch bolting-on. |

---

## Success Metrics

- **Deployment:** Docker Compose + Kubernetes deployments both successful; smoke tests pass.
- **Feature completeness:** All FRx01–FRx08 features implemented and working end-to-end.
- **Security:** TLS enforced; password hashing validated; CORS restricted; no unencrypted data in transit.
- **Usability:** Admin panel intuitive; menu layout switchable without code changes; themes easy to customize.
- **Extensibility:** Code modular enough that apps built on foundation can customize without hacks.

---

## Open Questions & Assumptions

- [ASSUMPTION] Prisma migrations handled locally by developer; no automated migration tooling required at deploy time.
- [ASSUMPTION] Database backup/restore scripts included in foundation (see FR.08.04); operator runs manually or via cron.
- [ASSUMPTION] Email sending (password reset + activation) uses Google free provider (nodemailer + Gmail SMTP); operator configures sender email + app-specific password via env var.
- [ASSUMPTION] Kubernetes cluster provided by operator (e.g., local Kind, AWS EKS, DigitalOcean); foundation provides manifests only.
- [ASSUMPTION] Docker images pushed to registry (e.g., Docker Hub, ECR) by developer; K8s pulls from there.
- [ASSUMPTION] Monitoring and alerting (metrics, logs, traces) outside foundation scope; foundation logs via Morgan and console.
- [DECISION] Session storage strategy: JWT only (no Redis cache for invalidation).

**Technical implementation details (request timeouts, connection pooling, architecture patterns) are documented in the Addendum.**
