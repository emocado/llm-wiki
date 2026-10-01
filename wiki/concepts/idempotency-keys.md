---
title: "Idempotency Keys"
last_updated: "2026-09-30"
sources:
  - "raw/worklogs/marcus-obi/2026-09-19-usage-metering-pipeline.md"
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
  - "raw/worklogs/sam-reyes/2026-09-30-week-one-invoice-pdf-bugfix.md"
tags:
  - concept
  - reliability
  - billing
  - kafka
status: "active"
---

# Idempotency Keys

## Overview
Because Kafka, webhooks and HTTP retries all deliver **at least once**, every Lumen operation that moves money or produces a side effect must be safe to repeat. We achieve this with idempotency keys: a stable identifier chosen by the *originator* and recorded by the *receiver* in the same transaction as the effect.

## Key Architecture & Responsibilities

### Rules
1. **The originator chooses the key, once.** Generate it before the first attempt and reuse it on every retry. Regenerating on retry defeats the purpose.
2. **The receiver records the key atomically with the effect.** Same database transaction, or it is not idempotent.
3. **Retain keys longer than the maximum redelivery window** (e.g. Kafka retention, Stripe's 24 h idempotency window).
4. **Keys are scoped** — an `event_id` is unique per topic; a Stripe `Idempotency-Key` per API account.

### Where we use them

| Boundary | Key | Recorded in | Retention |
|---|---|---|---|
| `usage.events.v1` → billing-service | `event_id` (UUIDv7) | `usage_events_seen` | 7 days (Kafka retention 3 days) |
| billing-service → Stripe meter events | `{tenant}:{metric}:{hour}:{reported_quantity}` | Stripe | Stripe-managed |
| billing-service → Stripe API (writes) | `Idempotency-Key` header, derived from our row id | Stripe | 24 h |
| Stripe webhooks → billing-service | Stripe `event.id` | `stripe_webhook_events` | 30 days |
| `billing.invoice.v1` → notification-service | outbox `event_id` | `processed_events` | 7 days |

### Pattern (Postgres)

```sql
-- inside the same transaction as the side effect
INSERT INTO processed_events (event_id, processed_at)
VALUES ($1, now())
ON CONFLICT DO NOTHING
RETURNING event_id;
-- 0 rows returned → duplicate, skip the effect and commit
```

### Pattern (Stripe client, TypeScript)

```ts
await stripe.invoiceItems.create(
  { customer, price, quantity },
  { idempotencyKey: `invoice-item:${row.id}` }, // stable across retries
);
```

> [!warning] Anti-pattern
> `idempotencyKey: uuid()` inside the retry loop. Every attempt gets a new key, so every retry creates a new charge.

> [!note] In-memory dedupe is not enough
> An LRU cache per consumer loses its state on consumer-group rebalance. This was tried and abandoned during [Usage-Based Billing](../features/usage-based-billing.md).

## Related Concepts & Dependencies
- [Transactional Outbox](transactional-outbox.md) — producer-side counterpart; outbox gives at-least-once, idempotency keys make it effectively-once
- [Usage-Based Billing](../features/usage-based-billing.md)
- [Stripe Webhooks Locally](../guides/stripe-webhooks-locally.md) — replay events to test dedupe
- [Billing Service](../entities/billing-service.md), [Notification Service](../entities/notification-service.md), [Stripe API](../entities/stripe-api.md), [Kafka](../entities/kafka.md)

## Change History & Superseded Decisions
- **2026-09-19**: `usage_events_seen` table pattern documented; in-memory LRU dedupe superseded (`2026-09-19-usage-metering-pipeline.md`).
- **2026-09-15**: notification-service required to dedupe `billing.invoice.v1` on `event_id` (`2026-09-15-billing-architecture-sync.md`).
