---
title: "Redis (ElastiCache)"
last_updated: "2026-10-01"
sources:
  - "raw/worklogs/alice-chen/2026-09-12-refresh-token-rotation.md"
  - "raw/worklogs/priya-nair/2026-09-24-gateway-rate-limiting.md"
tags:
  - datastore
  - redis
  - infrastructure
status: "active"
---

# Redis (ElastiCache)

## Overview
Redis 7 on AWS ElastiCache, in cluster mode with TLS. It is used for short-lived, high-throughput state that can be rebuilt or safely lost. It is never the system of record.

## Key Architecture & Responsibilities

| Key prefix | Owner | Purpose | TTL |
|---|---|---|---|
| `rt:{fid}:*`, `rtfam:{fid}*` | [Auth Service](auth-service.md) | Refresh tokens and family state ([Refresh Token Rotation](../features/refresh-token-rotation.md)) | 30d sliding |
| `rl:{tenant}:{class}` | [API Gateway](api-gateway.md) | Token buckets ([Gateway Rate Limiting](../features/gateway-rate-limiting.md)) | time to refill burst + 1s |
| `idem:{service}:{key}` | various | Short-term idempotency records ([Idempotency Keys](../concepts/idempotency-keys.md)) | 24h |

- Keys use `{hash tags}` so a multi-key Lua script stays in one slot.
- Each owner gets its own ACL user and may only touch its own prefix.

### Invariants
- Losing Redis must not lose money or identity data. Durable truth lives in [Postgres](postgres.md).
- Every key must have a TTL. Keys without one are flagged by the nightly `redis-ttl-audit` job.

## Related Concepts & Dependencies
- [Service Boundaries](../concepts/service-boundaries.md): prefixes are per-owner, the same as databases.

## Change History & Superseded Decisions
- **2026-10-01**: Page created.
