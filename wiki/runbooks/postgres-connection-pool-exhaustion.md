---
title: "Runbook: Postgres Connection Pool Exhaustion"
last_updated: "2026-10-01"
sources:
  - "raw/postmortems/2026-09-29-pgbouncer-pool-exhaustion.md"
tags:
  - runbook
  - postgres
  - pgbouncer
  - billing
  - on-call
status: "active"
---

# Runbook: Postgres Connection Pool Exhaustion

## Overview
Production services reach [Postgres](../entities/postgres.md) (RDS) through PgBouncer in **transaction mode**. When all PgBouncer server connections for a database are busy, clients queue and the app reports pool timeouts, even though RDS itself looks idle. The usual culprit is application code holding transactions open — most often while waiting on an external call. This runbook comes out of the SEV-2 checkout outage on 2026-09-29.

## Symptoms
- Latency alerts on a service (p99 > 3 s) followed by 503s / timeouts.
- App errors:
  - Prisma (billing): `P2024 Timed out fetching a new connection from the connection pool`
  - Go pgx (auth): `failed to acquire connection: context deadline exceeded`
  - SQLAlchemy (notification): `QueuePool limit of size N overflow M reached`
- Datadog: `pgbouncer.pools.cl_waiting > 50` (monitor added after the incident).
- RDS CPU and IOPS **normal** — this is what distinguishes it from a slow-database problem.

## Step 1 — Confirm saturation on PgBouncer

```bash
kubectl -n data port-forward svc/pgbouncer 6432:6432
psql -h localhost -p 6432 -U pgbouncer pgbouncer
```

```sql
SHOW POOLS;    -- look at cl_waiting and sv_active vs pool_size for the db
SHOW CLIENTS;  -- which app/pod is holding connections
```

Saturated looks like `sv_active = pool_size` (e.g. `40/40`) with `cl_waiting` in the hundreds.

## Step 2 — Find who is holding connections

On RDS (use the read-only incident role):

```sql
SELECT pid, usename, application_name, state,
       now() - xact_start AS xact_age,
       left(query, 80)    AS query
FROM pg_stat_activity
WHERE datname = 'billing_db' AND state <> 'idle'
ORDER BY xact_age DESC
LIMIT 50;
```

| What you see | Likely cause |
|---|---|
| Many `idle in transaction`, long `xact_age` | App holding a txn open while doing non-DB work (HTTP call, queue publish) |
| Many `active`, same slow query | Missing index / bad plan — treat as slow-query problem |
| Many `active` waiting on `Lock` | Lock contention (see `pg_locks`), e.g. hot row `FOR UPDATE` |

## Step 3 — Mitigate

In order of preference:

1. **Roll back** the most recent deploy of the offending service via Argo CD if it correlates (this resolved the 2026-09-29 incident in one click).
2. **Disable the code path** via its LaunchDarkly flag if one exists.
3. **Terminate stuck sessions** to unblock the queue (temporary relief only):
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'billing_db'
     AND state = 'idle in transaction'
     AND now() - xact_start > interval '30 seconds';
   ```
4. **Scale down** replicas of a non-critical consumer sharing the pool to free connections.

> [!warning] Don't just raise the pool size
> Increasing PgBouncer `default_pool_size` moves the bottleneck onto RDS `max_connections` and hides the bug. Fix the transaction scope instead.

## Root Cause Pattern: External I/O Inside a Transaction

```ts
// ❌ What caused the 2026-09-29 outage (BILL-1175)
await prisma.$transaction(async (tx) => {
  const promo = await tx.$queryRaw`SELECT ... FROM promo_codes ... FOR UPDATE`;
  await stripe.invoiceItems.create({ ... });   // 8s during Stripe degradation
  await tx.promoRedemption.create({ ... });
});

// ✅ Fix (billing#2231): keep the txn DB-only, hand off via outbox
await prisma.$transaction(async (tx) => {
  await tx.promoRedemption.create({ data: { status: 'reserved', ... } });
  await tx.outbox.create({ data: { type: 'stripe.invoice_item.create', payload } });
});
// outbox relay calls Stripe with an idempotency key, then marks redemption applied
```

See [Transactional Outbox](../concepts/transactional-outbox.md) and [Idempotency Keys](../concepts/idempotency-keys.md).

## Guardrails Now in Place
- `idle_in_transaction_session_timeout = 10s` on app roles for `billing_db` and `auth_db`.
- Datadog monitor `pgbouncer.pools.cl_waiting > 50` for 2 min, per database.
- Sizing rule (in progress): per-pod pool limit × max replicas ≤ PgBouncer pool size for that db. At the time of the incident, billing had `connection_limit=10 × 6 pods = 60` against a pool of 40.
- ESLint rule banning Stripe SDK / `fetch` calls inside `$transaction` callbacks (in progress, @sam).

## Related Concepts & Dependencies
- [Postgres](../entities/postgres.md)
- [Billing Service](../entities/billing-service.md), [Stripe API](../entities/stripe-api.md)
- [Checkout Journey](../systems/checkout-journey.md)
- [Transactional Outbox](../concepts/transactional-outbox.md)
- [Database Migrations](../guides/database-migrations.md) — migrations bypass PgBouncer

## Change History & Superseded Decisions
- **2026-10-01**: Created from the 2026-09-29 SEV-2 postmortem (`raw/postmortems/2026-09-29-pgbouncer-pool-exhaustion.md`). Established "no external I/O inside DB transactions" as a billing-service rule.
