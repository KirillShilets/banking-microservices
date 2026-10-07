# Deployment

## Architecture

The application tier runs in Kubernetes. PostgreSQL, RabbitMQ and Keycloak stay
outside the cluster and are reached over the network. One Helm chart renders all
eight workloads from a single Deployment template.

Service names equal Spring application names, because the Gateway resolves
`lb://account-service` through Spring Cloud LoadBalancer.

## External dependencies

They must be reachable FROM INSIDE the cluster, which means bound to 0.0.0.0
rather than 127.0.0.1:

    postgres:
      ports: ["0.0.0.0:5433:5432"]
    rabbitmq:
      ports: ["0.0.0.0:5672:5672", "0.0.0.0:15672:15672"]

Without this, kind pods get connection refused. This is the most common failure
of this setup, and it looks like a chart problem while it is not.

Keycloak keeps `KC_HOSTNAME=http://keycloak.localhost:8080`, so tokens carry
`iss=http://keycloak.localhost:8080/realms/bank-realm`. Pods cannot resolve the
host's /etc/hosts, so the chart injects `hostAliases` pointing that name at the
host gateway. Both the browser and the pods therefore observe the same issuer.

## kind

    powershell -ExecutionPolicy Bypass -File deploy/kind/bootstrap.ps1

Add to `C:\Windows\System32\drivers\etc\hosts`:

    127.0.0.1 app.bank.local
    127.0.0.1 api.bank.local

## Managed cluster

    helm upgrade --install bank ./helm/bank-platform \
      -n bank --create-namespace \
      -f ./helm/bank-platform/values.yaml \
      -f ./helm/bank-platform/values-managed.yaml

## Config Server content

Spring Cloud Config Server reads `file:./config/`, which resolves to `/app/config`
inside the container. That directory is a ConfigMap generated from
`config-service/src/main/resources/services`. Helm can only read files inside the
chart, so the content is mirrored to
`helm/bank-platform/config/config-service/src/main/resources/services`.

After editing the source directory run:

    powershell -File deploy/scripts/sync-config.ps1

CI runs the same script with `-Check` and fails if the copies diverge.

## Known limitations

1. One Secret is shared by all services, so per-service database passwords are
   not isolated. Split it into one Secret per service before production use.
2. `notification-service` runs with a single replica on purpose: delivery is
   at-least-once with a claim timeout, so a crash after `send()` and before the
   SENT marker can resend the email. More replicas widen that window.
3. kindnet enforces NetworkPolicy only partially. Install Calico to validate the
   policies for real.
4. The Liquibase hook Job relies on Spring Boot launcher internals; verify it
   after any Spring Boot major upgrade.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Pods cannot reach PostgreSQL | ports bound to 127.0.0.1 in docker-compose.yml |
| 401 on every request | `iss` mismatch: compare `global.keycloak.issuerUri` with `KC_HOSTNAME` |
| 502 on every request | Eureka has no registration: check `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` |
| Exit code 137 | OOMKilled: lower `MaxRAMPercentage` or raise the limit |
| Config Server serves stale config | the chart copy is out of sync, run sync-config.ps1 |