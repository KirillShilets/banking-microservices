# ADR 0001 — RabbitMQ, transactional outbox and idempotency

- **Status:** accepted
- **Date:** 2026-11-05
- **Context:** the platform moves money in `bill-service` and has to keep two
  downstream services (`deposit-service`, `notification-service`) in sync without
  a distributed transaction.

## Context

A deposit has three effects: the balance changes, a deposit record appears in the
history, and the customer receives an email. The last two live in other services
and must not be able to fail the first one — nor may they be silently lost when
the broker is unavailable.

An HTTP caller can also retry (double click, axios retry, proxy replay), and
RabbitMQ itself delivers at least once. Both paths can duplicate the request.

## Decision

1. **RabbitMQ (topic exchange + durable queues + DLQ per queue).** The domain has
   a handful of low-volume commands, not an event-streaming workload. Topic
   exchange routing keys (`deposit.save`, `notification.deposit`, …) give routing
   without Kafka's operational weight. Decision would change if replay of the
   event log or very high throughput became a requirement.
2. **Transactional outbox.** The balance update and the outbox rows are written in
   one transaction (`OutboxService.saveEvent` is `Propagation.MANDATORY`, so it
   cannot be called outside one). A relay then publishes the rows.
3. **Relay = claim → publish → record.** Claiming stamps a lease in a short
   transaction (`FOR UPDATE SKIP LOCKED`, one lease per batch), publication
   happens with no database transaction open, and the outcome is written by a
   separate `REQUIRES_NEW` bean. Publishing inside the balance transaction would
   hold row locks for as long as the broker takes to confirm.
4. **Deliveries are at least once; consumers are idempotent.** `bill-service`
   keeps `processed_messages`, `deposit-service` relies on a unique `message_id`,
   `notification-service` claims a delivery row with
   `INSERT ... ON CONFLICT DO NOTHING` plus a stale-claim reclaim.
5. **HTTP idempotency is separate from message idempotency.** `POST
   /bills/sandbox/deposits` requires an `Idempotency-Key`; the key is claimed with
   `INSERT ... ON CONFLICT DO NOTHING` (atomic under READ COMMITTED — unlike
   "check then insert" or "insert where not exists") and completed inside the
   same transaction that moves the money.

## Consequences

- A broker outage degrades delivery, not correctness: rows accumulate in
  `PENDING` with exponential backoff, and `FAILED` rows are logged and kept as
  evidence (they are never retried).
- Duplicate messages are absorbed by consumers, duplicate HTTP calls replay the
  stored response.
- Two extra scheduled jobs (relay, retention). Retention keeps the outbox bounded
  by deleting delivered rows past `app.outbox.retention` (7 days by default).
- A lease longer than the worst-case publish time is required, otherwise a second
  replica may re-claim a message still in flight. `OutboxRelay` uses 10 minutes
  against a 5-second publisher-confirm timeout and a 50-message batch.

## Alternatives rejected

- **2PC / XA** — no shared transaction manager across services, and the broker is
  not an XA participant worth the operational complexity here.
- **Kafka + CDC (Debezium)** — solves a problem this project does not have
  (replay, partitioning) at the cost of running Connect and Kafka.
- **Saga with compensations** — the deposit flow has no remote side effect that
  needs compensating (history and email are both idempotent appends).
