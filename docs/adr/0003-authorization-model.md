# ADR 0003 — Where authorization happens

- **Status:** accepted
- **Date:** 2026-11-05

## Context

Two questions meet in every endpoint: *is this caller allowed to use this
function* (role) and *is this caller allowed to touch this row* (ownership). The
second one is where IDOR/BOLA bugs live, and it cannot be answered by a role
check.

## Decision

1. **Every service is an OAuth2 resource server.** The Gateway validates the JWT
   and so does each downstream service (`security-lib` is a real Spring Boot
   starter, auto-configured for servlet and reactive stacks). The network is not
   a trust boundary: no service assumes "the Gateway already checked".
2. **Roles come from `realm_access.roles`, filtered by a whitelist.**
   `KeycloakJwtAuthenticationConverter` maps only `admin`, `employee`, `customer`
   to `ROLE_*` authorities; unrelated realm roles are dropped so they can never
   become an authority.
3. **Ownership is checked in the service layer, on the object.** Controllers
   carry coarse `@PreAuthorize` role gates; the service re-reads the row and
   compares its owner with the JWT subject (`assertCanAccessAccount`,
   `assertCanAccessBill`).
4. **Bills keep an `owner_subject` projection** so that ownership is decided
   locally. The projection is written when a bill is opened — the opening paths
   already resolve the account — and carried in `CreateBillsCommandDTO` for the
   account-service flow. Rows created before the projection existed fall back to
   the remote lookup; new rows never do.
5. **State-changing work sits in a dedicated transactional bean**
   (`BillDepositExecutor`, `BillOpeningExecutor`). The orchestrator may call
   account-service, but by then no transaction and no row lock is held.

## Consequences

- A customer cannot read or modify another customer's account or bill; that path
  is covered by negative integration tests (`…customerForeign_forbidden`).
- A deposit no longer depends on account-service to decide permissions: the only
  remaining remote call is the contact email, and it happens outside the
  transaction.
- The internal RabbitMQ query endpoint (`AccountQueryListener`) is still a
  trust-by-network surface: anything with broker credentials can ask for an
  account by id. Narrowing it to non-PII fields is the open follow-up.
- Role names are lower case (`ROLE_admin`) because that is how the realm defines
  them. It is consistent, but every `@PreAuthorize` must match that casing.

## Alternatives rejected

- **Gateway-only authorization** — one bug in routing rules exposes every
  service; also makes the services unusable outside the Gateway (tests, jobs).
- **A shared authorization service / OPA** — another moving part and a network
  hop on the hot path for a rule that is one string comparison.
