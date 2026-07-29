---
title: Architecture Discussion Guide
status: draft
created: 2026-07-09
updated: 2026-07-09
project: saas_monorepo
---

# SaaS Foundation Architecture — Discussion & Rationale

This guide explains the thinking behind each major decision, what trade-offs were made, and where we could have gone differently.

---

## Why Monorepo BFF?

### The Choice

We're using a **monorepo** (npm workspaces) with **separate web and BFF services** that communicate via HTTP. The alternative would be:

1. **Monolithic:** Single Next.js app, all logic embedded in API routes. Simpler initially, but hard to scale BFF independently, couples auth to business logic, encourages tight coupling.
2. **Separate repos:** Each service has its own git repo. Decoupled, but operational overhead (multiple repos to clone, CI/CD for each), harder to share types, solo-dev friction.
3. **Monorepo BFF (chosen):** One repo, two deployable services sharing types. Best of both: easy to iterate locally (one clone), clear separation (web ≠ BFF), scalable independently.

### Why This Fits

- **Solo developer:** You can clone once, see both services in one editor.
- **Future teams:** Clear boundaries make it easier for new people to own web or BFF independently.
- **Type safety:** Shared `packages/shared-types` means the API contract is compile-time verified, not runtime-discovered.
- **Scaling:** If BFF gets hammered, you spin up more BFF replicas behind a load balancer; web app stays lean.

### What It Costs

- Must maintain two separate services (two `package.json` scripts, two deployment artifacts).
- Requires BFF to be callable from web (network latency, timeouts become real).
- Adds operational complexity (two processes to monitor in production).

For Phase 1, this is worth the cost because it proves the BFF pattern works *before* you build real products on top.

---

## Authentication: Why Embedded NextAuth?

### The Choice

Authentication lives in **NextAuth embedded routes** (`/api/auth/[...nextauth]`), not in the BFF. The alternatives:

1. **BFF owns auth:** BFF has `/api/auth/login`, web calls it. More RESTful, but web and BFF must coordinate on session format.
2. **Third-party (Auth0, Cognito):** Outsource auth entirely. No code to maintain, but adds external dependency, vendor lock-in, compliance overhead.
3. **Embedded NextAuth (chosen):** NextAuth in Next.js is battle-tested, gives you JWT + cookies + multi-provider + CSRF protection out of the box. Web app naturally owns user context.

### Why This Fits

- **Simplicity:** NextAuth + Next.js = native pairing. Zero boilerplate for OAuth flows.
- **Security:** HttpOnly cookies, CSRF tokens, JWT signing all built-in and well-tested.
- **Multi-provider:** Email/password, Google, GitHub all work with minimal config.
- **Clear boundary:** Web app is the auth gatekeeper; BFF trusts web app to validate sessions.

### What It Costs

- Auth logic is tightly bound to Next.js. If you ever want to move auth to a separate service, you'll refactor.
- BFF can't validate sessions independently; it trusts web app. If web app is compromised, auth is compromised.

For Phase 1, the tradeoff is acceptable because auth is stable and we're optimizing for solo-dev speed.

### Registration Flow Trade-off: Why Token-Based Activation?

The email/password registration flow is: **register → activation email → click link → password reset page → account active → login**.

This is slightly more complex than "register + immediate login," but it:
- Validates email ownership (user must have email access).
- Follows security best practice (don't trust email entered in a form).
- Aligns with password reset flow (familiar UX).

Alternative: Immediate registration without email verification. Simpler, but weaker security and no proof of email ownership.

---

## Session Storage: Why JWT-Only (No Redis)?

### The Choice

Sessions are **JWT tokens** stored in HttpOnly cookies, **no Redis cache for invalidation**. The alternatives:

1. **JWT only (chosen):** Token is self-contained, no server state. Valid for 30 days then expires.
2. **JWT + Redis blacklist:** When user logs out, token goes into a blacklist. BFF checks blacklist on every request. Enables immediate revocation but adds Redis as a dependency.
3. **Server-side sessions (database):** Every session stored in DB. Full control over revocation, but kills horizontal scaling (every BFF instance must access the same session store).

### Why This Fits

- **No Redis dependency:** Simpler deployment, no cache to manage, fewer failure modes.
- **Horizontal scaling:** Stateless tokens = any BFF instance can validate. No session affinity required.
- **Solo-dev:** JWT expires automatically; no cleanup overhead.

### What It Costs

- **No immediate logout:** Token remains valid until expiry (30 days). If a user's account is compromised, the token is still good for 30 days.
- **Revocation requires Phase 2 work:** If Phase 1 use cases need immediate logout (e.g., account ban), we'll add a blacklist DB table in Phase 2.

### When This Trade-off Breaks

For internal SaaS (Phase 1 focus), 30-day tokens are acceptable. If you're building a high-security multi-tenant app with immediate logout requirements, JWT + blacklist (Phase 2) becomes critical.

---

## Database: Why Prisma + PostgreSQL?

### The Choice

We're using **Prisma 6.19.2 ORM + PostgreSQL 18**, locked in by existing code. Why not:

1. **Raw SQL:** Full control, but loses type safety and easy migrations.
2. **TypeORM:** Type-safe ORM for TypeScript, similar to Prisma, but Prisma is more popular and has better Next.js integration.
3. **Serverless databases (DynamoDB, Firebase):** No schema management, auto-scaling, but vendor lock-in and limited query flexibility.

### Why Prisma Fits

- **Type-safe:** Prisma schema generates TypeScript types automatically. Single source of truth.
- **Migrations:** `prisma migrate` handles schema versioning. Easy rollback.
- **Build-time code generation:** No runtime ORM magic; clean performance.

### Scaling Implications

- Prisma works with any SQL database (PostgreSQL, MySQL, SQL Server, SQLite).
- Connection pooling (10 connections) is configured in the connection string.
- If you outgrow a single Postgres instance, you can replicate to read replicas or shard without changing Prisma code.

---

## Role-Based Access: Why Two-Level Module Nesting?

### The Choice

Modules can have sub-modules (e.g., "CRM" → "Dashboard", "Contacts", "Leads"). That's two levels. Why not more?

1. **Flat list:** All modules at one level. Simpler, but menu grows unwieldy (50+ modules are hard to navigate).
2. **Two-level (chosen):** Modules + sub-modules. Good balance between structure and admin complexity.
3. **N-level tree:** Arbitrary nesting (modules → sub-modules → sub-sub-modules...). Maximum flexibility, but role-mapping UI becomes complex ("which levels does this role have access to?").

### Why Two-Level Fits

- **Menu UX:** Left sidebar can expand modules to show subs; top menu can hover to show subs. Both work well.
- **Admin panel CRUD:** Simple: select role → check modules/subs you want → save. No recursive dialogs.
- **Permission model:** Clear: a role either can or can't access a module/sub-module. Binary.

### What It Costs

- If you need deeper nesting (modules → subs → sub-subs → ...), it becomes a Phase 2 project.
- Admin panel would need a tree picker, not just checkboxes.

### When This Trade-off Breaks

If you're building an enterprise system with 10+ levels of organizational hierarchy, two levels isn't enough. But for "a SaaS foundation," it's right-sized for Phase 1.

---

## Menu Layout: Why Config-Driven (Not Dynamic)?

### The Choice

Menu layout (left sidebar vs. top horizontal) is determined at **app startup** via a config flag (env var or config file). The alternative:

1. **Config-driven (chosen):** Theme and layout are immutable during a session. Restart app to change.
2. **Admin panel dynamic:** Admins can change layout live via UI, stylesheet swaps in the browser.
3. **Per-user preference:** Each user chooses layout in settings, persists in DB.

### Why Config-Driven Fits

- **Simplicity:** No state management. Layout is read at startup, rendered consistently.
- **No session state:** Aligns with stateless design (JWT-only, no Redis).
- **Easier code:** AppShell component picks layout based on env, renders it. No client-side switching.

### What It Costs

- Layout changes require restart. Not ideal for real-time theme switching.
- Per-user customization would require DB storage (Phase 2).

### Why Not Per-User Preference?

Per-user layout preferences are tempting ("each team member picks left or top menu"), but:
- Adds DB queries on every page load.
- Complicates settings UI.
- Can wait for Phase 2 without blocking foundation launch.

---

## Themes: Why CSS Variables + Config-Driven?

### The Choice

Themes are configured at startup via CSS variables (e.g., `--color-primary`), mapped to Tailwind config. The alternative:

1. **CSS-in-JS (styled-components):** Fully dynamic, can change at runtime, but adds package complexity.
2. **Tailwind + CSS variables (chosen):** Matches your stack (Tailwind), simple override, config-driven.
3. **Pre-built theme libraries (Chakra UI):** Pre-styled components, but adds another opinion and package.

### Why CSS Variables + Tailwind Fit

- **Tailwind is already in your stack:** Adding CSS variables is natural.
- **Minimal config:** Just set `theme: { colors: { primary: 'var(--color-primary)' } }` in Tailwind config.
- **Easy to customize:** Users can create `public/theme-custom.css` with their own variables.

### What It Costs

- Theme changes require app restart (not live-reloadable during session).
- If you want dynamic themes, Phase 2 adds JavaScript to swap stylesheets.

### When This Trade-off Breaks

For a public-facing SaaS with user-facing theming ("let me customize my workspace colors"), dynamic themes are essential. For an internal foundation, config-driven is fine.

---

## BFF as Private Service: Security Model

### The Assumption

BFF is **not publicly routable.** Only the web app can call it. This assumes:

1. **VPC/private network:** In production, BFF is in a private subnet, web app is in a public subnet, they communicate over private network.
2. **Dev:** Both run on localhost, communication is over loopback.

### Why This Works

- **Auth boundary:** Web app validates user session. BFF doesn't need to re-validate; it trusts web app.
- **No direct API exposure:** If BFF had a public IP, you'd need API authentication (API keys, OAuth, etc.), which complicates both BFF and clients.
- **Simplified CORS:** Instead of wildcard CORS or complex origin lists, BFF's CORS is just web app's origin.

### What It Costs

- **Operational complexity:** You must ensure VPC/network isolation. Misconfiguration could expose BFF.
- **Debugging:** Harder to test BFF directly (no public endpoint). Requires going through web app or careful network setup.

### When This Model Breaks

If you want external clients (mobile app, partner integrations) calling BFF directly, this model doesn't scale. You'd need to:
1. Expose BFF publicly (with API authentication).
2. Move auth to BFF or add API key validation.
3. Handle CORS for many origins.

That's a Phase 2 conversation.

---

## Deployment: Docker Compose + Generic Kubernetes Manifests

### The Strategy

We provide:
1. **Docker Compose:** For local development (`docker-compose up`).
2. **Generic Kubernetes manifests:** Not provider-specific (no AWS EKS CloudFormation, no GCP operators). Apply with `kubectl apply -f`.

### Why This Fits

- **Provider-agnostic:** Same manifests work on Kind, EKS, DigitalOcean, self-hosted, etc.
- **Learn Kubernetes:** If you're new to K8s, generic manifests teach you the API without AWS/GCP magic.
- **Future flexibility:** You can choose where to deploy after Phase 1.

### What It Costs

- **Less optimization:** Generic manifests don't use provider-specific features (e.g., AWS RDS, Load Balancer, Auto Scaling).
- **Your responsibility:** Database backup, ingress, cert management, node autoscaling — you set those up.

### The Trade-off

We're optimizing for **portability** over **out-of-the-box production readiness.** Phase 1 proves the foundation works; Phase 2 can optimize for your chosen cloud provider.

---

## Open Questions & Revisit Conditions

### 1. Token Revocation (Deferred)

**Issue:** JWT tokens are valid for 30 days. If a user is banned or account is compromised, you can't immediately revoke access.

**Revisit if:** Users report "I logged out but my session is still valid" or you need to ban users immediately.

**Solution:** Add `blacklist_tokens` DB table, BFF checks it on each request. Adds latency and state, but enables immediate revocation.

---

### 2. Audit Logging (Deferred)

**Current:** Admin changes logged to console. No persistent audit trail.

**Revisit if:** Compliance requires audit logs (who changed what, when) or you need to track admin abuse.

**Solution:** Create `audit_log` table, log all admin actions, provide query interface in admin panel.

---

### 3. Multi-Tenancy (Deferred)

**Current:** Foundation assumes single-tenant (one database, all users share data).

**Revisit if:** You want to run multiple organizations in one deployment or offer multi-tenant SaaS.

**Solution:** Add `organization_id` to Customer and all data tables, filter queries by org, isolate data at query layer.

---

### 4. API Versioning (Deferred)

**Current:** BFF routes have no version (e.g., `/api/customers`, not `/api/v1/customers`).

**Revisit if:** You need to make breaking changes while keeping old clients working.

**Solution:** Add version prefix to routes, maintain multiple versions in parallel.

---

### 5. Webhooks & Event Streaming (Deferred)

**Current:** No webhooks or event bus.

**Revisit if:** External systems need real-time updates (e.g., "when a task is created, notify Slack").

**Solution:** Add event emitter (local event bus or message queue like RabbitMQ), publish/subscribe handlers.

---

## Implementation Readiness Checklist

Before you start building:

- [ ] Monorepo structure confirmed (apps/web, apps/bff, packages/shared-types).
- [ ] NextAuth configured with three providers (email/pwd, Google, GitHub).
- [ ] Prisma schema defines: Customer, Task, Role, Module, SubModule, RoleModule, UserRole.
- [ ] BFF routes stubbed: `/health`, `/api/customers`, `/api/tasks`, `/api/dashboard`.
- [ ] Web app pages stubbed: `/login`, `/register`, `/dashboard`, `/admin`, `/preferences`, `/settings`.
- [ ] Shared-types exports: Customer, Task, Role, User, ApiResponse<T>.
- [ ] Docker Compose working: `docker-compose up` starts web, bff, postgres.
- [ ] Smoke tests written: health check, login, API calls.
- [ ] Database backup/restore scripts: `scripts/backup.sh`, `scripts/restore.sh`.

---

## Code Review Touchpoints

When reviewing code against this spine:

1. **Shared types:** Are all API responses wrapped in ApiResponse<T>? Are types shared, not duplicated?
2. **Auth boundary:** Are BFF routes assuming web app has validated the session? No auth checks in BFF?
3. **Menu rendering:** Does AppShell pick layout from config? Are only accessible modules rendered?
4. **Admin role check:** Is `/admin` checking for `admin` role before rendering?
5. **Timeouts & pooling:** Are Prisma and Express configured with the locked timeouts?
6. **Two-level nesting:** Are modules and sub-modules being treated as two levels (no N-deep recursion)?
7. **Config-driven layout & theme:** Is layout/theme read at startup, not dynamic?

---

## Summary

This architecture is:
- **Simple:** Monorepo + BFF + shared types = easy to understand and debug.
- **Scalable:** Stateless services, connection pooling, horizontal deployment ready.
- **Secure:** Auth in web app, BFF private, TLS in transit, encryption at rest, timeouts configured.
- **Solo-dev friendly:** One repo, shared tooling, no external dependencies (Redis, message queue).
- **Future-proof:** Deferred decisions can be revisited in Phase 2 without breaking Phase 1 foundation.

The trade-offs prioritize **Phase 1 launch speed** over **Phase 2 complexity.** As you build real products on this foundation, you'll identify what needs to evolve.

