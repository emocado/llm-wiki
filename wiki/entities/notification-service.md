---
title: "Notification Service"
last_updated: "2026-10-01"
sources:
  - "raw/debug-sessions/2026-09-27-marcus-kafka-consumer-lag.md"
tags:
  - service
  - notifications
  - platform
status: "active"
---

# Notification Service

## Overview
`notification-service` turns domain events into customer-facing email and in-app notifications. It is a Python 3.12 / FastAPI service that consumes [Kafka](kafka.md) and sends email through SendGrid. Owned by Platform ([Priya Nair](../people/priya-nair.md)).

## Key Architecture & Responsibilities

| Consumes | Sends |
|---|---|
| `billing.invoice.v1` | Invoice-ready and payment-failed emails |
| `auth.user.v1` | Welcome, password reset, and new-device sign-in emails |

- Consumer group: `notification-service.v1`. Uses at-least-once delivery, so sends are deduplicated on `(event_id, template)` in its own small Postgres schema. See [Idempotency Keys](../concepts/idempotency-keys.md).
- Templates are versioned in `services/notification/templates/` (MJML).
- The HTTP API (`/v1/notifications/preferences`) is exposed through the [API Gateway](api-gateway.md).

### Invariants
- It never reads another service's database. Everything it needs must be in the event payload, per [Service Boundaries](../concepts/service-boundaries.md).
- Poison messages go to `<topic>.dlq` after 5 attempts and must not block the partition.

## Related Concepts & Dependencies
- Producers: [Billing Service](billing-service.md), [Auth Service](auth-service.md)
- Runbook: [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md)

## Change History & Superseded Decisions
- **2026-10-01**: Page created.
