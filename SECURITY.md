# Security policy

## Reporting a vulnerability

This is a training project, not a production banking system. If you still find a
security issue, open a GitHub issue marked **[security]** or contact the
repository owner directly. Please do not publish an exploit before there is a
chance to react.

## Scope and known limitations

- **Demo credentials are intentional and public.** The users in
  `keycloak/import/bank-realm-realm.json` (`customer.kira`, `employee.bob`,
  `admin.kirill`) exist so the demo can be opened without manual realm setup.
  They are documented in the README on purpose. They must never be reused for
  anything reachable from the internet.
- **Secrets come from the environment.** `.env` (see `.env.example`) is read by
  `deploy/kind/bootstrap.ps1` to create Kubernetes Secrets; the bootstrap refuses
  to run with the `change-me` placeholders. `.env` is ignored by git, and
  Gitleaks scans the full history in CI.
- **No TLS in the kind profile.** The local cluster serves `*.localhost` over
  HTTP (a secure context for browsers, which is why OIDC with PKCE works). Staging
  and production values use HTTPS hostnames and expect a TLS-terminating ingress.
- **Single-currency, sandbox-only money movement.** `POST
  /bills/sandbox/deposits` is a test operation gated by
  `APP_SANDBOX_DEPOSITS_ENABLED` and by the `employee`/`admin` roles.
- **Internal messaging is not authenticated at the payload level.** Anything
  holding the RabbitMQ credentials can publish commands, so the broker is part of
  the trust boundary. Narrowing the internal account query to non-PII fields is
  tracked as a follow-up.
- **No rate limiting at the Gateway yet.** Abuse protection is expected from the
  ingress or an upstream WAF in a real deployment.

## What is enforced

- JWT is validated in the Gateway **and** in every downstream service
  (`iss`/`aud`/`exp`), roles are mapped from a whitelisted set.
- Object-level authorization is checked in the service layer, not only by role.
- Money-moving HTTP calls require an `Idempotency-Key`.
- Containers run as non-root with a read-only root filesystem, dropped
  capabilities and `seccompProfile: RuntimeDefault`; NetworkPolicies default to
  deny.
- CI runs CodeQL, Gitleaks (full history), Trivy (filesystem and image SBOM),
  Checkov on rendered manifests, and pins every action by commit SHA.
