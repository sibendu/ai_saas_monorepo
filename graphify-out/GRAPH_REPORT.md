# Graph Report - .  (2026-07-11)

## Corpus Check
- Corpus is ~11,955 words - fits in a single context window. You may not need a graph.

## Summary
- 302 nodes · 324 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Web Dev Tooling
- Auth Routes Customers
- BFF Runtime Dependencies
- BFF Test Tooling
- Web TypeScript Config
- BFF Routes Tasks
- Web Runtime Dependencies
- BFF TypeScript Config
- Web Package Scripts
- App Shell Navigation
- Password Reset Prisma
- Web TS Includes
- Forgot Password Tests
- Root Layout Auth
- Task List Component
- Header Component
- BFF URL Routes
- Auth Flow E2E
- Next Config
- Next Env Types

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 12 edges
3. `scripts` - 11 edges
4. `scripts` - 8 edges
5. `authOptions` - 7 edges
6. `include` - 6 edges
7. `mapTaskRowToTask()` - 4 edges
8. `generatePasswordResetToken()` - 4 edges
9. `hashPasswordResetToken()` - 4 edges
10. `registerUser()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `generatePasswordResetToken()`  [EXTRACTED]
  apps/web/src/app/api/auth/forgot-password/route.ts → apps/web/src/lib/password-reset.ts
- `POST()` --calls--> `sendPasswordResetEmail()`  [EXTRACTED]
  apps/web/src/app/api/auth/forgot-password/route.ts → apps/web/src/lib/password-reset.ts
- `POST()` --calls--> `hashPasswordResetToken()`  [EXTRACTED]
  apps/web/src/app/api/auth/reset-password/route.ts → apps/web/src/lib/password-reset.ts
- `POST()` --calls--> `registerUser()`  [EXTRACTED]
  apps/web/src/app/api/register/route.ts → apps/web/src/lib/register.ts

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "Web Dev Tooling"
Cohesion: 0.05
Nodes (39): devDependencies, autoprefixer, jsdom, msw, @playwright/test, postcss, prisma, tailwindcss (+31 more)

### Community 1 - "Auth Routes Customers"
Cohesion: 0.10
Nodes (13): authOptions, handler, POST(), CustomersPage(), getCustomers(), DashboardPage(), getDashboardData(), getTasks() (+5 more)

### Community 2 - "BFF Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, cors, express, helmet, morgan, pg, @saas/shared-types, pg (+16 more)

### Community 3 - "BFF Test Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, supertest, tsx, @types/cors, @types/express, @types/morgan, @types/node, @types/pg (+15 more)

### Community 4 - "Web TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+14 more)

### Community 5 - "BFF Routes Tasks"
Cohesion: 0.14
Nodes (13): app, mockCustomers, router, router, fallbackTasks, fallbackTaskStore, getTasksFromTable(), mapTaskRowToTask() (+5 more)

### Community 6 - "Web Runtime Dependencies"
Cohesion: 0.10
Nodes (21): dependencies, bcryptjs, next, next-auth, nodemailer, pg, @prisma/adapter-pg, @prisma/client (+13 more)

### Community 7 - "BFF TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+10 more)

### Community 8 - "Web Package Scripts"
Cohesion: 0.13
Nodes (14): name, private, scripts, build, dev, lint, start, test (+6 more)

### Community 9 - "App Shell Navigation"
Cohesion: 0.18
Nodes (7): AppShellProps, MenuIconKey, MenuItemConfig, MenuSectionConfig, menuSections, MenuUiConfig, signOutMock

### Community 10 - "Password Reset Prisma"
Cohesion: 0.35
Nodes (6): POST(), POST(), generatePasswordResetToken(), hashPasswordResetToken(), sendPasswordResetEmail(), globalForPrisma

### Community 11 - "Web TS Includes"
Cohesion: 0.22
Nodes (8): exclude, include, node_modules, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx

### Community 13 - "Root Layout Auth"
Cohesion: 0.38
Nodes (3): inter, metadata, AuthProvider()

### Community 14 - "Task List Component"
Cohesion: 0.40
Nodes (4): EditableTask, priorityClasses(), TaskList(), TaskListProps

### Community 15 - "Header Component"
Cohesion: 0.50
Nodes (3): Header(), HeaderProps, signOutMock

### Community 16 - "BFF URL Routes"
Cohesion: 0.83
Nodes (3): DELETE(), getBffUrl(), PATCH()

## Knowledge Gaps
- **130 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Web Dev Tooling` to `Web Package Scripts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Web Runtime Dependencies` to `Web Package Scripts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `BFF Test Tooling` to `BFF Runtime Dependencies`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web Dev Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Auth Routes Customers` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `BFF Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._