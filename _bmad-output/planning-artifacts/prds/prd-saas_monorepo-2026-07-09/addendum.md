---
title: SaaS Foundation PRD - Addendum
status: final
created: 2026-07-09
updated: 2026-07-09
project: saas_monorepo
---

# Technical Decisions & Implementation Details

## Architecture Decisions

### BFF Request Timeout & Connection Pooling

These are locked implementation patterns for Phase 1 build; inform the architecture design phase.

**HTTP Request Timeouts:**
- **Socket timeout:** 30 seconds (prevents hung connections on slow networks).
- **Request timeout (Helmet):** 60 seconds (max time from request start to response complete).
- **Keep-alive timeout:** 65 seconds (slightly longer than request timeout to allow connection reuse).

**Database Connection Pooling (PostgreSQL via Prisma):**
- **Connection pool size:** 10 connections (suitable for solo build; scale up if needed).
- **Query timeout:** 30 seconds (aborts queries taking > 30s; prevents runaway queries).
- **Idle timeout:** 30 seconds (close idle connections after 30s of inactivity).
- **Configuration:** Set via Prisma connection string env var: `?schema=public&pool_size=10&statement_cache_size=20`

**Express/Node.js HTTP Client (outbound):**
- **Keep-alive:** Enabled with default agent (reduces TCP handshake overhead).
- **Max sockets:** 50 concurrent connections to external services.
- **Request timeout (for BFF→external APIs):** 10 seconds (fast-fail on unresponsive third-party services).

**Applied via:**
- Prisma: `schema.prisma` datasource URL.
- Express middleware: Helmet `requestTimeout` option.
- Axios (if used for external calls): `timeout: 10000`.

These defaults balance responsiveness (solo dev iteration) with production stability (no infinite hangs).

## Open Design Questions for Architecture Phase

These remain unresolved and should be addressed during architecture design:
- Session invalidation strategy (JWT-only means no server-side revocation; confirm OK for Phase 1)
- Module nesting depth (flat vs. hierarchical; start simple, validate with admin panel usage)
- Admin audit logging scope (console vs. database; decide on retention and querying)
- Theme switching mechanism (config-driven restart vs. dynamic stylesheet swap; UX trade-off)
- Database backup strategy for production (local snapshots vs. cloud replication; operator responsibility confirmed)

