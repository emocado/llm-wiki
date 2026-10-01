# DB migrations — how we actually do it (brain dump)

**Author:** @marcus  
**Date:** 2026-09-22  
**Why:** Sam's PR BILL-1190 renamed a column in one migration and would've broken prod during rollout (old pods still reading the old column). Writing the rules down.

---

## tools per service
| service | tool | where |
|---|---|---|
| auth-service | goose (SQL files) | `services/auth-service/migrations/` |
| api-gateway | none, stateless | - |
| billing-service | Prisma Migrate | `services/billing-service/prisma/migrations/` |
| notification-service | alembic | `services/notification-service/alembic/versions/` |

commands:
```
# go / auth
make -C services/auth-service migrate-new name=add_mfa_enrolled_at
make -C services/auth-service migrate-up

# billing
cd services/billing-service
npx prisma migrate dev --name add_usage_meter_table   # generates + applies locally
npx prisma migrate deploy                               # what CI/argo job runs

# notification
cd services/notification-service
uv run alembic revision --autogenerate -m "add template locale"
uv run alembic upgrade head
```

## how they run in prod
- argo cd PreSync hook job `<svc>-migrate` runs before new pods roll out. If job fails, sync fails, old pods keep running.
- migrations run through PgBouncer?? NO — the migrate job connects to RDS directly (`DATABASE_URL_DIRECT`) bc prisma migrate uses advisory locks + prepared statements which break in pgbouncer transaction mode. learned that the hard way in may.

## THE RULE: expand / contract
Old and new pods run concurrently during rollout (~3-5 min) and on rollback. So every migration must be compatible with BOTH the previous and current app version.

renaming `invoices.amount` -> `invoices.amount_cents`:
1. PR 1 (expand): add `amount_cents` nullable. app writes both, reads old.
2. backfill job (batched, 5k rows, sleep between) 
3. PR 2: app reads new, writes both. add NOT NULL after backfill verified.
4. PR 3 (contract): app stops writing old. drop `amount` — at least one release later.

never in one migration:
- rename column/table
- drop column still read by current release
- add NOT NULL without default on big table
- `CREATE INDEX` without `CONCURRENTLY` on tables > ~1M rows (invoices, usage_events) — locks writes. Prisma doesn't do concurrently, so write raw SQL migration & mark it. goose: `-- +goose NO TRANSACTION`

## rollback
we don't run down migrations in prod. ever. roll forward. down migrations are for local only. if a migration is bad, write a new one that fixes it. Argo rollback = app only, schema stays (which is exactly why expand/contract matters).

## locally
`make db-reset` drops & recreates both local dbs + migrate + seed. use it when prisma complains about drift.
