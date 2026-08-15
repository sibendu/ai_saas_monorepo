# Tech Stack

## Core Technologies
- **Frontend**: Next.js 14 with App Router
- **Backend**: Express.js with TypeScript (BFF service)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 6.19.2
- **Authentication**: NextAuth.js (session-based)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Project Manager
- npm workspaces

## Common Commands

### Development
```bash
npm run dev              # Run both web + bff
npm run dev:web          # Next.js on port 3000
npm run dev:bff          # BFF on port 3001
```

### Database
```bash
npm run db:validate      # Validate Prisma schema
npm run db:deploy        # Apply migrations
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create new migration
npm run db:status        # Migration status
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
```

### Testing
```bash
npm run test             # Run unit + integration tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests (headless)
npm run test:e2e -- --headed  # E2E with browser
```

### Building
```bash
npm run build            # Build all apps
npm run build:web        # Build Next.js
npm run build:bff        # Build BFF
npm run type-check       # TypeScript check
```

### Login Credentials
- Email: admin
- Password: password