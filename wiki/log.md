# Wiki Compilation Log

> Append-only chronological audit log of all ingestion, compilation, and linting passes.

---

## [2026-10-01] init | System Bootstrap
- Initialized LLM Wiki architecture following Karpathy compiler pattern.
- Created starter core pages:
  - `wiki/concepts/service-boundaries.md`
  - `wiki/entities/auth-service.md`
  - `wiki/systems/user-login-flow.md`
- Generated master catalog `wiki/index.md` and agent guidelines `SCHEMA.md`.

## [2026-10-01] ingest | September sources batch (`raw/how-to/`, `raw/debug-sessions/`, `raw/postmortems/`, `raw/worklogs/`, `raw/meetings/`, `raw/rfcs/`)
- Created pages:
  - Guides: `wiki/guides/onboarding-first-week.md`, `wiki/guides/local-dev-environment.md`, `wiki/guides/stripe-webhooks-locally.md`, `wiki/guides/database-migrations.md`
  - Runbooks: `wiki/runbooks/debugging-401-unauthorized.md`, `wiki/runbooks/kafka-consumer-lag.md`, `wiki/runbooks/postgres-connection-pool-exhaustion.md`
  - Features: `wiki/features/refresh-token-rotation.md`, `wiki/features/usage-based-billing.md`, `wiki/features/gateway-rate-limiting.md`
  - Concepts: `wiki/concepts/jwt-session-tokens.md`, `wiki/concepts/idempotency-keys.md`, `wiki/concepts/transactional-outbox.md`
  - Entities: `wiki/entities/api-gateway.md`, `wiki/entities/billing-service.md`, `wiki/entities/notification-service.md`, `wiki/entities/postgres.md`, `wiki/entities/redis.md`, `wiki/entities/kafka.md`, `wiki/entities/stripe-api.md`
  - Systems: `wiki/systems/checkout-journey.md`
  - People: `wiki/people/{alice-chen,marcus-obi,priya-nair,dan-kowalski,sam-reyes}.md`
- Updated pages: `wiki/entities/auth-service.md`, `wiki/systems/user-login-flow.md`
- Key takeaway: Billing events move to a transactional outbox (supersedes direct Kafka publish), and external calls inside DB transactions are now forbidden after the 2026-09-29 PgBouncer outage.
