---
title: "Kafka (AWS MSK)"
last_updated: "2026-10-01"
sources:
  - "raw/debug-sessions/2026-09-27-marcus-kafka-consumer-lag.md"
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
tags:
  - infrastructure
  - kafka
  - events
status: "active"
---

# Kafka (AWS MSK)

## Overview
Kafka (AWS MSK, 3 brokers, Kafka 3.7) is the backbone for asynchronous, cross-domain events. Per [Service Boundaries](../concepts/service-boundaries.md), state changes that cross a domain go out as versioned events here rather than as synchronous calls.

## Key Architecture & Responsibilities

| Topic | Producer | Consumers | Partitions | Key |
|---|---|---|---|---|
| `auth.user.v1` | [Auth Service](auth-service.md) | billing, notification | 12 | `user_id` |
| `billing.invoice.v1` | [Billing Service](billing-service.md) | notification | 12 | `tenant_id` |
| `billing.subscription.v1` | [Billing Service](billing-service.md) | analytics | 12 | `tenant_id` |
| `usage.events.v1` | product services | billing (metering) | 48 | `tenant_id` |

- Schemas are JSON Schema, registered in `lumen/platform/schemas/events/`. A breaking change requires a new topic version (`.v2`).
- Every topic has a `.dlq` companion for poison messages.
- Retention is 7 days (30 days for `usage.events.v1`, which is needed for billing reconciliation).

### Invariants
- Delivery is at-least-once, so consumers must be idempotent ([Idempotency Keys](../concepts/idempotency-keys.md)).
- Producers that also write to a DB use the [Transactional Outbox](../concepts/transactional-outbox.md).

## Related Concepts & Dependencies
- Runbook: [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md)
- Feature: [Usage-Based Billing](../features/usage-based-billing.md)

## Change History & Superseded Decisions
- **2026-10-01**: Page created.
