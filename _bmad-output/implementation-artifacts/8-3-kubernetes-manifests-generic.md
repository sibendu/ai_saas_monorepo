---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 8.3: Kubernetes Manifests (Generic)

Status: review

## Story

As an operator deploying the SaaS foundation,
I want provider-neutral Kubernetes manifests for the web app, BFF, and PostgreSQL connectivity,
so that I can deploy the foundation to any standards-compliant Kubernetes cluster without vendor lock-in.

## Acceptance Criteria

1. Given a Kubernetes cluster with a default storage class and access to the required container images, when the operator runs `kubectl apply -f k8s/`, then Kubernetes creates the namespace, configuration, secrets, workloads, services, and ingress resources without schema errors.
2. Given the manifests are applied, when the web workload starts, then it runs two replicas on port `3000`, reads non-sensitive configuration from a ConfigMap, reads `NEXTAUTH_SECRET` and `DATABASE_URL` from a Secret, and has readiness/liveness probes that do not require authentication.
3. Given the manifests are applied, when the BFF workload starts, then it runs two replicas on port `3001`, exposes `/health` for probes, reads `WEB_APP_URL` from configuration, reads `DATABASE_URL` from a Secret, and is reachable only through an internal `ClusterIP` Service.
4. Given public traffic reaches the cluster, when requests are routed through Kubernetes, then only the web service is externally exposed through either `Ingress` or an explicitly documented web `LoadBalancer` option; the BFF has no Ingress, public `LoadBalancer`, or `NodePort`.
5. Given the operator chooses in-cluster PostgreSQL for the generic sample, when manifests are applied, then PostgreSQL gets stable storage through a PVC, a `ClusterIP` Service on port `5432`, and credentials sourced from a Secret. If external PostgreSQL is chosen instead, the manifests and README must clearly show how to disable the in-cluster database and set the external `DATABASE_URL`.
6. Given secrets are needed, when the manifests are committed, then no real credentials, tokens, passwords, or production database URLs are present. Placeholder Secret values must be clearly marked as replacement values.
7. Given the deployment is running, when the operator executes the documented verification commands, then the BFF health endpoint returns healthy JSON, the web login page returns HTTP 200, the web app can resolve the internal BFF service name, and database connectivity can be verified.
8. Given the manifests are reviewed, when a developer checks Kubernetes API usage, then all resources use standard Kubernetes APIs only: no cloud-provider CRDs, managed-service resources, Helm charts, or operator-specific annotations are required for the baseline deployment.

## Tasks / Subtasks

- [x] Create the generic Kubernetes manifest set under `k8s/` (AC: 1, 8)
  - [x] Add `k8s/namespace.yaml` for a `saas-foundation` namespace.
  - [x] Add `k8s/configmap.yaml` for non-sensitive runtime config.
  - [x] Add `k8s/secret.yaml` with obvious placeholder values only.
  - [x] Add `k8s/web-deployment.yaml` and `k8s/web-service.yaml`.
  - [x] Add `k8s/bff-deployment.yaml` and `k8s/bff-service.yaml`.
  - [x] Add PostgreSQL manifests using standard APIs: prefer `k8s/postgres-statefulset.yaml`, `k8s/postgres-service.yaml`, and `k8s/postgres-pvc.yaml`; if using `postgres-deployment.yaml`, document why the simpler workload is acceptable for this starter.
  - [x] Add `k8s/ingress.yaml` for web-only external routing.
- [x] Wire environment variables to match the existing apps (AC: 2, 3, 5, 6)
  - [x] Web ConfigMap values: `NODE_ENV=production`, `NEXTAUTH_URL=https://example.com`, `BFF_INTERNAL_URL=http://saas-bff-service:3001`, and optional `MENU_LAYOUT`/`THEME` only if those config paths exist in the current code.
  - [x] Web Secret values: `NEXTAUTH_SECRET`, `DATABASE_URL`, and any mail/OAuth variables already required by the auth code or env examples.
  - [x] BFF ConfigMap values: `NODE_ENV=production`, `PORT=3001`, `WEB_APP_URL=https://example.com`.
  - [x] BFF Secret values: `DATABASE_URL`.
  - [x] PostgreSQL Secret values: username, password, database name, and a derived app `DATABASE_URL` placeholder.
- [x] Preserve the architecture security boundary (AC: 3, 4, 8)
  - [x] Make `saas-bff-service` `type: ClusterIP`.
  - [x] Do not add any BFF Ingress, public LoadBalancer, or NodePort.
  - [x] Point web server-side calls at `BFF_INTERNAL_URL=http://saas-bff-service:3001`.
  - [x] Keep public ingress routing to the web service only.
- [x] Add realistic health checks and resource guardrails (AC: 2, 3, 7)
  - [x] BFF readiness/liveness probes should call `/health` on port `3001`.
  - [x] Web readiness/liveness probes should use an unauthenticated route that exists today, such as `/login`, unless the story adds a dedicated web health route.
  - [x] Add conservative CPU/memory requests and limits for web, BFF, and Postgres.
  - [x] Use labels/selectors consistently so Services target the intended Pods.
- [x] Document operator usage in `k8s/README.md` or a focused section of `DEPLOYMENT.md` (AC: 1, 5, 6, 7)
  - [x] Include image placeholder replacement steps for web and BFF.
  - [x] Include secret replacement guidance and state that real secrets must not be committed.
  - [x] Include `kubectl apply -f k8s/`, `kubectl get pods -n saas-foundation`, and service/ingress verification commands.
  - [x] Include an external PostgreSQL option if in-cluster PostgreSQL is not intended for production.
  - [x] Include a warning that Kubernetes Secrets are not a substitute for secret management or etcd encryption.
- [x] Validate the manifests locally without requiring a cloud provider (AC: 1, 7, 8)
  - [x] Run `kubectl apply --dry-run=client -f k8s/` or `kubectl apply --dry-run=server -f k8s/` when a cluster is available.
  - [x] Run a YAML/schema validation command if available in the environment.
  - [x] Record validation commands and results in the Dev Agent Record.

## Dev Notes

### Current Repository State

- No `k8s/` directory currently exists.
- No root `docker-compose.yml` currently exists, despite Epic 8.1 assuming one may be present.
- No `apps/web/Dockerfile` or `apps/bff/Dockerfile` was found under `apps/`. Story 8.2 is still `backlog`, so this story should use replaceable image placeholders and clearly document that real deployment depends on buildable images. Do not silently create incomplete image assumptions.
- Existing scripts from root `package.json` include `build:web`, `build:bff`, `db:deploy`, `db:generate`, and `db:seed`. These are useful for future image build and init guidance but this story is scoped to manifests.
- The BFF server is in `apps/bff/src/index.ts`, listens on `process.env.PORT || 3001`, configures CORS from `WEB_APP_URL`, and exposes `GET /health` with `{ status: "healthy", service: "bff", timestamp }`.
- The web app has public `/login` and auth routes but no dedicated health route in the route inventory checked for this story.

### Architecture Guardrails

- Use standard Kubernetes API objects only. The baseline should be portable across Kind, EKS, GKE, AKS, DigitalOcean, and self-hosted clusters.
- Keep the BFF private. Architecture AD-04 says the BFF is not publicly routable and the web app is the only client. In Kubernetes this means `ClusterIP` only for BFF and no BFF Ingress.
- Public traffic should terminate at web routing. Use `networking.k8s.io/v1` Ingress for the web service. If the cluster lacks an ingress controller, document the fallback to changing the web service to `LoadBalancer`; do not make BFF public as a workaround.
- Web and BFF are stateless and should run with two replicas. PostgreSQL is stateful and needs persistent storage if deployed in-cluster.
- Production `NEXTAUTH_URL` must be HTTPS. `NEXTAUTH_SECRET` must be strong and consistent across web replicas.
- Do not put secrets in ConfigMaps. `DATABASE_URL`, `NEXTAUTH_SECRET`, OAuth secrets, and SMTP credentials belong in Secret values or an external secret-management integration.
- Kubernetes Secret objects are only an API abstraction for sensitive values. The story must tell operators to enable Kubernetes Secret encryption at rest/etcd encryption or integrate a real secret manager for production.
- Database encryption at rest is handled by the storage/provider layer for Phase 1. If using in-cluster PostgreSQL, require an encrypted storage class or document that the sample PVC is not production encryption by itself.

### Manifest Design Requirements

- Recommended resource names:
  - Namespace: `saas-foundation`
  - Web Deployment/Service: `saas-web`, `saas-web-service`
  - BFF Deployment/Service: `saas-bff`, `saas-bff-service`
  - Postgres Service: `saas-postgres-service`
  - ConfigMap: `saas-config`
  - Secret: `saas-secrets`
- Use `envFrom` only when all keys are safe for the container. Prefer explicit `env` entries using `configMapKeyRef` and `secretKeyRef` for clarity around sensitive values.
- Web container port: `3000`.
- BFF container port: `3001`.
- PostgreSQL service port: `5432`.
- `BFF_INTERNAL_URL` should be `http://saas-bff-service:3001` inside the cluster.
- Avoid setting `NEXT_PUBLIC_BFF_URL` to the private BFF service unless existing code proves it is only read server-side. In this codebase, prefer `BFF_INTERNAL_URL` for production Kubernetes because `NEXT_PUBLIC_*` variables can be exposed to browser bundles.
- Set deployment labels and service selectors identically. A selector mismatch is a release-blocking defect.
- Include `imagePullPolicy: IfNotPresent` for local cluster friendliness unless the final images require `Always`.
- Use image placeholders such as `ghcr.io/example/saas-web:latest` and `ghcr.io/example/saas-bff:latest`; document replacement before apply.

### PostgreSQL Options

- Generic sample path: include in-cluster PostgreSQL for a one-command demo, using StatefulSet plus PVC if possible.
- Production path: document external managed PostgreSQL as preferred for production operations. Operators should replace `DATABASE_URL` and skip/delete the in-cluster Postgres resources.
- Do not add provider-specific encrypted `StorageClass` resources to the baseline. Instead, add comments or README instructions for selecting a cluster-provided encrypted storage class.
- Do not run Prisma migrations from the application containers unless a later story explicitly adds an init job or release process. This story may document that migrations are handled by `npm run db:deploy` outside the manifest baseline.

### Existing Env Vars To Respect

- Web:
  - `DATABASE_URL`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `BFF_INTERNAL_URL`
  - `NEXT_PUBLIC_BFF_URL` exists in examples but should not be required for private BFF production access.
- BFF:
  - `PORT`
  - `NODE_ENV`
  - `WEB_APP_URL`
  - `DATABASE_URL`
- Project context also documents `NEXT_PUBLIC_BFF_URL`, but the deployment architecture favors server-side `BFF_INTERNAL_URL` for private service calls.

### Testing Requirements

- At minimum, validate YAML parses and Kubernetes schema accepts the resources:
  - `kubectl apply --dry-run=client -f k8s/`
  - `kubectl apply --dry-run=server -f k8s/` when a cluster is available
- After applying to a local cluster, verify:
  - `kubectl get pods -n saas-foundation`
  - `kubectl get svc -n saas-foundation`
  - BFF health via port-forward: `kubectl port-forward -n saas-foundation svc/saas-bff-service 3001:3001`, then request `http://localhost:3001/health`
  - Web route via port-forward or ingress: `/login` returns HTTP 200
  - BFF service has no public endpoint: `kubectl get ingress,svc -n saas-foundation` shows only web public exposure
- If Docker images do not exist yet because Story 8.2 is incomplete, validation should still cover manifest syntax/schema and document that live pod startup is blocked on image availability.

### Previous Story Intelligence

- No existing `8-1-*.md` or `8-2-*.md` story file was found in `_bmad-output/implementation-artifacts`.
- Sprint status shows `8-1-docker-compose-setup-local-dev` is `in-progress`, `8-2-docker-images-multi-stage-builds` is `backlog`, and `8-5-seed-data-script` is `in-progress`.
- Because image builds are not complete, this story must separate "manifest correctness" from "successful rollout with real images." The dev agent should not claim pods run successfully unless images are present and the cluster actually pulls them.

### Recent Git Intelligence

- Recent commits focused on admin work:
  - `352a315 fix: handle non-json admin api responses`
  - `29b9d0b feat: add admin audit trail logging`
  - `19782dc merge: complete admin role module mapping`
  - `c0d11e8 feat: complete admin role module mapping`
  - `aeeaf45 feat: add admin module management tab`
- Deployment work is not represented in the recent commit titles, so reuse current deployment docs and env examples rather than assuming a newly established K8s convention.

### Latest Technical Information

- Kubernetes `Service` type `ClusterIP` is the default internal service type and is appropriate for BFF and Postgres internal access. Source: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `Ingress` is stable as `networking.k8s.io/v1` and maps external HTTP(S) traffic to Services, but it requires an ingress controller to function. Sources: https://kubernetes.io/docs/concepts/services-networking/ingress/ and https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes `ConfigMap` is for non-confidential key-value configuration and `Secret` is for small sensitive values. Sources: https://kubernetes.io/docs/concepts/configuration/configmap/ and https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Deployments remain the standard `apps/v1` workload API for stateless replicas; use StatefulSet/PVC for PostgreSQL if the sample deploys a database in-cluster. Source: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.26/

## Project Structure Notes

- New files should live under root `k8s/`.
- Root docs may be updated narrowly if needed: `DEPLOYMENT.md` already contains a Kubernetes section and database encryption-at-rest guidance. Prefer a concise `k8s/README.md` for manifest-specific usage and update `DEPLOYMENT.md` only to link to it or correct stale snippets.
- Do not modify app runtime code unless a missing health endpoint is intentionally added for web probes. If adding a web health route, use `apps/web/src/app/api/health/route.ts` and test it.
- Do not modify Dockerfiles as part of this story unless the team explicitly expands scope into Story 8.2.

## References

- Epic/story requirements: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story-8.3-Kubernetes-Manifests-Generic`
- PRD requirement: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08-Deployment-Database--Testing-Scripts`
- Architecture deployment target: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10-Deployment-Targets-LOCKED`
- Architecture BFF privacy rule: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04-BFF-as-Private-Service-ADOPTED`
- Architecture security rule: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11-Security--Encryption-LOCKED`
- Env var conventions: `docs/project-context.md#Environment-Variables`
- Existing deployment guide: `DEPLOYMENT.md#Option-3-Kubernetes-GKEEKS`
- Existing BFF health endpoint: `apps/bff/src/index.ts`
- Existing web environment example: `apps/web/.env.local.example`
- Existing BFF environment example: `apps/bff/.env.example`
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress controller docs: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes ConfigMap docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret docs: https://kubernetes.io/docs/concepts/configuration/secret/

## Open Questions / Assumptions

- Assumption: Story 8.3 should provide generic sample manifests with replaceable image names, not implement Docker image builds from Story 8.2.
- Assumption: In-cluster PostgreSQL is acceptable for the portable sample, while production operators should use managed/external PostgreSQL and an encrypted storage layer.
- Assumption: `/login` is acceptable for web probes unless a dedicated web health route is added.
- Open question for implementation: Should the committed Secret manifest be named `secret.yaml` with dummy placeholders for `kubectl apply -f k8s/`, or should the repo prefer `secret.example.yaml` and require operators to copy it locally before apply? The epic requests `secret.yaml`, but security posture favors examples only.

## Dev Agent Record

### Agent Model Used

GPT-5.5 (Codex)

### Debug Log References

- `powershell -ExecutionPolicy Bypass -File scripts\validate-k8s-manifests.ps1` failed red phase before manifests existed: missing `k8s\namespace.yaml`.
- `powershell -ExecutionPolicy Bypass -File scripts\validate-k8s-manifests.ps1` passed after manifest implementation.
- `kubectl apply --dry-run=client --request-timeout=5s -f k8s/` could not complete because the active kube context uses expired AWS SSO credentials: `Error when retrieving token from sso: Token has expired and refresh failed`.
- `npm.cmd run type-check` passed for all workspaces.
- First `npm.cmd run test` run hit a transient Vitest coverage temp-file error after web unit tests completed; rerunning the affected suite passed.
- `npm.cmd run test:unit --workspace=apps/web -- --coverage.enabled=false`, `npm.cmd run test:integration --workspace=apps/web -- --coverage.enabled=false`, `npm.cmd run test:unit --workspace=apps/bff -- --coverage.enabled=false`, and `npm.cmd run test:integration --workspace=apps/bff -- --coverage.enabled=false` all passed.
- `npm.cmd run test:unit --workspace=apps/web` passed with coverage enabled on rerun.
- `npm.cmd run test` passed with coverage enabled for unit and integration suites.
- `npm.cmd run lint --workspace=apps/web` failed because the existing `next lint` script is incompatible with the installed Next CLI and is interpreted as project directory `apps/web/lint`; no local ESLint dependency is configured.

### Completion Notes List

- Story context engine analysis completed - comprehensive developer guide created.
- Added provider-neutral Kubernetes manifests for namespace, config, placeholder secrets, web, BFF, PostgreSQL, services, and web-only ingress.
- Wired web/BFF/PostgreSQL environment variables through explicit ConfigMap and Secret references, keeping sensitive values out of ConfigMaps.
- Preserved the BFF privacy boundary with `ClusterIP` only and no BFF Ingress, LoadBalancer, or NodePort.
- Added unauthenticated health probes, conservative resource requests/limits, and consistent labels/selectors.
- Documented image replacement, secret handling, Kubernetes apply/verify commands, external PostgreSQL usage, and production secret/storage encryption warnings.
- Added a local manifest invariant validator for repeatable non-cloud checks; strict kubectl schema validation requires a valid kube context and was blocked here by expired AWS SSO credentials.

### File List

- `DEPLOYMENT.md`
- `k8s/README.md`
- `k8s/bff-deployment.yaml`
- `k8s/bff-service.yaml`
- `k8s/configmap.yaml`
- `k8s/ingress.yaml`
- `k8s/namespace.yaml`
- `k8s/postgres-pvc.yaml`
- `k8s/postgres-service.yaml`
- `k8s/postgres-statefulset.yaml`
- `k8s/secret.yaml`
- `k8s/web-deployment.yaml`
- `k8s/web-service.yaml`
- `scripts/validate-k8s-manifests.ps1`
- `_bmad-output/implementation-artifacts/8-3-kubernetes-manifests-generic.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-08-08: Implemented generic Kubernetes manifests, operator documentation, and local manifest validation for Story 8.3.
