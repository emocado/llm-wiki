---
title: "Dan Kowalski"
last_updated: "2026-09-26"
sources:
  - "raw/meetings/2026-09-15-billing-architecture-sync.md"
  - "raw/worklogs/alice-chen/2026-09-26-jwks-key-rotation-followup.md"
  - "raw/worklogs/priya-nair/2026-09-24-gateway-rate-limiting.md"
tags:
  - person
  - team-sre
status: "active"
---

# Dan Kowalski

## Overview
Site Reliability Engineer. Owns production infrastructure (EKS, Argo CD, RDS/PgBouncer, MSK, ElastiCache), Datadog monitors and the PagerDuty rotation. Go-to person for runbooks and postmortems.

| | |
|---|---|
| **Handle** | @dan |
| **Team** | SRE |
| **Slack** | `#sre`, `#incidents` |
| **Timezone** | America/New_York |

## Owns
- Infrastructure: [Postgres](../entities/postgres.md), [Redis](../entities/redis.md), [Kafka](../entities/kafka.md)
- Runbooks: [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md), [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md), [Postgres Connection Pool Exhaustion](../runbooks/postgres-connection-pool-exhaustion.md)
- Access requests (e.g. `datadog-readonly` in Okta)

## Current Focus (Q4 2026)
- Datadog monitor `billing.outbox.oldest_unpublished_age > 60s` (from the 2026-09-15 billing sync).
- On call for the first production JWKS rotation on 2026-10-05.

## Recent Work
| Date | Work | Links |
|---|---|---|
| 2026-09-24 | Agreed fail-open policy for gateway rate limiting | [Gateway Rate Limiting](../features/gateway-rate-limiting.md) |
| 2026-09-18 | Helped debug staging 401s after key rotation | [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md) |
| 2026-09-15 | Billing architecture sync — outbox monitoring | [meeting notes](../../raw/meetings/2026-09-15-billing-architecture-sync.md) |

## Related Concepts & Dependencies
- [Onboarding: First Week](../guides/onboarding-first-week.md)

## Change History & Superseded Decisions
- **2026-09-26**: Page created from meeting notes and teammates' worklogs.
