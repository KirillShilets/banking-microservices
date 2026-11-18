# ADR 0004 — One source of configuration, and who runs the migrations

- **Status:** accepted
- **Date:** 2026-11-05

## Context

The repository started with Spring Cloud Config Server and Eureka. Kubernetes
deployment made both redundant: service discovery is cluster DNS, and Spring
settings were already mirrored into a Helm ConfigMap, which meant two sources of
truth that had to be synchronised by a script.

## Decision

1. **The Helm ConfigMap is the single source of configuration in Kubernetes.**
   `helm/bank-platform/config/config-service/src/main/resources/services/*.yml`
   is mounted at `/app/config` and selected with
   `SPRING_CONFIG_IMPORT=optional:classpath:/`. The `config-service` module and
   its `services/*.yml` copy exist only as scaffolding for local runs and are
   **not deployed** (`services.config-service.enabled: false`).
2. **Eureka is removed.** `discovery-service` is deleted; the Gateway routes to
   services directly — `localhost` in the base profile, cluster DNS names in
   `gateway-service-kubernetes.yml`. Load-balanced `lb://` URIs cannot work
   without a discovery client, so they are gone too.
3. **Application pods never migrate the database.** `spring.liquibase.enabled`
   defaults to `false`; the Helm `pre-install`/`pre-upgrade` Job runs
   `LiquibaseMigrationApplication` with `--spring.liquibase.enabled=true` and a
   dedicated `migrate` profile, retrying up to five times. Several replicas
   taking the changelog lock at once is exactly the failure this avoids.
4. **Tunables are bound through `@ConfigurationProperties`, not `@Value`
   defaults.** `app.deposit.min-amount` has no fallback in code any more: a
   missing value fails at startup instead of silently disagreeing with the
   deployed configuration.

## Consequences

- Deploying a configuration change is one edit plus `helm upgrade`.
- Local development needs a profile that supplies the same properties
  (`src/test/resources/application.yml` mirrors them for tests).
- The `config-service` module is dead weight for the deployed system. Keeping it
  is a deliberate trade-off: it documents the Spring Cloud Config path and can be
  re-enabled by flipping `enabled: true`; deleting it is a one-commit change.
- Anything that needs the old `configserver:` import will fail fast rather than
  silently pick up defaults.

## Alternatives rejected

- **Deploy Config Server and drop the ConfigMap.** More moving parts (a service,
  its credentials, its availability as a startup dependency) for the same result.
- **Keep both in sync via `sync-config.ps1`.** That is what the previous setup
  did; the copies happen to be identical today, which proves nothing about
  tomorrow.
