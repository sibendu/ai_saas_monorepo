# Deployment Guide

## Deployment Options

### Option 1: Vercel (Web) + AWS ECS (BFF)

#### Web App Deployment (Vercel)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy from root**
```bash
cd apps/web
vercel
```

3. **Environment Variables in Vercel Dashboard**
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-random-secret>
BFF_INTERNAL_URL=https://bff.internal.yourcompany.com
```

#### BFF Deployment (AWS ECS)

1. **Create Dockerfile for BFF**
```dockerfile
# apps/bff/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/bff/package*.json ./apps/bff/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm install

# Copy source
COPY apps/bff ./apps/bff
COPY packages/shared-types ./packages/shared-types

# Build
WORKDIR /app/apps/bff
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/apps/bff/dist ./dist
COPY --from=builder /app/apps/bff/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

2. **Build and Push to ECR**
```bash
# Build
docker build -f apps/bff/Dockerfile -t saas-bff .

# Tag
docker tag saas-bff:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/saas-bff:latest

# Push
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/saas-bff:latest
```

3. **Create ECS Task Definition**
```json
{
  "family": "saas-bff",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "bff",
    "image": "<aws-account>.dkr.ecr.<region>.amazonaws.com/saas-bff:latest",
    "portMappings": [{
      "containerPort": 3001,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "3001"}
    ]
  }]
}
```

4. **Network Configuration**
- Deploy in **private subnet** (no public IP)
- Create internal load balancer
- Security group: Allow inbound from web app subnet only

---

### Option 2: All on AWS (Next.js on Amplify + BFF on ECS)

#### Web App (AWS Amplify)

1. **Connect Repository**
   - Link GitHub/GitLab repo
   - Select `apps/web` as root directory

2. **Build Settings** (amplify.yml)
```yaml
version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            - cd ../..
            - npm ci
            - npm run build --workspace=@saas/shared-types
        build:
          commands:
            - cd apps/web
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
    environment:
      variables:
        NEXTAUTH_URL: 'https://your-app.amplifyapp.com'
        BFF_INTERNAL_URL: 'http://bff.internal.yourcompany.com:3001'
```

#### BFF (Same as Option 1 ECS)

---

### Option 3: Kubernetes (GKE/EKS)

#### Web App Deployment
```yaml
# k8s/web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: saas-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: saas-web
  template:
    metadata:
      labels:
        app: saas-web
    spec:
      containers:
      - name: web
        image: your-registry/saas-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXTAUTH_URL
          value: "https://your-app.com"
        - name: BFF_INTERNAL_URL
          value: "http://saas-bff-service:3001"
---
apiVersion: v1
kind: Service
metadata:
  name: saas-web-service
spec:
  type: LoadBalancer
  selector:
    app: saas-web
  ports:
  - port: 80
    targetPort: 3000
```

#### BFF Deployment
```yaml
# k8s/bff-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: saas-bff
spec:
  replicas: 2
  selector:
    matchLabels:
      app: saas-bff
  template:
    metadata:
      labels:
        app: saas-bff
    spec:
      containers:
      - name: bff
        image: your-registry/saas-bff:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: saas-bff-service
spec:
  type: ClusterIP  # Internal only!
  selector:
    app: saas-bff
  ports:
  - port: 3001
    targetPort: 3001
```

---

## Production Environment Variables

### Web App (.env.production)
```bash
# Authentication
NEXTAUTH_URL=https://your-production-url.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# BFF Configuration
BFF_INTERNAL_URL=http://bff.internal.yourcompany.com:3001
# or for k8s: http://saas-bff-service:3001

# Optional: External APIs
# STRIPE_SECRET_KEY=sk_live_...
# SENDGRID_API_KEY=SG...
```

### BFF (.env.production)
```bash
# Server
NODE_ENV=production
PORT=3001

# Web App (for CORS)
WEB_APP_URL=https://your-production-url.com

# Database
DATABASE_URL=postgresql://user:pass@db.internal:5432/saas_production

# Redis
REDIS_URL=redis://redis.internal:6379

# Optional: External services
# AWS_REGION=us-east-1
# S3_BUCKET=saas-uploads
```

---

## Database Backup and Restore

The repository includes manual PostgreSQL logical backup helpers for local, staging, and recovery
drill operations:

- `scripts/backup.sh`
- `scripts/restore.sh`

These scripts require `bash`, `pg_dump`, `pg_restore`, and network access to the target PostgreSQL
server. On Windows, run them through Git Bash or WSL, or ensure `bash` and PostgreSQL client tools
are available on `PATH`.

### Backup

Run a backup with an operator-supplied database URL:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database ./scripts/backup.sh
```

The backup script writes a PostgreSQL custom-format archive to `backups/` using this filename
shape:

```text
<database-name>-<YYYYMMDDTHHMMSSZ>.dump
```

The default directory can be changed with `BACKUP_DIR` or a first positional argument:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database BACKUP_DIR=/secure/backups ./scripts/backup.sh
DATABASE_URL=postgresql://user:password@host:5432/database ./scripts/backup.sh /secure/backups
```

The same command is available through npm from the repository root:

```bash
npm run db:backup
```

### Restore

Restore is destructive because it runs `pg_restore --clean --if-exists`. Rehearse production
restores against a disposable local or staging database first. Create the target database separately
with `createdb` or provider tooling when needed; the script does not create databases.

Use an explicit restore target and explicit confirmation for noninteractive runs:

```bash
RESTORE_DATABASE_URL=postgresql://user:password@host:5432/disposable_restore \
  CONFIRM_RESTORE=yes \
  ./scripts/restore.sh backups/<file>.dump
```

The npm equivalent is:

```bash
npm run db:restore -- backups/<file>.dump
```

When `CONFIRM_RESTORE=yes` is not set, `restore.sh` only proceeds from an interactive TTY after
the operator types `restore`. If `RESTORE_DATABASE_URL` is not set, the script refuses to fall back
to `DATABASE_URL` unless `CONFIRM_RESTORE=yes` is present.

### Restore Validation

For a disposable restore validation, compare representative row counts between the source database
and restored database for tables that exist:

```bash
psql "$DATABASE_URL" -c "select 'customer' as table_name, count(*) from customer union all select 'role', count(*) from role union all select 'module', count(*) from module union all select 'sub_module', count(*) from sub_module union all select 'role_module', count(*) from role_module union all select 'user_role', count(*) from user_role union all select 'task', count(*) from task union all select 'audit_log', count(*) from audit_log;"

psql "$RESTORE_DATABASE_URL" -c "select 'customer' as table_name, count(*) from customer union all select 'role', count(*) from role union all select 'module', count(*) from module union all select 'sub_module', count(*) from sub_module union all select 'role_module', count(*) from role_module union all select 'user_role', count(*) from user_role union all select 'task', count(*) from task union all select 'audit_log', count(*) from audit_log;"
```

### Production Handling

Use managed encrypted backups and point-in-time recovery as the primary production backup strategy
where available. These scripts are manual logical backup/restore helpers and do not replace managed
snapshot policies, recovery objectives, or provider recovery workflows.

Backup archives can contain personal data, password hashes, reset token hashes, audit records, and
role mappings. Keep backup files encrypted, access-controlled, and outside source control. The
repository ignores `backups/`, but operators are still responsible for protecting archives in
storage and transit.

PostgreSQL custom-format backups do not include cluster-global roles or tablespaces. If a deployment
depends on global objects, capture them separately with `pg_dumpall --globals-only` and protect that
output with the same credential and archive controls.

---

## Database Encryption At Rest

### Phase 1 Strategy

The Phase 1 production default is infrastructure or provider-managed encryption for
PostgreSQL database storage. Enable and verify encryption for:

- Primary database storage volumes
- Automated backups
- Manual snapshots
- Read replicas
- Database logs where the provider stores them with the database service
- Local and non-production database volumes when they hold realistic or sensitive data

Do not add application-managed column encryption unless a concrete plaintext sensitive column
requires confidentiality from storage administrators or database readers. Existing searchable and
profile fields should remain queryable. Passwords and reset or activation tokens are already
one-way values and must not be converted into decryptable ciphertext.

`pgcrypto` is a future option for specific plaintext sensitive fields that need column-level
encryption. If it is introduced later, keep key material in an external KMS, Key Vault, Secret
Manager, or equivalent runtime integration. Do not store encryption keys in the database,
application source, Docker image layers, `DATABASE_URL`, plaintext Kubernetes manifests, or
committed environment files.

Local PostgreSQL is not production encryption by itself. Treat local development as encrypted only
when the host disk, database data directory, or Docker/PostgreSQL volume is encrypted by the host or
storage provider.

References:

- PostgreSQL encryption options: <https://www.postgresql.org/docs/current/encryption-options.html>
- PostgreSQL `pgcrypto`: <https://www.postgresql.org/docs/current/pgcrypto.html>

### Managed PostgreSQL Requirements

AWS RDS PostgreSQL deployments must enable RDS encryption at rest with AWS KMS before launch. RDS
encryption covers DB instance storage, automated backups, read replicas, logs, and snapshots for
encrypted instances. Use the AWS guide for exact setup and region/account constraints:
<https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html>

Azure Database for PostgreSQL uses service-managed key encryption by default. Use customer-managed
keys when tenant policy, regulatory controls, or key ownership requirements demand them. Use the
Azure guide for setup and operational constraints:
<https://learn.microsoft.com/en-us/azure/postgresql/security/security-data-encryption>

For any managed provider, collect launch evidence from the provider console, CLI, or policy scan
showing that database storage, backups, snapshots, replicas, and retained logs are encrypted.

### Kubernetes and Self-Hosted PostgreSQL

Generic provider-neutral Kubernetes manifests live in [`k8s/`](k8s/). For manifest-specific
replacement, apply, validation, and verification steps, see [`k8s/README.md`](k8s/README.md).
When running PostgreSQL in Kubernetes, the PostgreSQL data volume must use an encrypted storage
class or a provider-managed encrypted disk.

Kubernetes Secret API encryption protects API objects such as Secret resources in etcd. It does not
encrypt mounted PostgreSQL data files under the database data directory. Configure both controls
when running PostgreSQL in Kubernetes: enable Kubernetes API encryption for Secret objects and use
encrypted PersistentVolume storage for the database files.

Example encrypted StorageClass and PostgreSQL PVC shape:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-postgres
provisioner: <provider-csi-driver>
parameters:
  encrypted: "true"
  kmsKeyId: <provider-kms-key-id>
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: encrypted-postgres
  resources:
    requests:
      storage: 20Gi
```

For self-hosted PostgreSQL outside Kubernetes, encrypt the underlying disk, logical volume, or
filesystem that stores the PostgreSQL data directory and verify backup/snapshot encryption in the
backup system.

### Current Sensitive-Data Storage Behavior

The current schema does not need migration for this story:

- `apps/web/src/lib/password-reset.ts` generates raw reset and activation links for email delivery
  and stores only SHA-256 hashes of the token values.
- `apps/web/src/app/api/auth/reset-password/route.ts` hashes new passwords with bcrypt before
  saving them.
- `apps/web/prisma/seed.js` bcrypt-hashes seeded user passwords.
- `apps/web/prisma/schema.prisma` stores `Customer.password` and `Customer.passwordResetToken` as
  strings, but those fields contain bcrypt password hashes and SHA-256 token hashes respectively,
  not plaintext values.

Do not decrypt or reverse password values, reset tokens, or activation tokens. They are one-way
verification values. Raw reset or activation links logged when email environment variables are
missing are development-only fallback output and must not be used as a production email
configuration.

### Operator Verification Checklist

- [ ] Provider or cluster evidence shows primary PostgreSQL storage encryption is enabled.
- [ ] Automated backups are encrypted and recoverable.
- [ ] Manual snapshots are encrypted and cannot be created unencrypted by default.
- [ ] Read replicas inherit or explicitly enable database storage encryption.
- [ ] Database logs retained by the provider or logging pipeline are encrypted at rest.
- [ ] Kubernetes or self-hosted PostgreSQL uses encrypted PersistentVolume, disk, filesystem, or
      storage-provider encryption for the data directory.
- [ ] Kubernetes Secret API encryption is enabled when Kubernetes Secrets store database credentials,
      and the team understands that this does not encrypt mounted PostgreSQL data files.
- [ ] Encryption keys are stored in KMS, Key Vault, Secret Manager, or storage-provider key
      management, not in the database, source-controlled files, Docker image layers, or plaintext
      manifests.
- [ ] Local and non-production databases that hold realistic or sensitive data use encrypted host
      disks or encrypted database volumes.
- [ ] Production email configuration sends reset and activation links through the configured mail
      provider and does not rely on console-logged links.

---

## Security Checklist

### Before Deploying to Production

- [ ] **Secrets**: Use secret management (AWS Secrets Manager, HashiCorp Vault)
- [ ] **NEXTAUTH_SECRET**: Generate strong random secret
- [ ] **HTTPS**: Enable SSL/TLS for web app
- [ ] **Network**: BFF in private subnet, no public access
- [ ] **Firewall**: Security groups restrict BFF to web app only
- [ ] **CORS**: Restrict to production domain only
- [ ] **Rate Limiting**: Add to BFF (express-rate-limit)
- [ ] **Logging**: Set up CloudWatch/DataDog/Sentry
- [ ] **Monitoring**: Health checks, alerts
- [ ] **Database**: Connection pooling, read replicas, and verified encryption at rest
- [ ] **Backups**: Automated encrypted database backups and snapshots
- [ ] **Encryption evidence**: Complete the Database Encryption At Rest operator checklist

---

## Network Architecture (AWS Example)

```
┌─────────────────────────────────────────────────┐
│                    VPC                          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         Public Subnet (AZ-1)              │ │
│  │                                           │ │
│  │   ┌─────────────────────────────────┐    │ │
│  │   │   Internet Gateway              │    │ │
│  │   └────────────┬────────────────────┘    │ │
│  │                │                          │ │
│  │   ┌────────────▼────────────────────┐    │ │
│  │   │   Application Load Balancer     │    │ │
│  │   │   (HTTPS: 443)                  │    │ │
│  │   └────────────┬────────────────────┘    │ │
│  └────────────────┼───────────────────────────┘
│                   │
│  ┌────────────────▼───────────────────────────┐
│  │         Private Subnet (AZ-1)              │
│  │                                            │
│  │   ┌──────────────────────────────────┐    │
│  │   │   Next.js App (Fargate/EC2)      │    │
│  │   │   Port: 3000                     │    │
│  │   └────────────┬─────────────────────┘    │
│  │                │ Internal HTTP             │
│  │   ┌────────────▼─────────────────────┐    │
│  │   │   Internal Load Balancer         │    │
│  │   └────────────┬─────────────────────┘    │
│  │                │                           │
│  │   ┌────────────▼─────────────────────┐    │
│  │   │   BFF Service (Fargate/EC2)      │    │
│  │   │   Port: 3001                     │    │
│  │   │   ⚠️  NO PUBLIC IP               │    │
│  │   └────────────┬─────────────────────┘    │
│  │                │                           │
│  │   ┌────────────▼─────────────────────┐    │
│  │   │   RDS PostgreSQL                 │    │
│  │   │   Port: 5432                     │    │
│  │   └──────────────────────────────────┘    │
│  └────────────────────────────────────────────┘
└─────────────────────────────────────────────────┘

Security Groups:
- ALB: Allow 443 from 0.0.0.0/0
- Next.js: Allow 3000 from ALB only
- Internal LB: Allow 3001 from Next.js SG only  
- BFF: Allow 3001 from Internal LB only
- RDS: Allow 5432 from BFF SG only
```

---

## Monitoring & Observability

### Application Monitoring
```typescript
// apps/bff/src/index.ts - Add monitoring

import * as Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Health check with metrics
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

### Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## Scaling Considerations

### Horizontal Scaling
- **Web App**: Auto-scale based on CPU/memory (ECS/K8s)
- **BFF**: Scale independently based on request rate
- **Database**: Read replicas for read-heavy workloads

### Caching Strategy
```typescript
// Add Redis caching to BFF
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

router.get('/customers', async (req, res) => {
  // Check cache
  const cached = await redis.get('customers');
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from DB
  const customers = await db.customers.findMany();
  
  // Cache for 5 minutes
  await redis.setex('customers', 300, JSON.stringify(customers));
  
  res.json(customers);
});
```

---

## Cost Optimization

1. **Use Spot Instances** for BFF (AWS ECS/EKS)
2. **Auto-scaling**: Scale down during off-peak hours
3. **CDN**: Use CloudFront/Cloudflare for static assets
4. **Database**: Use connection pooling, optimize queries
5. **Caching**: Redis for frequently accessed data

---

## Rollback Strategy

1. **Version Tags**: Tag all Docker images
2. **Blue-Green Deployment**: Zero-downtime updates
3. **Database Migrations**: Always backward-compatible
4. **Feature Flags**: Enable/disable features without deploy

---

## Support & Troubleshooting

### Common Issues

**BFF Connection Timeout**
- Check security groups
- Verify BFF is in private subnet
- Check web app has route to BFF

**Session Issues**
- Verify NEXTAUTH_SECRET is consistent
- Check cookie domain settings
- Ensure NEXTAUTH_URL matches production URL

**CORS Errors**
- Update BFF CORS to allow production domain
- Check WEB_APP_URL environment variable
