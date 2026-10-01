---
title: "Priya Nair"
last_updated: "2026-09-24"
sources:
  - "raw/worklogs/priya-nair/2026-09-24-gateway-rate-limiting.md"
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
tags:
  - person
  - team-platform
status: "active"
---

# Priya Nair

## Overview
Senior Software Engineer on the **Platform** team. Owns the edge: the [API Gateway](../entities/api-gateway.md) (Envoy + Go ext-authz) and the [Notification Service](../entities/notification-service.md).

| | |
|---|---|
| **Handle** | @priya |
| **Team** | Platform |
| **Slack** | `#platform-eng` |
| **Timezone** | Asia/Kolkata |

## Owns
- [API Gateway](../entities/api-gateway.md) — routing, JWT verification, JWKS cache
- [Gateway Rate Limiting](../features/gateway-rate-limiting.md)
- [Notification Service](../entities/notification-service.md)

## Current Focus (Q4 2026)
- Idempotent consumer (`processed_events`) in notification-service for the [Transactional Outbox](../concepts/transactional-outbox.md) rollout.
- Per-tenant `gateway.ratelimit.rejected` dashboard for Customer Success.
- `gateway.jwks.unknown_kid` metric.

## Recent Work
| Date | Work | Links |
|---|---|---|
| 2026-09-24 | Per-tenant token-bucket rate limiting in ext-authz; JWKS cache 24 h → 1 h | [worklog](../../raw/worklogs/priya-nair/2026-09-24-gateway-rate-limiting.md) · #1474 #1481 #1491 |

## Related Concepts & Dependencies
- [JWT Session Tokens](../concepts/jwt-session-tokens.md)
- Collaborators: [Alice Chen](alice-chen.md), [Dan Kowalski](dan-kowalski.md)

## Change History & Superseded Decisions
- **2026-09-24**: Page created from worklog.
