# Kubernetes deployment

Kubernetes is the only supported runtime in this repository. The Helm chart deploys the application. Operators manage PostgreSQL, RabbitMQ and Keycloak. Config Server and Eureka are disabled for this runtime: Spring settings come from the application ConfigMap and services use Kubernetes DNS.

## Local kind deployment

1. Install Docker Desktop, kind, kubectl, Helm, Java 17, Node.js 20 and PowerShell.
2. Copy `.env.example` to `.env` and replace every `change-me` password with a unique value. Set the SMTP username and password. To select a different SMTP server, update `services.notification-service.env.MAIL_HOST` and `MAIL_PORT` in `helm/bank-platform/values-kind.yaml`. Do not commit `.env`.
3. From the repository root, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy\kind\bootstrap.ps1
   ```

The script creates or reuses `bank-local`, installs ingress-nginx, cert-manager, CloudNativePG and Barman Cloud, RabbitMQ Cluster and Messaging Topology Operators, and the Keycloak Operator. It then creates namespace Secrets, deploys MinIO, creates the `postgres-backups` bucket, and deploys the databases, identity provider and app tier.

Open the app at `http://app.localhost`, the Gateway at `http://api.localhost`, and Keycloak at `http://keycloak.localhost`. These `.localhost` origins provide the secure browser context required by the frontend's PKCE flow without adding Windows hosts entries. Keycloak's first administrator credentials are generated and stored in Secret `keycloak-initial-admin` in namespace `bank`:

```powershell
kubectl get secret keycloak-initial-admin -n bank -o jsonpath="{.data.username}" | ForEach-Object { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_)) }
kubectl get secret keycloak-initial-admin -n bank -o jsonpath="{.data.password}" | ForEach-Object { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_)) }
```

The script creates durable secrets for PostgreSQL's service roles, the RabbitMQ app user, MinIO root and PostgreSQL backup access. Generated MinIO credentials are kept in Kubernetes Secrets and are not written into values files. The bootstrap Job creates the `postgres-backups` bucket and a backup-specific MinIO user.

## End-to-end check and current scope

For a clean local run, start Docker Desktop (host ports `80` and `443` must be
free) and run the bootstrap from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\kind\bootstrap.ps1
```

`kind-cluster.yaml` publishes host `80/443` to the same container ports on the
control-plane node, which is exactly what ingress-nginx's kind manifest binds
via `hostPort`. Do not map those hosts to the NodePort range instead: the
controller never listens there and every `.localhost` origin answers with an
empty reply. Clusters created before that mapping was corrected keep working
through the controller's NodePorts `30080/30443` — the one-time repair is in
Troubleshooting below.

Expected flow:

1. Open <http://app.localhost> and sign in with `customer.kira` / `Qpass123`.
2. If the profile has no account yet, create one and choose 3 bills. Bills are
   opened asynchronously by `bill-service`; the frontend polls briefly and then
   refreshes the dashboard.
3. The dashboard shows the cards, balances, cashback selection and history.
4. Staff can use the sandbox deposit endpoint with an `employee`/`admin` token:

   ```http
   POST http://api.localhost/bills/sandbox/deposits
   Authorization: Bearer <employee-token>
   Content-Type: application/json

   {"billId":1,"amount":"5000.00"}
   ```

   The balance is updated in `bill-service`; the deposit record and notification
   are processed asynchronously through RabbitMQ.

## Troubleshooting: `app.localhost` does not respond

Symptom: the browser reports a closed connection, `curl` prints
`Empty reply from server`, while `kubectl -n bank get pods` shows every pod
`Running`.

Diagnose the port chain:

```powershell
# host ports published by the node container
docker ps --filter name=bank-local-control-plane --format '{{.Ports}}'
# where ingress-nginx actually listens
kubectl -n ingress-nginx get svc ingress-nginx-controller
kubectl -n ingress-nginx get deploy ingress-nginx-controller -o yaml | Select-String 'hostPort'
```

If the node publishes `80->30080` while the controller Service uses different
NodePorts, the host port reaches nothing. Repair the existing cluster without
deleting data by pinning the Service to the published NodePorts:

```powershell
kubectl -n ingress-nginx patch svc ingress-nginx-controller --type=json `
  -p '[{"op":"replace","path":"/spec/ports/0/nodePort","value":30080},{"op":"replace","path":"/spec/ports/1/nodePort","value":30443}]'
```

The durable fix is the port mapping in `deploy/kind/kind-cluster.yaml` (host
`80/443` to container `80/443`): it applies to newly created clusters, so a
fresh `kind create cluster` needs no patch. Re-applying the upstream kind
ingress manifest resets the Service NodePorts, so clusters created with the old
mapping need the patch again after such a re-apply; running the bootstrap with
`-SkipCluster` skips the ingress install entirely.

`kubectl port-forward` is not a substitute for the frontend: the OIDC redirect
URI is registered as `http://app.localhost/*` without a port, so
`http://app.localhost:8080` is rejected by Keycloak. Port-forwarding is meant for
API-level checks against `api.localhost:<port>`, which is what `deploy/ci/smoke.sh`
does on port 18080.

### What this project does

- accounts, bills/accounts, sandbox top-ups, deposit lookup;
- Keycloak OIDC and role-aware UI (`customer`, `employee`, `admin`);
- async deposit history and email notification plumbing;
- card-product presentation and local cashback promo selection in the frontend.

### What is intentionally not implemented

- **P2P transfers between two customers.** There is no transfer endpoint or
  double-entry ledger in the backend, so the UI cannot move money from one
  person's card to another. Adding it requires a transactional backend endpoint
  with idempotency and RabbitMQ events.
- real card issuing, card acquiring, withdrawals, and real money movement;
- server-side transaction list: the UI's activity history is device-local;
- cashback settlement: the selection and estimate are a frontend promo layer.

`networkPolicies.enabled` is deliberately `false` in `values-kind.yaml`: kind
places PostgreSQL, RabbitMQ and Keycloak in the same namespace as the app, and a
namespace-wide default-deny policy blocks CNPG's operator/API traffic. Managed
environments use a separate infra namespace and keep the policies enabled.

## Infra files

- `k8s/infra/postgres/cluster.yaml` defines a 3-instance CloudNativePG cluster, storage, role management and the Barman Cloud backup plugin.
- `k8s/infra/postgres/databases.yaml` defines a separate database for every application service and Keycloak.
- `k8s/infra/postgres/object-store.yaml` configures the MinIO S3 endpoint.
- `k8s/infra/postgres/scheduled-backup.yaml` schedules daily backups and requests an initial backup.
- `k8s/infra/rabbitmq/cluster.yaml` defines a 3-node RabbitMQ cluster with persistent volumes.
- `k8s/infra/rabbitmq/user.yaml` provisions the application's restricted RabbitMQ user.
- `k8s/infra/keycloak/` contains the Keycloak custom resource and its local Ingress.
- `k8s/infra/minio/` contains the persistent S3-compatible endpoint and its bucket bootstrap Job.

The Keycloak Operator imports `keycloak/import/bank-realm-realm.json` only when it first creates `bank-realm`. The official `KeycloakRealmImport` resource does not update an existing realm; later realm changes need a separate export/update process. Realm state is persisted in `keycloak_database` on PostgreSQL PVCs.

CloudNativePG's scheduled backup uses the Barman Cloud plugin and writes both WAL and base backups to MinIO. Verify that backup objects appear and perform a restore drill before relying on this setup. An untested backup is not a proven recovery plan.

## Data migration from the previous Compose setup

The old `docker-compose.yml` and its PostgreSQL initialization scripts are removed. The bootstrap creates a new PostgreSQL cluster; it does not import data from an old Docker volume. The old volume is not deleted by this change. If it contains data you need, export it from the old PostgreSQL server with `pg_dump`/`pg_dumpall` before switching the application to the new cluster, then restore and validate the dumps before routing real traffic. Do not remove old Docker volumes until the restored database and backups have been checked.

## Limits of this local environment

The kind cluster's three Kubernetes nodes share the same workstation and storage provider. Three PostgreSQL or RabbitMQ replicas in kind test operator reconciliation and failover behavior, but do not protect against workstation, disk, Docker Desktop or power failure. Use independent machines and durable network storage for real high availability.

MinIO's upstream operator, server and client repositories are archived. The official community images are no longer anonymously available from the registries checked for this project, so the local StatefulSet uses a pinned CoolLabs-built MinIO image and the bootstrap image builds the pinned `mc` source tag. These are community artifacts, not official MinIO releases, and have not been security-supported here. This single-node setup is for learning and local backup workflow checks only. Use an actively maintained, independently operated S3-compatible service for production, and use TLS for all credentials and backup traffic.

The local Keycloak and Ingress endpoints use HTTP to work with the current kind setup. They are not suitable for an internet-facing or production deployment. Configure trusted TLS, hardened admin access, network policies, and production secrets before exposing this system outside the workstation.

The RabbitMQ operator documentation currently describes Kubernetes 1.31+ and testing through 1.32; the project's kind cluster may run a newer Kubernetes version. Check the operator compatibility matrix before using a different cluster version.

## Deployment smoke test

The authenticated Gateway check needs a fresh access token from the test realm. To avoid copying a new access token every time, sign in to the local frontend and use the browser's Network panel to copy `refresh_token` from a recent Keycloak token response. Enroll it once; Windows encrypts the refresh token for the current user and stores it outside the repository:

```powershell
.\deploy\scripts\get-smoke-test-token.ps1 -Enroll
```

For each smoke test, request a new access token and run the deployment check:

```powershell
$jwt = & .\deploy\scripts\get-smoke-test-token.ps1
$env:BANK_SMOKE_TEST_JWT = $jwt
& .\deploy\scripts\verify-deployment.ps1
Remove-Item Env:BANK_SMOKE_TEST_JWT
Remove-Variable jwt
```

The access token expires, so refresh it with the first command each time. The saved refresh token can also expire or be revoked; if that happens, sign in again and repeat enrollment. Keep both tokens private.

To remove the saved credential from this Windows user profile:

```powershell
Remove-Item "$env:LOCALAPPDATA\BankingSystem\smoke-refresh-token.dpapi"
```

CI checks that the mirrored ConfigMap configuration matches its source by running `powershell -ExecutionPolicy Bypass -File deploy\scripts\sync-config.ps1 -Check`.
