# SaaS Monorepo - Next.js + BFF Architecture

A production-ready monorepo setup with Next.js frontend and separate Node.js BFF service.

## Structure

```
saas-monorepo/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── bff/          # Node.js BFF service (port 3001)
└── packages/
    └── shared-types/ # Shared TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 24+ and npm
- PostgreSQL 14+ for normal development, or SQLite demo mode for lightweight local/container demos

### Installation

```bash
# Install all dependencies
npm install
```

### Environment Configuration

Environment variables are read from the repository root only. Use root `.env.local` for local overrides; do not create app-level env files under `apps/web` or `apps/bff`.

Common values:

```env
WEB_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BFF_URL=http://localhost:3001
BFF_INTERNAL_URL=http://localhost:3001
APP_NAME=SaaS Platform
STYLE=default
MENU_LAYOUT=left
```

### PostgreSQL Setup

Prisma is owned by the `apps/web` workspace and is pinned to Prisma `6.19.2`. Run database commands from the repository root so npm resolves the workspace-local Prisma CLI.

1. Start PostgreSQL.

   PowerShell example:

   ```powershell
   C:\Software\PostgreSQL\18\bin\pg_ctl start -D C:\Software\PostgreSQL\18\data
   ```

2. Edit root `.env.local` and set PostgreSQL mode.

   ```env
   DB_PROVIDER=postgresql
   DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
   DB_BOOTSTRAP_ON_START=false
   DB_SEED_ON_START=false
   ```

3. Validate the schema, apply migrations, and generate the Prisma client.

   ```powershell
   npm run db:validate
   npm run db:deploy
   npm run db:generate
   ```

For local schema development, create a new migration with:

```powershell
npm run db:migrate -- --name your_migration_name
```

Useful Prisma commands:

```powershell
npm run db:status
npm run db:studio
```

### SQLite Demo Mode

For lightweight demos where you do not want to deploy PostgreSQL, switch root `.env.local` to SQLite:

```env
DB_PROVIDER=sqlite
DATABASE_URL=file:../data/demo.db
DB_BOOTSTRAP_ON_START=true
DB_SEED_ON_START=true
```

Then run:

```powershell
npm run db:setup
```

In SQLite mode, startup also bootstraps the database before the web app starts. The setup creates a SQLite-compatible Prisma client, creates the file-backed SQLite schema, and runs [apps/web/prisma/seed.js](apps/web/prisma/seed.js).

For containers, use an absolute file URL such as:

```env
DATABASE_URL=file:/app/data/demo.db
```

Use one web replica for container-internal SQLite storage. Multiple replicas each get their own independent database unless you mount shared storage.

### Demo Users

The seed script is shared by PostgreSQL and SQLite. Current seeded demo users all use password `abc`:

```text
admin@example.com
sales@example.com
crm@example.com
marketing@example.com
user@example.com
sibendu.das@gmail.com
```

Seed data includes roles, hierarchical modules, sub-modules, role-module access, groups, group-role mappings, and group memberships. It mirrors the current PostgreSQL reference data.

### Development

```bash
# Run both web and bff in development mode
npm run dev

# Run individually
npm run dev:web   # Next.js on http://localhost:3000
npm run dev:bff   # BFF on http://localhost:3001
```

If ports are already in use, stop the existing processes on ports `3000` and `3001` before starting another dev session.

### Theme Customization

The web app loads static theme stylesheets from `apps/web/public/` at startup. For custom brand themes, copy the example stylesheet and follow the guide in [docs/theme-customization.md](docs/theme-customization.md).

### Test

npm run test - this will run all tests other than e2e

To run e2e tests with browser (not headless mode)
npm run -w apps/web test:e2e -- --headed  

### Build

```bash
# Build all apps
npm run build

# Build individually
npm run build:web
npm run build:bff
```

## Architecture

### Web App (apps/web)
- **Framework**: Next.js 16 with App Router
- **Port**: 3000
- **Features**:
  - Login screen with embedded auth API route
  - Customer list screen
  - Admin module with roles, users, groups, modules, role-module mappings, style settings, and logs
  - Data-driven left/top navigation from modules and sub-modules
  - Session-based authentication using next-auth
  - Embedded API route: `/api/auth/[...nextauth]` (email + password credentials)

### BFF Service (apps/bff)
- **Framework**: Express.js with TypeScript
- **Port**: 3001
- **Features**:
  - `/api/customers` - Returns customer list
  - `/api/dashboard` - Returns dashboard/home data
  - `/api/roles/menu/:email` - Returns role-based menu data
  - Trusted by web app via private network (no additional auth layer)
  - Service-to-service communication

### Shared Types (packages/shared-types)
- Common TypeScript interfaces and types
- Used by both web and bff for type safety

## Security Model

- **Embedded routes** (like `/api/auth/login`): Use Next.js built-in session management
- **BFF communication**: Deployed in private network - web app trusts BFF
- **No CORS**: BFF not publicly accessible, only reachable from web app

## Deployment Strategy

1. Deploy web app to Vercel/AWS/GCP
2. Deploy BFF in private VPC/network
3. Configure web app to communicate with BFF via private endpoint
4. Ensure BFF is NOT publicly accessible

## Adding New Features

### Embedded API Route (in web app)
```typescript
// apps/web/app/api/new-route/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Your logic here
}
```

### BFF Route
```typescript
// apps/bff/src/routes/new-route.ts
router.get('/api/new-feature', async (req, res) => {
  // Your logic here
  res.json({ data: 'something' });
});
```

## Migration Path

When you need to extract embedded routes to BFF:
1. Copy route logic from `apps/web/app/api/*` to `apps/bff/src/routes/*`
2. Update web app to call BFF endpoint instead
3. Remove old embedded route
4. Types remain shared via `packages/shared-types`


See [docs/sqlite-demo-mode.md](docs/sqlite-demo-mode.md) for a shorter SQLite deployment note.
