# SQLite Demo Mode

The normal application database remains PostgreSQL. Environment variables are read from the
repository root only. For lightweight demos, set these values in root `.env.local` or in the
container environment:

```env
DB_PROVIDER=sqlite
DATABASE_URL=file:/app/data/demo.db
DB_BOOTSTRAP_ON_START=true
DB_SEED_ON_START=true
```

On startup, the app generates a SQLite-compatible Prisma client, creates the SQLite file schema, and seeds demo users/roles/modules.

For local setup after changing root `.env.local`:

```sh
npm run db:setup --workspace=apps/web
```

For PostgreSQL:

```env
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:5432/database
```

Use one web replica for container-internal SQLite storage. Multiple replicas each get their own independent file unless you mount shared storage.
