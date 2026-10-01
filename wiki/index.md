# Knowledge Base Index

> The master catalog of all compiled knowledge. Maintained by the LLM agent.

---

## Guides (How-To & Setup)
- [Onboarding: First Week](guides/onboarding-first-week.md) - Day-by-day checklist for new engineers: access, local setup, architecture reading order, shipping a first change, and who to ask.
- [Local Dev Environment](guides/local-dev-environment.md) - Running the `lumen/platform` monorepo locally with mise and `make`, plus Apple Silicon, WSL2, and Docker memory gotchas and a troubleshooting table.
- [Stripe Webhooks Locally](guides/stripe-webhooks-locally.md) - Using the Stripe CLI to send signed test-mode webhooks to a local billing-service, with fixtures, targeted triggers, and replays.
- [Database Migrations](guides/database-migrations.md) - Migration tooling per service (goose, Prisma Migrate, Alembic), Argo PreSync, expand/contract, concurrent indexes, and roll-forward-only policy.

## Runbooks (Debugging & Incidents)
- [Debugging 401 Unauthorized](runbooks/debugging-401-unauthorized.md) - Decision tree and commands for gateway 401 spikes: stale JWKS cache, clock skew, family revocation, audience/issuer drift.
- [Kafka Consumer Lag](runbooks/kafka-consumer-lag.md) - Triage for consumer-group lag: per-partition diagnosis, rebalance loops, hot keys, and poison messages.
- [Postgres Connection Pool Exhaustion](runbooks/postgres-connection-pool-exhaustion.md) - Diagnosing and mitigating PgBouncer saturation, from the 2026-09-29 checkout outage.

## Features (Implementation Write-ups)
- [Refresh Token Rotation](features/refresh-token-rotation.md) - Rotate-on-use refresh tokens grouped into families with reuse detection, Redis key schema, Lua rotate script, rollout, and metrics.
- [Usage-Based Billing](features/usage-based-billing.md) - Analytics Pro metering pipeline from `usage.events.v1` to hourly aggregation, Stripe Billing Meters, and nightly reconciliation.
- [Gateway Rate Limiting](features/gateway-rate-limiting.md) - Per-tenant token-bucket limits in the gateway ext-authz filter backed by Redis Lua, with headers, overrides, fail-open, and load tests.

## Systems & End-to-End Journeys
- [User Login Flow](systems/user-login-flow.md) - End-to-end authentication, session issuance, and token verification journey.
- [Checkout Journey](systems/checkout-journey.md) - Plan upgrade from click to invoice email across gateway, billing, Stripe, Kafka, and notifications.

## Core Concepts & Standards
- [Service Boundaries](concepts/service-boundaries.md) - Architectural guidelines governing domain separation and inter-service communication.
- [JWT Session Tokens](concepts/jwt-session-tokens.md) - Access JWTs vs opaque refresh tokens, claims, monthly three-key JWKS rotation, and gateway caching rules.
- [Idempotency Keys](concepts/idempotency-keys.md) - Rules and patterns for making at-least-once operations safe to repeat, with every usage at Lumen.
- [Transactional Outbox](concepts/transactional-outbox.md) - Outbox pattern adopted for billing events on 2026-09-15, superseding direct Kafka publish (status: proposed).

## Entities (Services, Data Stores, Infrastructure)
- [Auth Service](entities/auth-service.md) - Core service responsible for credentials, token generation, and SSO integration.
- [API Gateway](entities/api-gateway.md) - Envoy + Go ext-authz edge: JWT validation, rate limiting, and header injection.
- [Billing Service](entities/billing-service.md) - NestJS service owning subscriptions, invoices, metering, and the Stripe integration.
- [Notification Service](entities/notification-service.md) - FastAPI Kafka consumer sending email and in-app notifications via SendGrid.
- [Postgres (RDS + PgBouncer)](entities/postgres.md) - Per-service databases on RDS behind PgBouncer in transaction mode.
- [Redis (ElastiCache)](entities/redis.md) - Ephemeral state: refresh-token families, rate-limit buckets, idempotency records.
- [Kafka (AWS MSK)](entities/kafka.md) - Event backbone: topic catalog, schemas, DLQs, and retention.
- [Stripe API](entities/stripe-api.md) - Payments and billing vendor; webhooks, pinned API version, and metered usage.

## People & Teams
- [Alice Chen](people/alice-chen.md) - Identity engineer; owns auth-service tokens, refresh rotation, and JWKS rotation.
- [Marcus Obi](people/marcus-obi.md) - Billing tech lead; owns billing-service, Stripe, usage-based billing, and the outbox rollout.
- [Priya Nair](people/priya-nair.md) - Platform engineer; owns the API gateway, rate limiting, and notification-service.
- [Dan Kowalski](people/dan-kowalski.md) - SRE; owns infrastructure, monitors, on-call, and runbooks.
- [Sam Reyes](people/sam-reyes.md) - New Billing engineer; first-week invoice PDF fix and onboarding notes.

---

*Last indexed: 2026-10-01*
