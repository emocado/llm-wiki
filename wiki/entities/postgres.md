---
title: "Postgres (RDS + PgBouncer)"
last_updated: "2026-10-01"
sources:
  - "raw/postmortems/2026-09-29-pgbouncer-pool-exhaustion.md"
  - "raw/how-to/2026-09-22-marcus-db-migrations.md"
tags:
  - datastore
  - postgres
  - infrastructure
status: "active"
---

# Postgres (RDS + PgBouncer)

## Overview
Lumen runs PostgreSQL 16 on AWS RDS (Multi-AZ). Each service owns its own logical database, and every connection goes through PgBouncer in **transaction pooling** mode. Owned by SRE ([Dan Kowalski](../people/dan-kowalski.md)).

## Key Architecture & Responsibilities

| Database | Owner service | Migration tool |
|---|---|---|
| `auth_db` | [Auth Service](auth-service.md) | goose |
| `billing_db` | [Billing Service](billing-service.md) | Prisma Migrate |
| `notification_db` | [Notification Service](notification-service.md) | Alembic |

- PgBouncer runs as a Deployment in the `data` namespace (`svc/pgbouncer:6432`).
- Transaction mode means **no session state**: no `SET` outside a transaction, no session advisory locks, and prepared statements only through drivers that support protocol-level prepares.
- Read replicas are available for analytics queries via `*-ro` DSNs.

### Invariants
- One service per database. Cross-database queries are forbidden ([Service Boundaries](../concepts/service-boundaries.md)).
- Do not hold a transaction open across network calls. See the [pool exhaustion runbook](../runbooks/postgres-connection-pool-exhaustion.md).
- Schema changes follow expand/contract ([Database Migrations](../guides/database-migrations.md)).

## Related Concepts & Dependencies
- [Transactional Outbox](../concepts/transactional-outbox.md) uses an `outbox` table in each owning DB.
- Local equivalent: the `postgres` container in [Local Dev Environment](../guides/local-dev-environment.md).

## Change History & Superseded Decisions
- **2026-10-01**: Page created. Added the `pgbouncer.pools.cl_waiting` monitor (from the 2026-09-29 postmortem).
