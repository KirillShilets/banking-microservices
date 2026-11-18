# ADR 0002 — How money is represented

- **Status:** accepted
- **Date:** 2026-11-05

## Context

Balances are stored, transferred over HTTP, published in RabbitMQ events and
rendered by the SPA. Every one of those hops is a place where a value can be
rounded, truncated or turned into a float.

## Decision

1. **`BigDecimal` in Java, never `double`/`float`.**
2. **Scale 2 and `RoundingMode.UNNECESSARY`.** `MoneyValidation.positiveAmount`
   and `checkedBalance` reject a value with more than two decimals instead of
   rounding it. A silent rounding rule on money is a business decision, not a
   formatting detail, so it must be explicit — and here it is "reject".
3. **`NUMERIC(19,2)` in PostgreSQL** for `bills.amount` and `deposits.amount`.
   `MoneyValidation.MAX_VALUE = 99999999999999999.99` is exactly `NUMERIC(19,2)`,
   so the application limit and the column agree.
4. **Validation happens on the HTTP boundary** (`@DecimalMin`, `@Digits(
   integer = 17, fraction = 2)`) and again in the domain, because internal
   callers (RabbitMQ commands) bypass Bean Validation.
5. **The SPA never does float arithmetic on money.** `frontend/src/lib/money.ts`
   converts any accepted representation into `bigint` minor units
   (`toMinorUnits`) and formats from there; totals and charts use the same
   integer path.

## Consequences

- A value like `10.005` is a client error (400), not a silently rounded deposit.
- The currency is currently implicit: the system is single-currency and the SPA
  renders `₽`. Adding currency means adding a `currency` attribute to the
  account/bill and forbidding operations across currencies; it is deliberately
  out of scope so far.
- JSON currently carries `BigDecimal` as a number; the SPA accepts
  `number | string` (`DecimalValue`). Moving the API to decimal strings is the
  next step (see the project review notes) because values above 2^53 are not
  exactly representable in JSON numbers.

## Alternatives rejected

- **`long` minor units everywhere** — attractive, but Liquibase/Postgres already
  express money as `NUMERIC` and the reporting story is simpler with decimals.
- **`Money` value object with currency** — the right end state, but with a single
  currency it would add a wrapper without changing any behaviour today.
