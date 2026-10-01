# Postmortem: Checkout outage due to PgBouncer pool exhaustion

**Date of incident:** 2026-09-29  
**Severity:** SEV-2  
**Authors:** @dan, @marcus  
**Status:** Action items in progress  
**Blameless:** yes

---

## Summary
For 34 minutes, ~62% of checkout and invoice API calls failed with `503` / timeouts. billing-service exhausted its PgBouncer client pool because a newly deployed code path held a DB transaction open while calling the Stripe API.

## Impact
- 14:11–14:45 UTC. ~1,900 failed checkout attempts, 41 customers affected on self-serve upgrade flow.
- Invoice PDF downloads failing for all tenants.
- No data loss. Stripe charges were not duplicated (idempotency keys held).

## Timeline (UTC)
| Time | Event |
|---|---|
| 13:58 | billing-service v4.12.0 deployed (BILL-1175 "apply promo codes at checkout") |
| 14:11 | Datadog monitor `billing p99 latency > 3s` fires |
| 14:13 | PagerDuty pages @marcus. Logs show `Timed out fetching a new connection from the connection pool` (Prisma P2024) |
| 14:18 | @dan joins. PgBouncer `SHOW POOLS` on `billing_db`: `cl_waiting=380`, `sv_active=40/40` |
| 14:24 | Hypothesis: DB slow. RDS CPU 18%, no slow queries. Ruled out. |
| 14:29 | `pg_stat_activity` shows 40 sessions `idle in transaction`, all from billing-service, query = `SELECT ... FROM promo_codes ... FOR UPDATE` |
| 14:33 | Correlated with Stripe API latency spike (status page: degraded, p99 ~8s) |
| 14:38 | Decision: roll back via Argo CD to v4.11.3 |
| 14:45 | Error rate back to baseline. Incident mitigated. |
| 15:20 | Stripe resolves their degradation |

## Root cause
BILL-1175 wrapped `reserve promo code → create Stripe invoice item → mark promo redeemed` in a single `prisma.$transaction(...)`. The Stripe HTTP call happened **inside** the DB transaction. When Stripe latency rose to ~8s, each checkout held a server connection for 8s+. With `default_pool_size=40` in PgBouncer for `billing_db`, 40 concurrent checkouts saturated the pool and every other billing query queued.

Contributing factors:
- Prisma `connection_limit` per pod (10) × 6 pods = 60 > PgBouncer pool 40 — client side looked "fine".
- No `idle_in_transaction_session_timeout` on billing_db role.
- Code review didn't flag external I/O inside a transaction; no lint rule.
- Monitors fired on latency, not on pool saturation, so first 7 minutes were spent looking at the DB.

## What went well
- Idempotency keys on Stripe calls prevented double charges on retries.
- Rollback was one click in Argo CD.

## Action items
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Move Stripe call out of the transaction; use transactional outbox for the follow-up write | @marcus | Done (billing#2231) |
| 2 | Set `idle_in_transaction_session_timeout = 10s` for app roles on billing_db, auth_db | @dan | Done |
| 3 | Datadog monitor on `pgbouncer.pools.cl_waiting > 50` for 2m per db | @dan | Done |
| 4 | ESLint rule: no `fetch`/Stripe SDK calls inside `$transaction` callback | @sam | In progress |
| 5 | Write runbook for pool exhaustion | @dan | In progress |
| 6 | Right-size pools: per-pod `connection_limit` × max replicas ≤ PgBouncer pool | @dan | Todo |

## Useful queries from the incident
```sql
-- on pgbouncer admin console (psql -p 6432 -U pgbouncer pgbouncer)
SHOW POOLS;
SHOW CLIENTS;

-- on RDS
SELECT pid, usename, state, now() - xact_start AS xact_age, left(query, 80)
FROM pg_stat_activity
WHERE datname = 'billing_db' AND state <> 'idle'
ORDER BY xact_age DESC;
```
