---
title: SaaS Foundation - Project Context
status: in-progress
created: 2026-07-09
updated: 2026-07-09
sections_completed: []
---

# Project Context: SaaS Foundation Monorepo

This document captures the critical implementation rules, patterns, and conventions that AI agents must follow when working on this codebase.

## Agent Scan Boundaries

AI agents must not recursively scan, index, summarize, grep, or load files from dependency, generated, cache, virtual environment, or agent-runtime folders unless the user explicitly asks for one of those folders by name.

Default excluded paths:
- `node_modules/`
- `apps/*/node_modules/`
- `.venv/`
- `.git/`
- `_bmad/`
- `_bmad-ui/`
- `_bmad-output/`
- `.agents/`
- `.claude/`
- `.opencode/`
- `graphify-out/`
- `dist/`
- `build/`
- `coverage/`
- `reports/`

Agents may read a specific known file inside an excluded folder when the task directly concerns that file, for example a named BMad artifact or a named bmad-ui source file. Do not broaden that into recursive scans of excluded folders.

## Technology Stack & Versions

**Monorepo:** npm workspaces with strict TypeScript across all packages

### Core Technologies
- **Next.js** 16.1.6 (frontend, App Router, React Server Components)
- **React** 18.2.0 with TypeScript strict mode
- **Express.js** 4.18.2 (BFF backend-for-frontend)
- **TypeScript** 5.3.3 (all apps and packages)
- **Prisma** 6.19.2 ORM (PostgreSQL adapter 7.3.0)
- **PostgreSQL** 18 (database)
- **NextAuth** 4.24.5 (JWT + multi-provider auth)
- **Tailwind CSS** 3.4.0 + PostCSS 8.4.32
- **Testing:** Vitest 4.0.18 (unit/integration), Playwright 1.58.2 (e2e)
- **Dev Tools:** tsx 4.7.0 (Node dev runner), concurrently for parallel dev

### Key Dependencies
- **Auth:** bcryptjs 3.0.3, nodemailer 7.0.13
- **HTTP:** CORS 2.8.5, Helmet 7.1.0 (BFF security)
- **Logging:** Morgan 1.10.0 (BFF request logging)
- **Database:** pg 8.18.0 (Postgres client for BFF)
- **Testing:** Testing Library (React 16.3.2), MSW 2.12.10 (API mocking), Supertest 7.2.2

## Project Structure

```
saas_monorepo/
├── apps/web               # Next.js frontend (port 3000)
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components (both client & server)
│   │   ├── lib/           # Utilities (auth, prisma client, etc.)
│   │   └── tests/         # Unit, integration, e2e tests
│   ├── prisma/            # Prisma schema and migrations
│   └── package.json
├── apps/bff               # Express BFF (port 3001)
│   ├── src/
│   │   ├── index.ts       # Server setup, middleware, routes
│   │   ├── routes/        # Express routers
│   │   └── tests/         # Unit, integration tests
│   └── package.json
├── packages/shared-types  # Shared TypeScript interfaces
├── package.json           # Root monorepo config
└── tsconfig.json          # Base TypeScript config
```

## Critical Language-Specific Rules (TypeScript)

### Strict Mode & Type Safety
- **All files must compile with `strict: true`** — no `any` types except unavoidable third-party integrations
- **Prefer interfaces over types** for public APIs; use types for internal utilities
- **Always type React props** with explicit interfaces; never use implicit `any`
- **Async/await preferred over Promise chains** — use try/catch for error handling
- **Error handling rule:** Catch errors explicitly, never swallow exceptions silently

### Import/Export Conventions
- **Web app:** Use `@/` path alias for internal imports (maps to `apps/web/src/`)
- **Shared types:** Import from `@saas/shared-types` package
- **BFF:** Use relative imports within `src/` (no path aliases)
- **ESM syntax throughout:** Use `import`/`export`, never `require()` except in BFF CommonJS builds

### Null/Undefined Handling
- **Default parameters over `||` operator** — use `??` for nullish coalescing only when needed
- **Type guards required for optional properties** — check `value !== undefined` before use
- **Never assume session/auth state** — always validate against `null` in protected code

## Framework-Specific Rules

### React & Next.js (Web App)

#### Server vs Client Components
- **Pages & layouts default to Server Components** — mark with `'use client'` only when needed (hooks, event handlers)
- **Client components:** Use `'use client'` at top of file; do not nest multiple layers of client boundaries
- **Avoid `useEffect` for data fetching** — use Server Components or API routes instead

#### NextAuth Integration
- **Protected pages check session:** Use `getServerSession(authOptions)` in Server Components or API routes
- **Multi-provider auth flow:**
  - Email/password: Direct credentials (bcrypt-hashed)
  - Google/GitHub: Requires `registrationIntent` cookie before account creation (prevents account linkage)
- **Session expiry:** 30-day JWT expiry; configure in `auth-options.ts`
- **Callback URLs:** Always redirect to same-origin paths (`/dashboard`, not external URLs)

#### Component Patterns
- **Page components:** Accept params and searchParams, no other props
- **Layout components:** Wrap children with AppShell (sidebar + header + main)
- **Reusable components:** Accept explicit props, no global state except auth via context
- **Icon components:** Use inline SVG with stroke-based icons (see AppShell.tsx for patterns)

#### State Management
- **React Context for auth only** — no Redux/Zustand
- **Component-level state for UI toggles** (expanded menus, modals, etc.)
- **No client-side data fetching in components** — move to Server Components or API routes

### Express BFF (Backend)

#### Middleware Stack Order
1. Helmet (security headers)
2. Morgan (request logging)
3. express.json() (body parsing)
4. CORS (cross-origin allow-list)
5. Route handlers
6. 404 handler
7. Error handler (last, catches all)

#### Route Patterns
- **GET endpoints:** Return data wrapped in response object: `{ success: true, data: {...} }`
- **Errors:** Return `{ success: false, error: "message" }` with appropriate status code
- **Error handler pattern:** Catch errors in route, log to console, return `500` with dev-friendly message if `NODE_ENV === 'development'`
- **CORS config:** Restrict to `WEB_APP_URL` env var (default: `http://localhost:3000`); always set `credentials: true`

#### Type Safety
- **Type all route handlers:** `(req: Request, res: Response) => void`
- **Use NextFunction for middleware:** `(err: Error, req: Request, res: Response, next: NextFunction) => void`
- **Never use implicit `any`** on request/response objects

### Prisma & Database

#### Schema Conventions
- **Model names:** PascalCase (e.g., `Customer`, `Task`)
- **Field names:** camelCase in TypeScript, snake_case in database with `@map("snake_case")`
- **Enums:** PascalCase with UPPERCASE values (e.g., `enum RegistrationType { GOOGLE, GITHUB, DIRECT }`)
- **Timestamps:** Use `DateTime` type; defaults to `now()` for `createdAt`, explicit mutation for `updatedAt`

#### Migration Workflow
- **Schema changes:** Edit `apps/web/prisma/schema.prisma`
- **Generate migration:** `npx prisma migrate dev --name migration_name`
- **Apply to production:** `npx prisma migrate deploy`
- **Regenerate client:** `npm run build --workspace=packages/shared-types` after schema changes

#### Relationships
- **One-to-many:** Use foreign key with `@relation` on the "many" side
- **Many-to-many:** Use implicit join table (Prisma manages automatically) or explicit model if attributes needed
- **Cascading deletes:** Explicitly set `onDelete: Cascade` if required; default is `Restrict`

## Testing Rules

### Test Organization
- **File naming:** `*.unit.test.ts(x)` for unit tests, `*.integration.test.ts(x)` for integration tests
- **Location:** Co-locate tests in `src/tests/{unit,integration}/` directory or inline with source
- **Vitest config:** jsdom environment for React tests, node for BFF tests

### Test Boundaries
- **Unit tests:** Test pure functions, React components in isolation (mock API calls via MSW)
- **Integration tests:** Test API endpoints + database interactions; use real or seeded database
- **E2E tests (web only):** Test full user journeys via Playwright; run against dev server

### Mock Patterns
- **API mocking:** Use MSW (Mock Service Worker) in `src/tests/msw/` for unit/integration tests
- **Database mocking:** Integration tests use real database; use fixtures or seed for test data
- **Component mocks:** Mock child components only if testing parent logic; prefer rendering real children

### Test Coverage
- **Target:** 80%+ coverage for critical paths (auth, data fetching, form handling)
- **No coverage for UI-only components** (pure presentational, no logic)
- **Test error cases** explicitly — each error path must be covered

## Code Quality & Style Rules

### File & Folder Organization
- **Components:** One component per file; export default only
- **Utilities:** Group related functions in `lib/` folders (e.g., `lib/auth/`, `lib/prisma/`)
- **Tests:** Mirror source structure in `tests/` directory
- **Routes (BFF):** One route per file in `src/routes/`; mounted in `index.ts`

### Naming Conventions
- **React components:** PascalCase (e.g., `AppShell.tsx`, `Header.tsx`)
- **Utilities/functions:** camelCase (e.g., `getCurrentUser()`, `hashPassword()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`)
- **Variables:** camelCase; use descriptive names (not `x`, `tmp`, etc.)
- **Boolean variables:** Prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasError`)

### Comments & Documentation
- **No comments for obvious code** — variable names should be self-explanatory
- **Document the WHY, not the WHAT** — explain non-obvious logic or workarounds
- **JSDoc only for public API functions** — include parameter types and return type
- **Inline comments:** Only for complex algorithms or business rule gotchas

### Code Formatting
- **Prettier:** Auto-format on save (configured in monorepo)
- **Line length:** 100 characters (Prettier default)
- **Imports:** Alphabetical within groups (React, third-party, relative)

## Development Workflow Rules

### Branch Naming
- **Feature:** `feature/description` (e.g., `feature/admin-panel`)
- **Bug fix:** `fix/description` (e.g., `fix/auth-token-expiry`)
- **Refactor:** `refactor/description` (e.g., `refactor/menu-config`)
- **Chore:** `chore/description` (e.g., `chore/update-deps`)

### Commit Messages
- **Format:** `<type>: <description>` (lowercase, imperative mood, < 72 characters)
- **Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- **Example:** `feat: add admin panel for role management`
- **Body (optional):** Explain why, not what; reference issue numbers

### Environment Variables
- **Database:** `DATABASE_URL` — PostgreSQL connection string
- **NextAuth secret:** `NEXTAUTH_SECRET` — 32-character random string
- **NextAuth URL:** `NEXTAUTH_URL` — public URL for OAuth callbacks
- **Web app BFF:** `NEXT_PUBLIC_BFF_URL` — BFF origin (default: `http://localhost:3001`)
- **BFF web origin:** `WEB_APP_URL` — CORS origin (default: `http://localhost:3000`)
- **Node env:** `NODE_ENV` — `development`, `production`, or `test`

### Development Commands
```bash
npm run dev           # Start both web and BFF concurrently
npm run dev:web      # Start Next.js on :3000
npm run dev:bff      # Start Express on :3001
npm run build        # Build all apps
npm run type-check   # TypeScript check
npm run test         # Run unit + integration tests
npm test:e2e         # Run e2e tests (headed)
npm run test:all     # All tests (unit + integration + e2e)
```

## Critical Don't-Miss Rules (Anti-Patterns)

### Security Gotchas
- **Never log passwords or tokens** — redact before console.log or error reporting
- **Never store sensitive data in browser localStorage** — session tokens in HTTP-only cookies only
- **Validate CORS origin** — always restrict BFF CORS to known web app origins
- **Helmet enforced** — BFF uses Helmet for security headers; never disable
- **NextAuth callbacks must validate** — never trust user input in OAuth callbacks

### Performance Gotchas
- **Avoid N+1 queries** — use Prisma `include()` or `select()` to batch database queries
- **Memoize expensive renders** — wrap components with `useMemo` only if profiler shows re-render cost
- **Image optimization** — use Next.js `Image` component, never raw `<img>` tags
- **CSS-in-JS avoid** — Tailwind only; no styled-components or emotion

### Data Consistency Gotchas
- **Password reset tokens:** Always check expiry and consume (mark used) immediately after reset
- **Session invalidation:** Logout must clear cookie AND invalidate server state
- **Cascading deletes:** Document all Prisma model relationships; test delete operations thoroughly
- **Concurrent updates:** Prisma optimistic locking not used; document any multi-step transactions

### Common Mistakes
- **Forgetting `@map()` in Prisma models** — database names diverge from TypeScript field names without it
- **Missing `@relation()` on foreign keys** — Prisma won't generate correct migrations
- **Using `useState` for server-side data** — fetch in Server Components or API routes instead
- **Hardcoding URLs** — always use env vars for origins, ports, endpoints
- **Not regenerating Prisma client** — after schema changes, you MUST run `prisma generate`

## Configuration Files Reference

| File | Purpose | Key Values |
|------|---------|-----------|
| `tsconfig.json` (root) | Base TS config | `strict: true`, `target: ES2020` |
| `apps/web/tsconfig.json` | Next.js + React config | `jsx: react-jsx`, `@/*` path alias |
| `apps/bff/tsconfig.json` | Express + Node config | `module: commonjs`, `outDir: dist` |
| `apps/web/next.config.js` | Next.js build config | Image optimization, API routes |
| `apps/web/prisma/schema.prisma` | Database schema | Models, enums, migrations |
| `.env` (local) | Local secrets | `DATABASE_URL`, `NEXTAUTH_SECRET` |
