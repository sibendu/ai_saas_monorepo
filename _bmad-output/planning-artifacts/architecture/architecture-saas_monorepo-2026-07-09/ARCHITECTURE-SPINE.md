---
title: SaaS Foundation Architecture Spine
status: draft
created: 2026-07-09
updated: 2026-07-09
project: saas_monorepo
phase: 1-foundation-launch
altitude: system-level
---

# SaaS Foundation Architecture Spine

## Paradigm

**Monorepo BFF** — web app owns authentication and presentation; BFF owns business logic and data. Both consume shared types. Services are independent but coordinate through typed contracts.

This paradigm enables:
- Clear separation of concerns (auth ≠ business logic)
- Horizontal scaling of each service independently
- Type-safe communication across service boundaries
- Solo-developer simplicity (monorepo = one repo to clone, shared tooling)

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser / Client                          │
└────────┬──────────────────────────────────────────────────────┘
         │ HTTPS (public)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                Next.js Web App (Port 3000)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Pages (Server & Client Components)                       │  │
│  │  • /login, /register, /dashboard, /preferences           │  │
│  │  • /admin (role-restricted, admin role only)             │  │
│  │  • /settings                                             │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │ NextAuth (Embedded API Routes)                           │  │
│  │  • /api/auth/[...nextauth]                              │  │
│  │  • Session management (JWT, 30-day expiry)              │  │
│  │  • Multi-provider: email/pwd, Google, GitHub            │  │
│  │  • HttpOnly cookies, CSRF protection                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ BFF Client (Server-side Data Fetching)                   │  │
│  │  • Calls BFF for: customers, tasks, dashboard, etc.      │  │
│  │  • Passes user context via headers if needed             │  │
│  └──────────────────┬───────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────┘
                      │ HTTP (private network, TLS in prod)
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│           Express BFF Service (Port 3001, Private)              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes:                                                   │  │
│  │  • GET /health                                           │  │
│  │  • GET /api/customers, /api/tasks, /api/dashboard       │  │
│  │  • PUT /api/tasks/:id, DELETE /api/tasks/:id            │  │
│  │  • Middleware: Helmet (security), Morgan (logging)       │  │
│  │  • CORS restricted to WEB_APP_URL                        │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │ Prisma ORM + PostgreSQL Connection                       │  │
│  │  • Connection pool: 10 connections, 30s query timeout    │  │
│  │  • Schema: Customer, Task, Role, Module, UserRole       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                            │
│                                                                 │
│  Tables:                                                        │
│  • customer (id, email, password, name, company, ...)         │
│  • task (id, taskId, title, project, priority, owner, ...)    │
│  • role (id, name, description)                               │
│  • module (id, label, icon, href)                             │
│  • sub_module (id, moduleId, label, icon, href)               │
│  • role_module (roleId, moduleId, subModuleId)                │
│  • user_role (userId, roleId)                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Shared Types Package (Build-time)                  │
│                                                                 │
│  Exports:                                                       │
│  • Customer, Task, Role, Module, User interfaces              │
│  • ApiResponse<T> wrapper type                                │
│  • HTTP error types                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decisions

### AD-01: Monorepo BFF Paradigm [ADOPTED]

**Binds:** Web app owns auth & UI presentation. BFF owns data fetching and business logic. Both are stateless services consuming shared types.

**Prevents:** Tight coupling of frontend/backend; duplicate type definitions; auth logic drift between services.

**Rule:** No business logic in Next.js pages (beyond orchestration). No shared state between web and BFF except via typed API contracts.

---

### AD-02: Authentication Model [ADOPTED]

**Stack:** NextAuth 4.24.5 (embedded in web app), JWT sessions (30-day expiry), HttpOnly cookies, bcryptjs password hashing.

**Binds:** All user authentication happens in web app embedded routes. BFF trusts web app (no auth layer between them). Multi-provider support: email/password, Google OAuth, GitHub OAuth.

**Prevents:** Duplicate auth logic; credentials exposed in URLs; token compromise via client-side storage.

**Rule:** 
- Registration intent tracked via cookie before OAuth (prevents account linkage).
- Email/password registration sends activation email → password reset page → account unlocked.
- BFF routes check user context via headers if needed (e.g., `X-User-Id`), but trust web app has already validated session.

---

### AD-03: Session Storage Strategy [LOCKED]

**Binds:** Sessions are JWT-only, stateless. No Redis cache for invalidation. Logout clears cookie; token remains valid until expiry (30 days).

**Prevents:** Redis dependency; operational complexity; state machine bugs.

**Trade-off:** Token revocation requires blacklist implementation (deferred to Phase 2). For Phase 1, expiry-based revocation is acceptable for a foundation.

**Rule:** If early logout / immediate revocation becomes critical, add a token blacklist DB table + BFF validation in Phase 2.

---

### AD-04: BFF as Private Service [ADOPTED]

**Binds:** BFF is not publicly routable. Web app is the only client. Communication is HTTP on private network (VPC/private subnet in prod, localhost in dev). CORS restricted to WEB_APP_URL.

**Prevents:** Direct API calls bypassing web app auth; DDoS surface; shared state confusion.

**Rule:** 
- Dev: BFF listens on port 3001, web app fetches from `http://localhost:3001/api/*`.
- Prod: BFF has private IP/hostname; load balancer or VPC peering ensures web app can reach it.
- No public DNS entry for BFF.

---

### AD-05: Shared Types & Single Source of Truth [ADOPTED]

**Stack:** TypeScript `packages/shared-types` exports Customer, Task, Role, Module, User interfaces + ApiResponse<T> wrapper.

**Binds:** Web app and BFF both import from shared-types. No duplicate type definitions. Build-time type checking across services.

**Prevents:** Type divergence between frontend and backend; runtime surprises from schema mismatches.

**Rule:** 
- Prisma schema drives shared types (generate or hand-write, but keep in sync).
- All API responses wrapped in ApiResponse<T>: `{ success: boolean, data?: T, error?: string }`.
- Breaking type changes trigger rebuild of both web and BFF.

---

### AD-06: Database Schema & Role-Based Access [LOCKED]

**Stack:** Prisma 6.19.2, PostgreSQL 18, migrations in `apps/web/prisma/migrations/`.

**Binds:** 
- Users have many roles (many-to-many via `user_role` table).
- Roles have many modules and sub-modules (many-to-many via `role_module` table).
- Modules have sub-modules (one-to-many: module → sub_module).
- On page load, web app fetches user's roles → resolves allowed modules → renders menu.

**Prevents:** Hardcoded permission logic; tight coupling to menu structure; admin panel complexity (all config-driven).

**Rule:**
- Module nesting = two levels max (modules + sub-modules). Deeper nesting deferred.
- Admin panel CRUD: create/edit/delete roles, map roles to modules, assign users to roles.
- Role names and descriptions are the admin-configurable identity.

---

### AD-07: Menu Layout & Configuration [LOCKED]

**Binds:** Two switchable menu layouts:
1. **Left-hand sidebar**: Modules as collapsible tree (click to expand sub-modules). Collapses on mobile.
2. **Top-horizontal**: Modules as menu bar; hover reveals sub-modules in dropdown. Hamburger on small screens.

Layout toggled via config flag (env var or config file). Immutable during session.

**Prevents:** UI logic tightly coupled to one layout; difficult theme switching.

**Rule:**
- Config read at app startup: `MENU_LAYOUT=left | top`.
- AppShell component renders the appropriate layout.
- No client-side switching (restart app to change layout).

---

### AD-08: Themeable Styling [LOCKED]

**Stack:** Tailwind CSS 3.4.0, CSS variables for brand colors/typography/spacing, PostCSS.

**Binds:** All visual properties configurable via CSS variables. Theme switched via config (env var or file). Themes provided: light, dark, and user can add custom.

**Prevents:** Hardcoded colors/fonts; tight coupling to one brand; difficult restyling.

**Rule:**
- CSS variables: `--color-primary`, `--font-family-body`, `--spacing-unit`, etc.
- Tailwind theme mapped to variables: `theme: { colors: { primary: 'var(--color-primary)' } }`.
- Theme stylesheet: `public/theme-{name}.css` loaded at startup.
- No dynamic stylesheet swapping during session (restart to change theme).

---

### AD-09: Admin Panel & Role Management [LOCKED]

**Binds:** 
- Only users with `admin` role can access `/admin`.
- Admin routes: role CRUD, user CRUD, role-module mapping, user-role assignment.
- Audit trail logged (console or DB) for all admin changes.

**Prevents:** Accidental permission escalation; untracked admin actions; scope creep (non-admin users trying to access /admin).

**Rule:**
- Authorization check on page load: `getServerSession()` → verify `admin` role → render page or 403.
- Client-side: hide `/admin` link from non-admin users.
- Server-side: reject any admin request from non-admin session.

---

### AD-10: Deployment Targets [LOCKED]

**Binds:** Foundation provides deployment scripts and manifests for:
1. **Docker Compose** (local dev): `docker-compose.yml` with web, BFF, PostgreSQL services.
2. **Kubernetes** (production): Generic K8s manifests (Deployments, Services, ConfigMaps, Secrets). No provider-specific tooling.

Includes: deployment scripts, seed data scripts, smoke tests, database backup/restore scripts.

**Prevents:** Vendor lock-in; operator confusion on how to deploy.

**Rule:**
- K8s distribution (Kind, EKS, DO, etc.) is user's choice, out of scope for foundation.
- Manifests use standard Kubernetes API (no custom operators or cloud-specific resources).
- Smoke tests verify health check, login page, authenticated API calls, DB connectivity.

---

### AD-11: Security & Encryption [LOCKED]

**Binds:**
- **In-transit:** TLS (HTTPS) enforced between browser and web app. HTTP (private network) between web app and BFF (or TLS if exposed).
- **At-rest:** Database encryption configured at PostgreSQL level (pgcrypto or full-disk encryption).
- **Headers:** Helmet middleware enforces CSP, X-Frame-Options, X-Content-Type-Options, etc.

**Prevents:** Man-in-the-middle attacks; data exposure at rest; XSS/clickjacking.

**Rule:**
- Production: `NEXTAUTH_URL` must be HTTPS. BFF communicates with web via TLS.
- Helmet default configuration active in BFF.
- No sensitive data in logs or error messages (except dev environment).

---

### AD-12: Request Timeouts & Connection Pooling [LOCKED]

**Binds:**
- **HTTP Socket timeout:** 30s (prevents hung connections).
- **HTTP Request timeout (Helmet):** 60s (max time from request start to response complete).
- **Database pool:** 10 connections, 30s query timeout, 30s idle timeout.
- **Outbound HTTP (external APIs):** 10s timeout, 50 max concurrent sockets.

**Prevents:** Runaway requests; connection leaks; database overload.

**Rule:**
- Configured in Prisma connection string: `?pool_size=10&statement_cache_size=20`.
- Express middleware configured: `app.use(helmet({ requestTimeout: 60000 }))`.
- Axios or HTTP client: `{ timeout: 10000 }` for external calls.

---

## Data Model

### Key Entities

| Entity | Relationships | Purpose |
|--------|---------------|---------|
| **Customer** | many UserRoles via User | User account (email, password, name, company, registration type) |
| **Role** | many UserRoles, many RoleModules | Permission container (name, description) |
| **Module** | has many SubModules, many RoleModules | Top-level menu item |
| **SubModule** | belongs to Module, many RoleModules | Menu sub-item (nested under Module) |
| **RoleModule** | belongs to Role, Module, SubModule | Permission mapping (role can access this module/sub-module) |
| **UserRole** | belongs to Customer, Role | Many-to-many: user can have multiple roles |
| **Task** | standalone (simple entity) | Business data (title, project, priority, owner, date) |

### Access Control Rules

1. **User views menu:** Fetch user's roles → resolve role_module rows → extract allowed modules/sub-modules → render only accessible items.
2. **Admin edits roles:** Only `/admin` can be accessed by users with `admin` role. CRUD operations on roles and role-module mappings.
3. **User-role assignment:** One user can have multiple roles. Each role is an independent permission grant.

---

## Deferred Decisions

These are intentionally not locked for Phase 1; revisit post-launch:

- **Token revocation / blacklist:** Currently tokens are valid until expiry. Add blacklist DB table + BFF validation if immediate logout becomes critical.
- **Audit logging depth:** Currently console logs admin changes. Add comprehensive audit table if compliance requires it.
- **Multi-tenancy:** Foundation assumes single-tenant. Multi-tenancy (data isolation, org separation) deferred to Phase 2.
- **Advanced permissions:** Fine-grained ACLs (row-level, field-level) deferred. Currently role-based on modules.
- **API versioning:** No versioning required Phase 1. Add if breaking changes emerge.
- **Webhooks & event streaming:** Out of scope Phase 1. Can add post-launch.

---

## Invariants Summary

| Invariant | Rationale |
|-----------|-----------|
| Web app owns auth, BFF owns logic | Clear separation of concerns |
| Shared types, single source of truth | Type-safe communication |
| BFF is private (not public) | Auth boundary; no API exposure |
| Sessions are stateless JWT | Horizontal scaling; no Redis dependency |
| Two-level menu nesting only | Simpler admin panel, Phase 1 scope |
| Config-driven layout & theme | Immutable during session; no complexity |
| Role-based access on modules | Flexible permissions without hardcoding |
| TLS in transit, encryption at-rest | Security by default |
| Timeouts + pooling configured | Resilience to slow/hung requests |

---

## How Components Will Interact

### User Login Flow

1. Browser visits `/login`.
2. User submits email + password.
3. NextAuth verifies credentials (bcrypt check against Customer table).
4. Success → JWT created → HttpOnly cookie set → redirect to `/dashboard`.
5. On `/dashboard`, `getServerSession()` validates JWT.
6. Web app fetches user's roles via BFF: `GET /api/user/roles`.
7. Resolves allowed modules from `role_module` table.
8. AppShell renders menu with only accessible modules.

### Admin Role Mapping

1. Admin navigates to `/admin`.
2. Checks: user has `admin` role? Yes → render admin panel.
3. Admin clicks "Roles" → sees list of roles from DB.
4. Admin selects "Sales" role → clicks "Edit".
5. Sees modules/sub-modules tree. Checks "CRM" + "Reporting" sub-module.
6. Saves → writes to `role_module` table.
7. Next user with "Sales" role logs in → sees only CRM + Reporting in menu.

### API Call from Web to BFF

1. Web app page needs customer data.
2. Server component calls: `fetch('http://localhost:3001/api/customers')`.
3. BFF receives request, no auth check (trusts web app).
4. Queries Prisma: `prisma.customer.findMany()`.
5. Returns `{ success: true, data: [Customer, ...] }` (ApiResponse<Customer[]>).
6. Web app renders CustomersList component with data.

---

## Deployment Workflow

### Docker Compose (Local)

1. Developer runs: `docker-compose up`.
2. Services start: web (3000), bff (3001), postgres (5432).
3. Seed script runs: creates sample users, roles, modules.
4. Smoke tests verify: health check, login page, API calls.
5. Ready for local development.

### Kubernetes (Production)

1. Developer builds Docker images: `web:v1`, `bff:v1`.
2. Pushes to registry (Docker Hub, ECR, etc.).
3. Applies K8s manifests: `kubectl apply -f manifests/`.
4. Services deployed: web Deployment (replicas=2), bff Deployment (replicas=2), postgres StatefulSet or external DB.
5. Ingress routes external traffic to web service.
6. BFF service remains internal-only (ClusterIP, no Ingress).
7. Smoke tests verify health, login, API calls against deployed app.

---

