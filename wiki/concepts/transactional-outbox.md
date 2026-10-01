---
title: "Transactional Outbox"
last_updated: "2026-09-15"
sources:
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
  - "raw/worklogs/marcus-obi/2026-09-19-usage-metering-pipeline.md"
tags:
  - concept
  - architecture
  - kafka
  - reliability
status: "proposed"
---

# Transactional Outbox

## Overview
The transactional outbox makes "change the database **and** publish an event" atomic without a distributed transaction. The event is inserted into an `outbox` table in the same transaction as the business change; a separate relay publishes outbox rows to [Kafka](../entities/kafka.md). Adopted for the [Billing Service](../entities/billing-service.md) on 2026-09-15; implementation targeted for sprint 40.

> [!warning] Superseded decision
> This **replaces** the 2025 design where billing-service called `kafkaProducer.send()` directly after committing. That dual write lost 14 invoice emails on 2026-09-08 when a pod was OOM-killed between commit and publish. Direct producer calls from request handlers are now disallowed in billing-service.

## Key Architecture & Responsibilities

```mermaid
sequenceDiagram
    participant H as Request handler
    participant DB as billing_db
    participant R as OutboxRelay
    participant K as Kafka (billing.invoice.v1)
    participant N as notification-service

    H->>DB: BEGIN; INSERT invoice; INSERT outbox; COMMIT
    loop every 500 ms
        R->>DB: SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100
        R->>K: produce (key = aggregate_id)
        R->>DB: UPDATE outbox SET published_at = now()
    end
    K->>N: deliver (at least once)
    N->>N: dedupe on event_id (processed_events)
```

### Outbox table

```sql
CREATE TABLE outbox (
  event_id      uuid        PRIMARY KEY,         -- UUIDv7, becomes the Kafka message id
  aggregate_id  text        NOT NULL,            -- e.g. invoice id; Kafka partition key
  topic         text        NOT NULL,            -- billing.invoice.v1
  payload       jsonb       NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz
);
CREATE INDEX outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
```

### Writing an event (NestJS)

```ts
await this.db.transaction(async (tx) => {
  const invoice = await this.invoices.insert(tx, dto);
  await this.outbox.enqueue(tx, {
    topic: 'billing.invoice.v1',
    aggregateId: invoice.id,
    payload: { type: 'invoice.finalized', invoiceId: invoice.id, tenantId: invoice.tenantId },
  });
});
```

### Relay
- In-process `OutboxRelay` in billing-service; polling `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100` every 500 ms lets multiple pods relay concurrently without double-claiming rows.
- Works under PgBouncer transaction mode (no session-level locks or `LISTEN/NOTIFY`).
- Published rows deleted after 7 days by a nightly job.

### Delivery semantics
- **At-least-once.** The relay may publish a row and crash before marking it published. Consumers must dedupe — see [Idempotency Keys](idempotency-keys.md).
- Ordering is per `aggregate_id` (partition key), not global.

### Monitoring
- `billing.outbox.oldest_unpublished_age > 60s` → page Billing (owner: [Dan Kowalski](../people/dan-kowalski.md)).

### Alternatives considered
- **Debezium CDC via MSK Connect** — no polling, lower latency; rejected for now due to operational overhead and cost.
- **Keep dual write + retry** — still loses events on process death.

### Scope
- Applies to billing-service **producers**. The [Usage-Based Billing](../features/usage-based-billing.md) consumer is unaffected.
- [Auth Service](../entities/auth-service.md) `auth.user.v1` may adopt it later (not scheduled).

## Related Concepts & Dependencies
- [Idempotency Keys](idempotency-keys.md)
- [Service Boundaries](service-boundaries.md) — cross-domain state changes flow as async events
- [Checkout Journey](../systems/checkout-journey.md) — invoice events drive customer emails
- [Billing Service](../entities/billing-service.md), [Notification Service](../entities/notification-service.md), [Kafka](../entities/kafka.md), [Postgres](../entities/postgres.md)

## Change History & Superseded Decisions
- **2026-09-15**: Adopted for billing-service (`2026-09-15-billing-architecture-sync.md`). Supersedes direct Kafka publish after commit (2025 billing-service design). Status `proposed` until `OutboxRelay` ships.
