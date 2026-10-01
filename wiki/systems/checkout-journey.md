---
title: "Checkout Journey"
last_updated: "2026-10-01"
sources:
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
  - "raw/postmortems/2026-09-29-pgbouncer-pool-exhaustion.md"
  - "raw/rfcs/2026-09-05-rfc-usage-based-billing.md"
tags:
  - system
  - billing
  - user-journey
status: "active"
---

# Checkout Journey

## Overview
This page covers how a tenant admin upgrades a plan, from clicking **Upgrade** to receiving the invoice email. It spans the web app, [API Gateway](../entities/api-gateway.md), [Billing Service](../entities/billing-service.md), [Stripe](../entities/stripe-api.md), [Kafka](../entities/kafka.md), and [Notification Service](../entities/notification-service.md).

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Web App
    participant GW as API Gateway
    participant Bill as Billing Service
    participant Stripe
    participant DB as billing_db
    participant K as Kafka
    participant Notif as Notification Service

    Admin->>Web: Click "Upgrade to Analytics Pro"
    Web->>GW: POST /v1/billing/checkout (JWT)
    GW->>Bill: forward + x-lumen-tenant-id
    Bill->>Stripe: create Checkout Session (Idempotency-Key)
    Stripe-->>Bill: session url
    Bill-->>Web: 200 {url}
    Web->>Stripe: redirect, admin pays
    Stripe->>Bill: webhook checkout.session.completed
    Bill->>DB: BEGIN; upsert subscription; insert outbox row; COMMIT
    Bill-->>Stripe: 200
    Bill->>K: outbox relay → billing.subscription.v1
    Stripe->>Bill: webhook invoice.paid
    Bill->>K: billing.invoice.v1
    K->>Notif: consume
    Notif->>Admin: "Your invoice is ready" email
```

## Failure Modes & Safeguards

| Step | Failure | Safeguard |
|---|---|---|
| 4 | Retry creates a duplicate session | Idempotency key `checkout:{tenant}:{plan}:{attempt}` |
| 8 | Webhook delivered twice | Dedup on `event.id` ([Idempotency Keys](../concepts/idempotency-keys.md)) |
| 9 | Stripe call made inside the transaction | Forbidden after the [2026-09-29 incident](../runbooks/postgres-connection-pool-exhaustion.md) |
| 11 | Kafka unavailable | Outbox row stays pending and the relay retries ([Transactional Outbox](../concepts/transactional-outbox.md)) |
| 14 | Consumer lag delays emails | [Kafka Consumer Lag runbook](../runbooks/kafka-consumer-lag.md) |

## Related Concepts & Dependencies
- Metered prices attached at upgrade: [Usage-Based Billing](../features/usage-based-billing.md)
- Authentication of the admin: [User Login Flow](user-login-flow.md)

## Change History & Superseded Decisions
- **2026-10-01**: Journey documented. Step 11 now uses the outbox relay, which **supersedes** direct publish after commit (2026-09-15 billing sync).
