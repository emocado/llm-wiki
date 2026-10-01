# Worklog — Per-tenant rate limiting in api-gateway

**Author:** @priya (Platform)  
**Date:** 2026-09-24  
**Ticket:** PLT-317 · **PRs:** #1474, #1481, #1491

---

## Why

Tenant `ten_Zk91` ran a badly written export script on 09-02 that hit `/v1/reports/export` at ~3k rps and degraded p99 for everyone. We only had a global Envoy local rate limit (per pod, not per tenant). Needed per-tenant, cluster-wide limits.

## What I built

Token bucket per `(tenant_id, route_class)` in Redis, evaluated by the Go ext-authz filter (same filter that validates JWTs — we already have `tenant_id` from the token claims there, so no extra parsing).

Route classes (from `gateway-routes.yaml`):

| class | examples | default rate | burst |
|---|---|---|---|
| `read` | GET /v1/dashboards/* | 50 rps | 100 |
| `write` | POST/PUT/PATCH | 10 rps | 20 |
| `export` | /v1/reports/export | 1 rps | 3 |
| `auth` | /v1/auth/* | per-IP, 5 rps | 10 |

Per-plan overrides live in LaunchDarkly (`gateway-rate-limits` JSON flag) so Sales can bump an enterprise tenant without a deploy.

Lua script (EVALSHA, loaded on startup):

```lua
-- KEYS[1] = rl:{tenant}:{class}
-- ARGV: rate (tokens/s), burst, now_ms, cost
local rate  = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now   = tonumber(ARGV[3])
local cost  = tonumber(ARGV[4])

local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or burst
local ts     = tonumber(b[2]) or now

tokens = math.min(burst, tokens + math.max(0, now - ts) / 1000 * rate)
local allowed = tokens >= cost
if allowed then tokens = tokens - cost end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(burst / rate * 1000) + 1000)
return { allowed and 1 or 0, tostring(tokens) }
```

Response headers (IETF draft `RateLimit` headers):

```
RateLimit-Policy: 50;w=1;burst=100
RateLimit: limit=50, remaining=37, reset=1
Retry-After: 1        (only on 429)
```

## Dead ends

- Tried Envoy's global rate limit service (`envoyproxy/ratelimit`). Works, but it's fixed-window, and another service to run. Our ext-authz already does a network hop per request, so piggybacking was cheaper.
- Used Redis `TIME` for `now` at first. Moved to the gateway-supplied `now_ms` because I thought `TIME` made the script non-deterministic for replication. ElastiCache is on 7.1 (effects replication) so it would've been fine. Left it — gateway pods are NTP-synced, a few ms of skew doesn't matter for a bucket.

## Failure mode — fail open

If Redis is unreachable or the call takes > 5ms we **allow** the request and bump `gateway.ratelimit.fail_open`. Decided with Dan: a Redis blip should never become a full outage.

## Load test (k6, staging, 6 gateway pods)

| scenario | rps | p50 added | p99 added | 429 accuracy |
|---|---|---|---|---|
| baseline (no RL) | 12,000 | — | — | — |
| RL on, 500 tenants | 12,000 | +0.4 ms | +1.8 ms | 99.6% |
| RL on, 1 hot tenant @ 3k rps | 12,000 | +0.4 ms | +2.1 ms | 99.9% |
| Redis failover mid-test | 12,000 | +0.5 ms | +5.0 ms (fail open 11s) | n/a |

## Also this week

- JWKS cache TTL 24h → 1h + refetch on unknown `kid` for Alice's key rotation work (#1491).

## TODO

- [ ] `gateway.ratelimit.rejected` dashboard per tenant for CS.
- [ ] Document the LD flag schema.
- [ ] Add `gateway.jwks.unknown_kid` metric.
