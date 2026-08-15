# Project Structure

```
saas-monorepo/
├── apps/
│   ├── web/                    # Next.js Frontend (port 3000)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   │   ├── api/        # Embedded API routes
│   │   │   │   │   └── auth/   # NextAuth handlers
│   │   │   │   ├── login/      # Login page
│   │   │   │   └── customers/  # Customers page
│   │   │   └── components/     # React components
│   │   └── prisma/             # Database schema
│   │
│   └── bff/                    # BFF Service (port 3001)
│       └── src/
│           ├── index.ts        # Express server entry
│           └── routes/         # API endpoints
│
├── packages/
│   └── shared-types/           # Shared TypeScript types
│
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
└── k8s/                        # Kubernetes configs
```

## Patterns

### Adding Embedded API Route (web app)
Create route in `apps/web/src/app/api/<route>/route.ts`. Use NextAuth session validation.

### Adding BFF Route
Create route in `apps/bff/src/routes/<route>.ts`. No additional auth (trusted network).

### Shared Types
Add types to `packages/shared-types/src/index.ts` for cross-app type safety.