---
title: "Marcus Obi"
last_updated: "2026-09-19"
sources:
  - "raw/worklogs/marcus-obi/2026-09-19-usage-metering-pipeline.md"
  - "raw/rfcs/2026-09-05-rfc-usage-based-billing.md"
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
tags:
  - person
  - team-billing
status: "active"
---

# Marcus Obi

## Overview
Staff Engineer and tech lead of the **Billing** team. Owns the [Billing Service](../entities/billing-service.md) and the Stripe integration; onboarding buddy for [Sam Reyes](sam-reyes.md).

| | |
|---|---|
| **Handle** | @marcus |
| **Team** | Billing |
| **Slack** | `#billing-eng` |
| **Timezone** | Europe/London |

## Owns
- [Billing Service](../entities/billing-service.md) and [Stripe API](../entities/stripe-api.md) integration
- [Usage-Based Billing](../features/usage-based-billing.md)
- [Transactional Outbox](../concepts/transactional-outbox.md) rollout in billing-service
- [Checkout Journey](../systems/checkout-journey.md)

## Current Focus (Q4 2026)
- Usage reconciliation job and alert threshold (#1470).
- `outbox` table + `OutboxRelay` (target sprint 40).
- 20k events/s load test of the usage consumer.

## Recent Work
| Date | Work | Links |
|---|---|---|
| 2026-09-19 | Batched, deduplicated usage consumer; Stripe delta reporting | [worklog](../../raw/worklogs/marcus-obi/2026-09-19-usage-metering-pipeline.md) · #1450 #1458 #1463 #1470 |
| 2026-09-15 | Led billing architecture sync; outbox adopted | [meeting notes](../../raw/meetings/2026-09-15-billing-architecture-sync.md) |
| 2026-09-05 | Authored usage-based billing RFC (accepted) | [RFC](../../raw/rfcs/2026-09-05-rfc-usage-based-billing.md) |

## Related Concepts & Dependencies
- [Idempotency Keys](../concepts/idempotency-keys.md) — Billing team conventions
- [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md)

## Change History & Superseded Decisions
- **2026-09-19**: Page created from worklog, RFC and meeting notes.
