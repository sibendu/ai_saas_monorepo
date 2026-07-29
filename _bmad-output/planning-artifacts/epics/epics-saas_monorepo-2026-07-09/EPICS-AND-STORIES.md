---
title: SaaS Foundation — Epics & Stories
status: draft
created: 2026-07-09
updated: 2026-07-12
project: saas_monorepo
phase: 1-foundation-launch
---

# SaaS Foundation — Complete Epics & Stories Breakdown

This document maps all Phase 1 features from the PRD into epics (major units) and stories (dev-sized tasks). Each story tracks its status: **COMPLETED** (links to existing code), **IN_PROGRESS** (partially done), or **TODO** (not started).

---

## Epic 1: Multi-Provider Authentication

**Covers:** FRx01 (Multi-Provider Authentication)  
**ADs:** AD-02 (Authentication Model), AD-03 (Session Storage)  
**Status:** COMPLETED (email/password activation + OAuth done)

### Story 1.1: Implement Email/Password Registration with Activation Email

**Status:** COMPLETED
**Covers:** FR.01.01 (Email/password auth with activation)

**Current Implementation:**
- Registration page: `apps/web/src/app/register/page.tsx`
- API route: `apps/web/src/app/api/register/route.ts`
- Currently: Email registration sends an activation email with a password setup token

**Work Needed:**
- [x] Update registration flow: capture email → send activation email (nodemailer + Gmail provider)
- [x] Activation email template with link to `/reset-password?token=...`
- [x] User clicks link → password reset page → sets password → account activated
- [x] Link validation: token exists, not expired, not used yet
- [x] Test activation email flow end-to-end

**Acceptance Criteria:**
- User registers with email → receives activation email
- Email contains reset link with token
- Clicking link takes user to password reset form
- After password reset, user can log in
- Expired/used tokens show clear error

**Dependencies:** None (standalone)

**Dev Agent Record:**
- Completion Notes: Implemented activation-based email registration using hashed reset tokens, Gmail/nodemailer activation email template, `/reset-password?token=...` support, and no-password email signup UI.
- Validation: `npm.cmd run test` with `NODE_ENV=test`; `npm.cmd run type-check`; `npm.cmd run build:web` with `NODE_ENV=production`; `npm.cmd run test:e2e --workspace=apps/web -- auth-flow.spec.ts --workers=1` with `PLAYWRIGHT_BASE_URL=http://localhost:3002` and `PLAYWRIGHT_WEB_SERVER_COMMAND="npm run start -- -p 3002"`.

**File List:**
- `apps/web/src/lib/activation-registration.ts`
- `apps/web/src/lib/activation-registration.unit.test.ts`
- `apps/web/src/lib/password-reset.ts`
- `apps/web/src/app/api/register/route.ts`
- `apps/web/src/app/api/auth/forgot-password/route.ts`
- `apps/web/src/app/api/auth/reset-password/route.ts`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/reset-password/page.tsx`
- `apps/web/src/app/reset-password/reset-password.integration.test.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/preferences/page.tsx`
- `apps/web/src/tests/e2e/auth-flow.spec.ts`
- `apps/web/playwright.config.ts`

**Change Log:**
- 2026-07-11: Completed Story 1.1 email/password registration with activation email flow and validation coverage.

---

### Story 1.2: Google OAuth Integration

**Status:** COMPLETED  
**Covers:** FR.01.02 (Google OAuth)

**Implementation:**
- `apps/web/src/app/api/auth/[...nextauth]/auth-options.ts` — Google provider configured
- `apps/web/src/app/register/page.tsx` — Google sign-up button
- `apps/web/src/app/login/page.tsx` — Google login button

**Code References:**
- NextAuth Google provider setup
- OAuth flow: redirect to Google consent → callback → create account

**Acceptance Criteria:**
- ✅ User clicks "Sign up with Google"
- ✅ Redirected to Google consent screen
- ✅ After consent, account created with Google email + profile
- ✅ User logged in and redirected to dashboard

---

### Story 1.3: GitHub OAuth Integration

**Status:** COMPLETED  
**Covers:** FR.01.03 (GitHub OAuth)

**Implementation:**
- `apps/web/src/app/api/auth/[...nextauth]/auth-options.ts` — GitHub provider configured
- `apps/web/src/app/register/page.tsx` — GitHub sign-up button
- `apps/web/src/app/login/page.tsx` — GitHub login button

**Code References:**
- NextAuth GitHub provider setup
- OAuth flow mirrors Google

**Acceptance Criteria:**
- ✅ User clicks "Sign up with GitHub"
- ✅ Redirected to GitHub consent screen
- ✅ After consent, account created with GitHub email + profile
- ✅ User logged in and redirected to dashboard

---

### Story 1.4: Registration Intent Cookie (Prevent Account Linkage)

**Status:** COMPLETED  
**Covers:** FR.01.04 (Registration intent tracking)

**Implementation:**
- `apps/web/src/app/api/auth/social-register-intent/route.ts` — Sets cookie before OAuth

**Code References:**
- Cookie set on `/api/auth/social-register-intent` (POST)
- Prevents users from signing up with Google then logging in with GitHub

**Acceptance Criteria:**
- ✅ Cookie set before OAuth redirect
- ✅ User can't mix OAuth providers on same email
- ✅ Clear error if attempting to use different provider

---

### Story 1.5: Session Management (JWT, 30-day Expiry, HttpOnly Cookies)

**Status:** COMPLETED  
**Covers:** FR.01.05 (Session management)

**Implementation:**
- `apps/web/src/app/api/auth/[...nextauth]/auth-options.ts` — JWT strategy configured
- Session expiry: 30 days (configured in NextAuth)
- HttpOnly cookies enforced

**Code References:**
- NextAuth JWT strategy
- Cookie settings: httpOnly: true, secure (prod), sameSite: strict

**Acceptance Criteria:**
- ✅ User logs in → JWT created
- ✅ Cookie set as HttpOnly (not accessible to JavaScript)
- ✅ Session valid for 30 days
- ✅ After 30 days, session expires → user redirected to login

---

### Story 1.6: Protected Routes (Session Validation)

**Status:** COMPLETED  
**Covers:** FR.01.06 (Protected routes)

**Implementation:**
- All protected pages use `getServerSession(authOptions)` to validate session
- Pages: `dashboard`, `customers`, `tasks`, `preferences`
- Unauthorized access redirects to `/login`

**Code References:**
- `apps/web/src/app/dashboard/page.tsx` — getServerSession check
- `apps/web/src/app/customers/page.tsx` — getServerSession check
- `apps/web/src/app/preferences/page.tsx` — requireAuthenticatedSession check before preferences data loading
- Middleware/layout patterns

**Acceptance Criteria:**
- ✅ Protected pages require valid session
- ✅ No session → redirect to login
- ✅ Expired session → redirect to login
- ✅ Valid session → page renders

---

## Epic 2: Password Reset & Recovery

**Covers:** FRx02 (Password Reset)  
**ADs:** AD-02 (Authentication Model)  
**Status:** MOSTLY COMPLETED

### Story 2.1: Forgot Password Form & Email Sending

**Status:** COMPLETED  
**Covers:** FR.02.01 (Forgot password form)

**Implementation:**
- Page: `apps/web/src/app/forgot-password/page.tsx`
- API: `apps/web/src/app/api/auth/forgot-password/route.ts`
- Sends reset token via nodemailer (Gmail provider)

**Code References:**
- Form captures email
- Backend generates unique token
- Email sent with reset link

**Acceptance Criteria:**
- ✅ User enters email → receives reset email
- ✅ Email contains reset link with token
- ✅ Link format: `/reset-password?token=...`

---

### Story 2.2: Reset Token Generation & Validation

**Status:** COMPLETED  
**Covers:** FR.02.02 (Reset token, unique, time-bound)

**Implementation:**
- Token generated in `forgot-password/route.ts`
- Stored in database with hash
- 1-hour expiry set

**Code References:**
- `apps/web/src/app/api/auth/forgot-password/route.ts`
- Token stored in Customer table: `passwordResetToken`, `passwordResetExpiresAt`

**Acceptance Criteria:**
- ✅ Unique token generated per request
- ✅ Token stored (hashed) in DB
- ✅ Expiry set to 1 hour
- ✅ Token consumed after use (can't reuse)

---

### Story 2.3: Reset Password Form & Token Consumption

**Status:** COMPLETED  
**Covers:** FR.02.03 (Reset password form, token consumed)

**Implementation:**
- Page: `apps/web/src/app/reset-password/page.tsx`
- API: `apps/web/src/app/api/auth/reset-password/route.ts`
- User clicks email link → enters new password → token consumed

**Code References:**
- Page shows form with new password field
- Validates token from query param
- Updates password (bcrypt hash) and clears token fields

**Acceptance Criteria:**
- ✅ User clicks email link → taken to reset form
- ✅ User enters new password → password updated
- ✅ Token marked as used (can't reuse)
- ✅ User can log in with new password

---

### Story 2.4: Token Validation & Error Handling

**Status:** COMPLETED  
**Covers:** FR.02.04 (Token validation, expired/used tokens rejected)

**Implementation:**
- Validation in `reset-password/route.ts`
- Checks: token exists, not expired, not used

**Code References:**
- Route validates: `passwordResetToken` matches, `passwordResetExpiresAt` not past, token not consumed

**Acceptance Criteria:**
- ✅ Expired tokens rejected with clear error
- ✅ Already-used tokens rejected with clear error
- ✅ Invalid tokens rejected with clear error
- ✅ Error messages are user-friendly

---

## Epic 3: Configuration-Driven Menu System

**Covers:** FRx03 (Configuration-Driven Menu System)  
**ADs:** AD-05 (Two-level nesting), AD-07 (Menu layout config), AD-06 (Role-based access)  
**Status:** IN_PROGRESS (sidebar exists; need role-based filtering, top-horizontal layout, admin panel)

### Story 3.1: Database Schema for Roles, Modules, Sub-Modules

**Status:** COMPLETED  
**Covers:** FR.03.02 (Menu data structure)

**Required Schema Changes:**
- [x] Add `role` table: id, name, description, createdAt, updatedAt
- [x] Add `module` table: id, label, icon, href, createdAt, updatedAt
- [x] Add `sub_module` table: id, moduleId, label, icon, href, createdAt, updatedAt
- [x] Add `role_module` table (many-to-many): roleId, moduleId, subModuleId
- [x] Add `user_role` table (many-to-many): customerId, roleId

**Current State:**
- Prisma schema: `apps/web/prisma/schema.prisma`
- Includes Customer, Task, Role, Module, SubModule, RoleModule, and UserRole models
- Migration applied and DB verified manually on 2026-07-12

**Acceptance Criteria:**
- [x] Prisma models created and type-safe
- [x] Migrations run successfully
- [x] Shared types export Role, Module, User interfaces
- [x] Relations are correct (one role → many modules, one user → many roles)

---

### Story 3.2: Seed Data for Roles, Modules, Sub-Modules

**Status:** COMPLETED  
**Covers:** Testing & sample data

**Required:**
- [x] Create `scripts/seed.js` or Prisma seed
- [x] Seed sample roles: Admin, User, Sales, Marketing
- [x] Seed sample modules: CRM, Reporting, Settings, Dashboard
- [x] Seed sample sub-modules: CRM Dashboard, Contacts, Leads; Reporting Overview, Charts
- [x] Seed role-module mappings (e.g., Sales role can access CRM + Reporting)
- [x] Seed test users with assigned roles

**Acceptance Criteria:**
- [x] Seed script runs without errors: `npm run db:seed` or `prisma db seed`
- [x] Sample data visible in database
- [x] Role-module mappings are correct

---

### Story 3.3: Fetch User Roles & Resolve Allowed Modules (Server-side)

**Status:** COMPLETED  
**Covers:** FR.03.04 (Access control enforcement)

**Required:**
- [x] Add BFF endpoint: `GET /api/user/roles` (returns user's roles + accessible modules)
- [x] Web app calls this on page load to get menu structure
- [x] Filter modules based on role-module mappings
- [x] Return only accessible modules + sub-modules

**Implementation Location:**
- BFF route: `apps/bff/src/routes/roles.ts` (new)
- Query: `prisma.userRole.findMany({ where: { customerId }, include: { role: { include: { modules } } } })`

**Acceptance Criteria:**
- [x] BFF endpoint returns user's roles
- [x] Endpoint returns only accessible modules (role-filtered)
- [x] Response includes module.label, module.href, subModule.label, subModule.href
- [x] Performance: query completes in < 50ms for mocked unit coverage; live DB timing remains environment-dependent

---

### Story 3.4: Render Left-Hand Menu with Role-Based Filtering

**Status:** COMPLETED  
**Covers:** FR.03.01 (Left-hand menu layout), FR.03.04 (Enforcement)

**Current Implementation:**
- Component: `apps/web/src/components/AppShell.tsx`
- Currently: Hardcoded menu structure
- Needs: Dynamic modules from server, role-based filtering

**Work Needed:**
- [x] Update AppShell to accept dynamic modules (from server-side fetch)
- [x] Render only modules/sub-modules user has access to
- [x] Highlight active menu item based on current route
- [x] Sub-modules expand/collapse on click

**Implementation Location:**
- Update `apps/web/src/components/AppShell.tsx`
- Fetch from parent page using `getServerSession()` + role lookup

**Acceptance Criteria:**
- [x] Menu renders with user's allowed modules only
- [x] Sub-modules don't show if role doesn't have access
- [x] Click to expand/collapse sub-modules works
- [x] Active page is highlighted
- [x] Mobile responsive (collapses/hamburger)

---

### Story 3.5: Implement Top-Horizontal Menu Layout (Config-Driven)

**Status:** COMPLETED  
**Covers:** FR.03.01 (Top-horizontal menu layout), AD-07 (Config-driven)

**Required:**
- [ ] Add config flag: `MENU_LAYOUT=left|top` (env var)
- [ ] Create `TopMenu` component for horizontal layout
- [ ] Modules displayed as menu bar items
- [ ] Hover reveals sub-modules in dropdown
- [ ] Responsive: hamburger on small screens

**Implementation Location:**
- New component: `apps/web/src/components/TopMenu.tsx`
- Update AppShell to choose layout based on config

**Acceptance Criteria:**
- [ ] Config read at app startup
- [ ] AppShell renders correct layout (left or top)
- [ ] Top menu: modules horizontal, hover shows subs
- [ ] Mobile: hamburger menu
- [ ] Active page still highlighted

---

## Epic 4: Admin Panel & Role Management

**Covers:** FRx04 (Admin Panel), FRx03.03 (Role-module mapping)  
**ADs:** AD-09 (Admin Panel & Role Management), AD-06 (Role-based access)  
**Status:** TODO (not started)

### Story 4.1: Create /admin Layout & Role-Restricted Access

**Status:** TODO  
**Covers:** FR.04.01 (Admin role requirement)

**Required:**
- [ ] Create `/admin` page: `apps/web/src/app/admin/page.tsx`
- [ ] Check: `getServerSession()` → verify `admin` role
- [ ] Non-admin users: redirect to `/dashboard` or show 403
- [ ] Create admin layout: sidebar with tabs (Roles, Users, Modules)

**Implementation Location:**
- New page: `apps/web/src/app/admin/page.tsx`
- Will contain tabs for managing roles, users, module mappings

**Acceptance Criteria:**
- [ ] Admin users can access `/admin`
- [ ] Non-admin users are redirected (no 403 exposed)
- [ ] Admin interface is clean and intuitive
- [ ] Tab navigation works (Roles, Users, Modules)

---

### Story 4.2: Admin Panel — Role Management (CRUD)

**Status:** TODO  
**Covers:** FR.04.02 (Role management CRUD)

**Required:**
- [ ] List all roles (name, description, action buttons)
- [ ] Create role: form with name, description
- [ ] Edit role: update name, description
- [ ] Delete role: soft-delete (mark as inactive or hard-delete)
- [ ] Backend endpoints:
  - `POST /api/admin/roles` (create)
  - `GET /api/admin/roles` (list)
  - `PUT /api/admin/roles/:id` (update)
  - `DELETE /api/admin/roles/:id` (delete)

**Implementation Locations:**
- UI: `apps/web/src/app/admin/page.tsx` (Roles tab)
- API: `apps/web/src/app/api/admin/roles/route.ts` (new)
- BFF: `apps/bff/src/routes/admin.ts` (new, if logic moves there)

**Acceptance Criteria:**
- [ ] Admin can create new role
- [ ] Admin can edit role name/description
- [ ] Admin can delete role
- [ ] List refreshes after CRUD operations
- [ ] Validation: role name required, not empty, unique
- [ ] Error messages clear

---

### Story 4.3: Admin Panel — User Management (List, Edit, View Roles)

**Status:** TODO  
**Covers:** FR.04.03 (User management)

**Required:**
- [ ] List all users (email, name, company, assigned roles)
- [ ] Edit user: update name, company, email
- [ ] View assigned roles for each user
- [ ] Backend endpoints:
  - `GET /api/admin/users` (list)
  - `PUT /api/admin/users/:id` (update)

**Implementation Locations:**
- UI: `apps/web/src/app/admin/page.tsx` (Users tab)
- API: `apps/web/src/app/api/admin/users/route.ts` (new)

**Acceptance Criteria:**
- [ ] Admin can list all users
- [ ] Admin can edit user details
- [ ] User's assigned roles displayed
- [ ] Changes persist to database
- [ ] Validation: email format, required fields

---

### Story 4.4: Admin Panel — User-Role Assignment (Many-to-Many)

**Status:** TODO  
**Covers:** FR.04.04 (Role assignment)

**Required:**
- [ ] On user detail page, show assigned roles (checkboxes or multi-select)
- [ ] Admin can assign multiple roles to one user
- [ ] Admin can unassign roles
- [ ] Backend endpoint:
  - `PUT /api/admin/users/:id/roles` (update role assignment)

**Implementation Location:**
- UI update: `apps/web/src/app/admin/page.tsx` (Users tab)
- API: `apps/web/src/app/api/admin/users/:id/roles/route.ts` (new)

**Acceptance Criteria:**
- [ ] Admin can select/deselect roles for a user
- [ ] Multi-select works (user can have multiple roles)
- [ ] Changes persist
- [ ] User immediately gets new permissions after update

---

### Story 4.5: Admin Panel — Role-Module Mapping (CRUD)

**Status:** TODO  
**Covers:** FR.04.05 (Module access mapping)

**Required:**
- [ ] On role detail page, show module access
- [ ] Checkboxes for each module and its sub-modules
- [ ] Admin can check/uncheck to grant/revoke access
- [ ] Backend endpoint:
  - `PUT /api/admin/roles/:id/modules` (update module mapping)

**Implementation Location:**
- UI: `apps/web/src/app/admin/page.tsx` (Roles tab, edit role view)
- API: `apps/web/src/app/api/admin/roles/:id/modules/route.ts` (new)

**Acceptance Criteria:**
- [ ] Admin can see which modules a role can access
- [ ] Admin can check/uncheck modules
- [ ] Two-level nesting respected (module + sub-modules)
- [ ] Changes persist
- [ ] Users with that role see updated menu immediately (next login or cache refresh)

---

### Story 4.6: Admin Panel — Audit Trail Logging

**Status:** TODO  
**Covers:** FR.04.06 (Audit trail)

**Required:**
- [ ] Log all admin changes: who, what, when
- [ ] Log to console or database
- [ ] Track: role created, role updated, role deleted, user assigned to role, user removed from role, module access granted/revoked
- [ ] Backend: add logging calls to each admin endpoint

**Implementation Location:**
- Logging: add to each admin endpoint in BFF or web API
- Minimal Phase 1: console.log with timestamp, action, user, entity
- Phase 2: database table for audit logs

**Acceptance Criteria:**
- [ ] Admin actions logged with timestamp
- [ ] Logs include: who did it, what action, which entity
- [ ] Logs visible in console (dev) or searchable in database (prod)

---

## Epic 5: Themeable Styling

**Covers:** FRx05 (Themeable Styling)  
**ADs:** AD-08 (Themeable Styling), AD-07 (Config-driven)  
**Status:** TODO (not started)

### Story 5.1: Define CSS Variables for Theme (Colors, Fonts, Spacing)

**Status:** TODO  
**Covers:** FR.05.01 (CSS variables)

**Required:**
- [ ] Create `public/theme-default.css` with CSS variables:
  - Colors: `--color-primary`, `--color-secondary`, `--color-danger`, `--color-success`, `--color-background`, `--color-text`, etc.
  - Typography: `--font-family-body`, `--font-family-heading`, `--font-size-base`, `--font-size-lg`, etc.
  - Spacing: `--spacing-unit` (e.g., 8px), `--spacing-sm`, `--spacing-md`, `--spacing-lg`, etc.
  - Borders: `--border-radius`, `--border-color`, etc.

**Implementation Location:**
- File: `apps/web/public/theme-default.css`

**Acceptance Criteria:**
- [ ] All brand-related CSS values are in variables
- [ ] Variables cover: colors, fonts, spacing, borders
- [ ] Variable names are semantic (not "blue-5", but "color-primary")

---

### Story 5.2: Integrate CSS Variables with Tailwind Config

**Status:** TODO  
**Covers:** FR.05.02 (Tailwind integration)

**Required:**
- [ ] Update `apps/web/tailwind.config.ts`:
  - Map Tailwind colors to CSS variables
  - Example: `colors: { primary: 'var(--color-primary)', secondary: 'var(--color-secondary)' }`
  - Map fonts, spacing, etc.
- [ ] Tailwind classes now use variables (e.g., `bg-primary` → `background-color: var(--color-primary)`)

**Implementation Location:**
- File: `apps/web/tailwind.config.ts`

**Acceptance Criteria:**
- [ ] Tailwind config references CSS variables
- [ ] Classes like `text-primary`, `bg-primary`, `border-primary` work
- [ ] Changing CSS variable value changes rendered color (browser dev tools)

---

### Story 5.3: Create Light & Dark Themes

**Status:** TODO  
**Covers:** FR.05.05 (Out-of-box themes)

**Required:**
- [ ] Create `public/theme-light.css` — light color scheme
- [ ] Create `public/theme-dark.css` — dark color scheme
- [ ] Both define the same CSS variable names with different values
- [ ] Light theme: light backgrounds, dark text
- [ ] Dark theme: dark backgrounds, light text

**Implementation Location:**
- Files: `apps/web/public/theme-light.css`, `apps/web/public/theme-dark.css`

**Acceptance Criteria:**
- [ ] Both themes define all required variables
- [ ] Light theme is readable with light colors
- [ ] Dark theme is readable with dark colors
- [ ] Switching between themes changes UI (no functional issues)

---

### Story 5.4: Config-Driven Theme Loading (Env Var or Config File)

**Status:** TODO  
**Covers:** FR.05.04 (Admin or config theme selection), AD-08 (Config-driven)

**Required:**
- [ ] Add env var: `THEME=light|dark` (default: light)
- [ ] Update root layout: `apps/web/src/app/layout.tsx`
- [ ] Read theme from env at build or startup
- [ ] Load corresponding stylesheet: `<link href={`/theme-${theme}.css`} />`
- [ ] Theme immutable during session (restart to change)

**Implementation Location:**
- Update: `apps/web/src/app/layout.tsx`
- Read env: `process.env.THEME || 'light'`
- Add link tag with theme stylesheet

**Acceptance Criteria:**
- [ ] Theme can be set via env var
- [ ] Correct stylesheet loaded at startup
- [ ] Colors match theme (light or dark)
- [ ] Theme persists across page reloads
- [ ] Restart required to change theme

---

### Story 5.5: Provide Custom Theme Extension (Documentation)

**Status:** TODO  
**Covers:** Enabling custom themes

**Required:**
- [ ] Document how to create custom theme:
  - Copy `theme-light.css`
  - Modify CSS variables
  - Set `THEME=custom` in env
  - Restart app
- [ ] Add to `apps/web/public/theme-custom-example.css` (template)

**Implementation Location:**
- File: README or docs
- File: `apps/web/public/theme-custom-example.css`

**Acceptance Criteria:**
- [ ] Users can create custom theme by copying template
- [ ] Instructions clear and easy to follow
- [ ] Custom theme works when `THEME=custom`

---

## Epic 6: Dashboard & Settings Scaffolds

**Covers:** FRx06 (Dashboard & Settings Scaffolds)  
**Status:** MOSTLY COMPLETED

### Story 6.1: Dashboard Page (Scaffolding)

**Status:** COMPLETED  
**Covers:** FR.06.01 (Dashboard page)

**Implementation:**
- Page: `apps/web/src/app/dashboard/page.tsx`
- Shows: user info, placeholder sections for activity/stats

**Code References:**
- Server component, session validated
- Fetches from BFF: `/api/dashboard`

**Acceptance Criteria:**
- ✅ Dashboard loads after login
- ✅ User info displayed
- ✅ Placeholder areas for customization

---

### Story 6.2: Settings Navigation Section

**Status:** COMPLETED  
**Covers:** FR.06.02 (Settings section)

**Implementation:**
- AppShell navigation exposes a Settings section.
- Settings currently contains Preferences and can contain additional settings pages later.

**Code References:**
- `apps/web/src/config/navigation.ts`
- `apps/web/src/components/AppShell.tsx`

**Acceptance Criteria:**
- ✅ Settings renders as a separate navigation section
- ✅ Preferences appears under Settings
- ✅ Additional settings pages can be added under the same section

---

### Story 6.3: Preferences Page

**Status:** COMPLETED  
**Covers:** FR.06.03 (Preferences page)

**Implementation:**
- Page: `apps/web/src/app/preferences/page.tsx`
- Form for profile preferences including name and company
- API: `apps/web/src/app/api/preferences/route.ts`
- Initial preferences data loads in the server page before rendering the client form

**Acceptance Criteria:**
- ✅ Preferences page loads under Settings
- ✅ Page requires a valid server-side session
- ✅ User can update profile preferences
- ✅ Changes persist

---

### Story 6.4: Layout Consistency (AppShell on All Pages)

**Status:** COMPLETED  
**Covers:** FR.06.04 (Layout consistency)

**Implementation:**
- Component: `apps/web/src/components/AppShell.tsx`
- Root layout wraps all pages with sidebar, header, main content

**Acceptance Criteria:**
- ✅ All pages use AppShell
- ✅ Navigation consistent
- ✅ Responsive mobile layout

---

## Epic 7: Security & Encryption

**Covers:** FRx07 (Security & Encryption)  
**ADs:** AD-11 (Security & Encryption), AD-02 (Auth Model)  
**Status:** MOSTLY COMPLETED

### Story 7.1: Encryption In-Transit (TLS/HTTPS)

**Status:** COMPLETED (Dev), TODO (Prod Config)  
**Covers:** FR.07.01 (Encryption in transit)

**Implementation:**
- Dev: HTTP localhost (secure by nature)
- Prod: HTTPS required, BFF TLS enforced

**Code References:**
- Helmet middleware: `apps/bff/src/index.ts`
- NEXTAUTH_URL must be HTTPS in production

**Work Needed (Prod):**
- [ ] Document: certificate setup (Let's Encrypt, managed cert)
- [ ] Verify: NEXTAUTH_URL is HTTPS
- [ ] Verify: BFF communicates via TLS

**Acceptance Criteria:**
- ✅ Dev: communication over localhost (inherently secure)
- [ ] Prod: HTTPS enforced for web app
- [ ] BFF communication encrypted

---

### Story 7.2: Encryption At-Rest (Database Level)

**Status:** TODO  
**Covers:** FR.07.02 (Encryption at rest)

**Required:**
- [ ] Configure PostgreSQL encryption:
  - Option 1: pgcrypto for sensitive columns (passwords already hashed)
  - Option 2: Full-disk encryption (infrastructure level)
  - Option 3: Transparent Data Encryption (TDE) if cloud provider supports
- [ ] Document which approach is chosen

**Implementation Location:**
- PostgreSQL config (infrastructure)
- Document in deployment guide

**Acceptance Criteria:**
- [ ] Encryption method chosen and documented
- [ ] Deployment manifests include encryption setup
- [ ] Verified: sensitive data (passwords, tokens) are encrypted/hashed

---

## Epic 8: Deployment, Database & Testing Scripts

**Covers:** FRx08 (Deployment, Database, Testing Scripts)  
**ADs:** AD-10 (Deployment Targets), AD-12 (Timeouts & Pooling)  
**Status:** TODO (partially done; missing K8s, smoke tests, db scripts)

### Story 8.1: Docker Compose Setup (Local Dev)

**Status:** MOSTLY COMPLETED  
**Covers:** FR.08.01 (Docker Compose)

**Implementation:**
- File: `docker-compose.yml` (likely exists or mostly done)
- Services: web (3000), bff (3001), postgres (5432)

**Work Needed:**
- [ ] Verify services start correctly: `docker-compose up`
- [ ] Database migrations run automatically
- [ ] Seed data loads
- [ ] All three services healthy

**Acceptance Criteria:**
- ✅ `docker-compose up` starts all services
- ✅ Web app accessible on localhost:3000
- ✅ BFF accessible on localhost:3001
- ✅ Database ready for queries

---

### Story 8.2: Docker Images (Multi-Stage Builds)

**Status:** TODO  
**Covers:** FR.08.02 (Docker images)

**Required:**
- [ ] Dockerfile for web app: multi-stage (build → runtime)
  - Build stage: install deps, build Next.js
  - Runtime stage: minimal image with production build
  - File: `apps/web/Dockerfile`
- [ ] Dockerfile for BFF: multi-stage
  - Build stage: install deps, compile TypeScript
  - Runtime stage: minimal image with compiled JS
  - File: `apps/bff/Dockerfile`

**Acceptance Criteria:**
- [ ] Images build without errors
- [ ] Web image: < 500MB (with node_modules)
- [ ] BFF image: < 300MB
- [ ] Containers start and run services correctly

---

### Story 8.3: Kubernetes Manifests (Generic)

**Status:** TODO  
**Covers:** FR.08.03 (Kubernetes manifests)

**Required:**
- [ ] Create `k8s/` directory with manifests:
  - `k8s/namespace.yaml` — Create namespace (optional)
  - `k8s/configmap.yaml` — Environment variables
  - `k8s/secret.yaml` — Sensitive env vars (database URL, secrets)
  - `k8s/web-deployment.yaml` — Web app deployment (replicas=2)
  - `k8s/web-service.yaml` — Web app service (ClusterIP or LoadBalancer)
  - `k8s/bff-deployment.yaml` — BFF deployment (replicas=2)
  - `k8s/bff-service.yaml` — BFF service (ClusterIP, internal only)
  - `k8s/postgres-deployment.yaml` OR external DB instruction
  - `k8s/ingress.yaml` — Ingress for web app (optional, depends on cluster)

**Acceptance Criteria:**
- [ ] Manifests use standard Kubernetes API (no provider-specific resources)
- [ ] `kubectl apply -f k8s/` deploys all services
- [ ] Web app accessible via ingress or service
- [ ] BFF not publicly accessible (ClusterIP service)
- [ ] Database connectivity verified

---

### Story 8.4: Database Backup & Restore Scripts

**Status:** TODO  
**Covers:** FR.08.04 (Backup & restore)

**Required:**
- [ ] Script: `scripts/backup.sh` (PostgreSQL dump)
  - Usage: `./scripts/backup.sh` → creates backup file
  - Stores in `backups/` directory with timestamp
- [ ] Script: `scripts/restore.sh` (PostgreSQL restore)
  - Usage: `./scripts/restore.sh <backup-file>` → restores database

**Acceptance Criteria:**
- [ ] Backup runs without errors
- [ ] Backup file created with correct data
- [ ] Restore from backup works
- [ ] Restored data is accurate

---

### Story 8.5: Seed Data Script

**Status:** STARTED  
**Covers:** FR.08.05 (Seed data)

**Current State:**
- Prisma seed likely in `apps/web/prisma/seed.ts` (or similar)

**Required:**
- [ ] Seed populates: users, roles, modules, sub-modules, role-module mappings
- [ ] Run: `npm run db:seed` or `prisma db seed`
- [ ] Creates test data for manual testing

**Acceptance Criteria:**
- [ ] Seed runs without errors
- [ ] Sample data visible in database
- [ ] Can log in with seed user
- [ ] Menus show seeded modules

---

### Story 8.6: Smoke Tests (Post-Deployment Validation)

**Status:** TODO  
**Covers:** FR.08.06 (Smoke tests)

**Required:**
- [ ] Create `tests/smoke/` directory with test scripts
- [ ] Test 1: Health check — `GET /health` on BFF returns 200
- [ ] Test 2: Login page loads — `GET /login` on web returns 200
- [ ] Test 3: Login works — POST credentials, get session cookie
- [ ] Test 4: API call succeeds — fetch `/api/customers` with session
- [ ] Test 5: Database connected — query returns data
- [ ] Tools: Playwright or curl scripts

**Acceptance Criteria:**
- [ ] Smoke tests run: `npm run test:smoke`
- [ ] All checks pass after deployment
- [ ] Tests exit with non-zero if any check fails

---

### Story 8.7: Deployment Documentation

**Status:** TODO  
**Covers:** FR.08.07 (Deployment documentation)

**Required:**
- [ ] Document in README or `DEPLOYMENT.md`:
  - Docker Compose local dev: `docker-compose up`
  - Build Docker images: `docker build -t web:v1 -f apps/web/Dockerfile .`
  - Push to registry: `docker push web:v1`
  - Deploy to K8s: `kubectl apply -f k8s/`
  - Seed database: `npm run db:seed`
  - Run smoke tests: `npm run test:smoke`
  - Backup database: `./scripts/backup.sh`
  - Restore: `./scripts/restore.sh <file>`

**Acceptance Criteria:**
- [ ] Documentation is clear and complete
- [ ] Instructions are step-by-step
- [ ] Links to relevant scripts and configs

---

## Summary Table

| Epic | Status | Completed Stories | Pending Stories | Total |
|------|--------|------------------|-----------------|-------|
| 1. Multi-Provider Auth | Mostly Done | 1.2, 1.3, 1.4, 1.5, 1.6 | 1.1 (email activation) | 6 stories |
| 2. Password Reset | Done | 2.1, 2.2, 2.3, 2.4 | None | 4 stories |
| 3. Config Menu System | In Progress | 3.1–3.4 | 3.5 (top-horizontal) | 5 stories |
| 4. Admin Panel | Not Started | None | 4.1–4.6 | 6 stories |
| 5. Themeable Styling | Not Started | None | 5.1–5.5 | 5 stories |
| 6. Dashboard/Prefs/Settings | Done | 6.1, 6.2, 6.3, 6.4 | None | 4 stories |
| 7. Security & Encryption | Mostly Done | 7.1 (dev) | 7.2 (prod config) | 2 stories |
| 8. Deployment & Scripts | Partially Done | 8.1 | 8.2–8.7 | 7 stories |
| **TOTALS** | | **19 completed** | **10 pending** | **39 stories** |

---

## Recommended Build Order

1. **Complete Auth Epic** (Story 1.1: email activation) — unblocks user registration
2. **Database Schema** (Story 3.1) — foundation for roles & menu
3. **Seed Data** (Story 3.2) — test data for manual validation
4. **User Roles & Menu Filtering** (Stories 3.3–3.4) — role-based access working
5. **Admin Panel CRUD** (Stories 4.1–4.6) — admins can manage roles/users/access
6. **Top Menu Layout** (Story 3.5) — config-driven menu switching
7. **Themes** (Stories 5.1–5.4) — stylesheet-driven styling
8. **Deployment** (Stories 8.2–8.7) — Docker images, K8s, smoke tests
9. **Security & Encryption** (Story 7.2) — production setup
10. **Documentation** (Story 8.7) — deployment guide

---

## Next Actions

- [ ] Review this breakdown with the team
- [ ] Prioritize which stories to tackle first
- [ ] Assign stories to sprints
- [ ] Link each story to an AD (done above)
- [ ] Start with Story 1.1 (email activation) → Story 3.1 (schema) → Story 3.2 (seed)
