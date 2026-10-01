---
title: "Billing Service"
last_updated: "2026-10-01"
sources:
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
  - "raw/rfcs/2026-09-05-rfc-usage-based-billing.md"
  - "raw/worklogs/marcus-obi/2026-09-19-usage-metering-pipeline.md"
  - "raw/postmortems/2026-09-29-pgbouncer-pool-exhaustion.md"
tags:
  - service
  - billing
  - stripe
status: "active"
---

# Billing Service

## Overview
`billing-service` owns subscriptions, invoices, plan changes, and usage metering for every Lumen tenant. It is the only service that talks to [Stripe](stripe-api.md) and the only writer of `billing_db`. Owned by the Billing team (tech lead: [Marcus Obi](../people/marcus-obi.md)).

## Key Architecture & Responsibilities

| Aspect | Detail |
|---|---|
| Language / framework | TypeScript, NestJS 10, Prisma ORM |
| Repo path | `lumen/platform/services/billing` |
| Data store | `billing_db` on [Postgres](postgres.md) (via PgBouncer, transaction mode) |
| Publishes | `billing.invoice.v1`, `billing.subscription.v1` on [Kafka](kafka.md) |
| Consumes | `usage.events.v1` (metering), `auth.user.v1` (tenant lifecycle) |
| Inbound | REST via [API Gateway](api-gateway.md) under `/v1/billing/*`; Stripe webhooks at `/webhooks/stripe` |
| On-call | `billing-primary` PagerDuty rotation |

### Modules
- **Subscriptions** — plan catalog, upgrades/downgrades, proration. Drives the [Checkout Journey](../systems/checkout-journey.md).
- **Invoices** — mirrors Stripe invoices into `billing_db`, renders PDFs, emits `billing.invoice.v1`.
- **Metering** — aggregates usage hourly and reports to Stripe Billing Meters. See [Usage-Based Billing](../features/usage-based-billing.md).
- **Webhooks** — verifies Stripe signatures and deduplicates by event id. See [Stripe webhooks locally](../guides/stripe-webhooks-locally.md).

### Invariants
- Every Stripe write carries an idempotency key ([Idempotency Keys](../concepts/idempotency-keys.md)).
- **No external HTTP calls inside a DB transaction.** Added after the [2026-09-29 pool exhaustion incident](../runbooks/postgres-connection-pool-exhaustion.md), when a Stripe call inside `prisma.$transaction` held PgBouncer connections and took checkout down.
- Domain events go through the [Transactional Outbox](../concepts/transactional-outbox.md) (rollout in progress).

## Related Concepts & Dependencies
- Upstream: [API Gateway](api-gateway.md), [Auth Service](auth-service.md) (tenant identity)
- Downstream: [Stripe API](stripe-api.md), [Kafka](kafka.md), [Notification Service](notification-service.md) (invoice emails)
- Runbooks: [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md), [Postgres Pool Exhaustion](../runbooks/postgres-connection-pool-exhaustion.md)
- Guides: [Database Migrations](../guides/database-migrations.md)

## Change History & Superseded Decisions
- **2026-10-01**: Page created from billing sync, usage-billing RFC, Marcus's metering worklog, and the PgBouncer postmortem.
- **2026-09-15**: Direct publish to Kafka after commit **superseded** by the transactional outbox (`raw/meetings/2026-09-15-billing-architecture-sync.md`).
