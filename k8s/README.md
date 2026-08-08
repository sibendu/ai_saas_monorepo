# Generic Kubernetes Manifests

These manifests provide a provider-neutral starter deployment for the SaaS foundation. They use
standard Kubernetes APIs only: Namespace, ConfigMap, Secret, Deployment, Service, PersistentVolumeClaim,
StatefulSet, and Ingress.

## Resources

- Namespace: `saas-foundation`
- Web Deployment and Service: `saas-web`, `saas-web-service`
- BFF Deployment and Service: `saas-bff`, `saas-bff-service`
- PostgreSQL StatefulSet, Service, and PVC: `saas-postgres`, `saas-postgres-service`, `saas-postgres-data`
- Shared ConfigMap and Secret: `saas-config`, `saas-secrets`
- Web-only Ingress: `saas-web-ingress`

The BFF service is intentionally internal. Do not add a BFF Ingress, public `LoadBalancer`, or
`NodePort`; the web app calls it inside the cluster through `http://saas-bff-service:3001`.

## Before Applying

Replace the sample image names in:

- `web-deployment.yaml`: `ghcr.io/example/saas-web:latest`
- `bff-deployment.yaml`: `ghcr.io/example/saas-bff:latest`

Story 8.2 owns production Docker image builds. Until those images exist in a registry the manifests
can be validated, but the web and BFF Pods cannot roll out successfully.

Replace every `REPLACE_ME_...` value in `secret.yaml` before using the manifests. Real secrets,
tokens, passwords, OAuth client secrets, SMTP credentials, and production database URLs must not be
committed.

Kubernetes Secrets are not a complete secret-management strategy. For production, enable Kubernetes
Secret encryption at rest for etcd or integrate a secret manager such as your platform's KMS-backed
secret service, Vault, or External Secrets. For in-cluster PostgreSQL, use an encrypted storage class
or encrypted backing volume; the sample PVC does not provide encryption by itself.

Update `configmap.yaml` for your domain:

- `NEXTAUTH_URL=https://example.com`
- `WEB_APP_URL=https://example.com`
- `BFF_INTERNAL_URL=http://saas-bff-service:3001`

`NEXTAUTH_URL` should use HTTPS in production and `NEXTAUTH_SECRET` must be strong and consistent
across all web replicas.

## Apply

```powershell
kubectl apply -f k8s/
kubectl get pods -n saas-foundation
kubectl get svc -n saas-foundation
kubectl get ingress -n saas-foundation
```

The Ingress requires an ingress controller. If your cluster does not have one and you need a simple
public demo endpoint, change only `saas-web-service` from `ClusterIP` to `LoadBalancer`. Do not expose
`saas-bff-service` publicly.

## External PostgreSQL Option

Managed or external PostgreSQL is preferred for production. To use an external database:

1. Set `DATABASE_URL` in `secret.yaml` to the external PostgreSQL connection string.
2. Do not apply `postgres-pvc.yaml`, `postgres-service.yaml`, or `postgres-statefulset.yaml`.
3. Apply the remaining manifests explicitly:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/web-service.yaml
kubectl apply -f k8s/bff-deployment.yaml
kubectl apply -f k8s/bff-service.yaml
kubectl apply -f k8s/ingress.yaml
```

Run database migrations outside this baseline manifest set, for example with the existing
`npm run db:deploy` workflow from an approved release process.

## Validate

Run the local manifest invariant checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-k8s-manifests.ps1
```

Run Kubernetes client-side validation when your kube context is valid:

```powershell
kubectl apply --dry-run=client -f k8s/
```

Run server-side validation when a cluster is available:

```powershell
kubectl apply --dry-run=server -f k8s/
```

## Verify A Running Deployment

Check workload status:

```powershell
kubectl get pods -n saas-foundation
kubectl get deploy,statefulset,svc,ingress -n saas-foundation
```

Verify the BFF health endpoint:

```powershell
kubectl port-forward -n saas-foundation svc/saas-bff-service 3001:3001
Invoke-RestMethod http://localhost:3001/health
```

Expected response shape:

```json
{
  "status": "healthy",
  "service": "bff",
  "timestamp": "2026-08-08T00:00:00.000Z"
}
```

Verify the web login page:

```powershell
kubectl port-forward -n saas-foundation svc/saas-web-service 3000:80
Invoke-WebRequest http://localhost:3000/login
```

The response should be HTTP `200`.

Verify that the web app can resolve the internal BFF service name:

```powershell
kubectl exec -n saas-foundation deploy/saas-web -- sh -c "getent hosts saas-bff-service && wget -qO- http://saas-bff-service:3001/health"
```

Verify database connectivity for the in-cluster PostgreSQL sample:

```powershell
kubectl exec -n saas-foundation statefulset/saas-postgres -- sh -c "pg_isready -h saas-postgres-service -p 5432 -U `$POSTGRES_USER -d `$POSTGRES_DB"
```

Verify the BFF remains private:

```powershell
kubectl get ingress,svc -n saas-foundation
```

Only the web service should have external routing. `saas-bff-service` and
`saas-postgres-service` must remain `ClusterIP`.
