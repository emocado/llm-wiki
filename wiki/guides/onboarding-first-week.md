---
title: "Onboarding: Your First Week"
last_updated: "2026-10-01"
sources:
  - "raw/how-to/2026-09-08-dan-local-dev-setup-notes.md"
  - "raw/how-to/2026-09-14-sam-stripe-webhooks-locally.md"
  - "raw/how-to/2026-09-22-marcus-db-migrations.md"
tags:
  - guide
  - onboarding
status: "active"
---

# Onboarding: Your First Week

## Overview
A checklist for new engineers joining Lumen's platform teams. By the end of the week you should have the stack running locally, understand how a request flows through the system, and have shipped a small change to production.

> [!tip] Use the wiki agent
> Ask your coding assistant questions like *"How does checkout talk to Stripe?"* — it reads `wiki/index.md` and answers with links. If you learn something not written here, drop notes into `raw/` and ask the agent to ingest them. This is how most of this wiki was written.

## Day 1 — Access & Accounts
- [ ] GitHub: accepted invite to the `lumen` org, SSO authorised, SSH key added
- [ ] Slack channels: `#eng`, `#deploys`, `#incidents`, your team channel (`#identity-eng`, `#billing-eng`, `#platform-eng`)
- [ ] Datadog, PagerDuty (shadow only), LaunchDarkly, Argo CD (read-only) — request via the IT access form
- [ ] AWS SSO: `aws sso login --profile lumen-staging`
- [ ] Stripe test-mode account access (Billing team only)

## Day 1–2 — Local Environment
- [ ] Follow [Local Development Environment Setup](local-dev-environment.md) end to end
- [ ] `make doctor` all green
- [ ] `curl localhost:8080/healthz` returns `ok` for all upstreams
- [ ] Billing team: [Testing Stripe Webhooks Locally](stripe-webhooks-locally.md)

## Day 2–3 — Learn the Architecture
Read, in this order:
1. [Service Boundaries](../concepts/service-boundaries.md) — the rules every service follows
2. [User Login Flow](../systems/user-login-flow.md) and [JWT Session Tokens](../concepts/jwt-session-tokens.md)
3. [Checkout Journey](../systems/checkout-journey.md)
4. Service pages: [API Gateway](../entities/api-gateway.md), [Auth Service](../entities/auth-service.md), [Billing Service](../entities/billing-service.md), [Notification Service](../entities/notification-service.md)
5. Infrastructure: [Postgres](../entities/postgres.md), [Redis](../entities/redis.md), [Kafka](../entities/kafka.md)

Recent feature write-ups are a good way to see how the team designs things:
- [Refresh Token Rotation](../features/refresh-token-rotation.md)
- [Usage-Based Billing](../features/usage-based-billing.md)
- [Gateway Rate Limiting](../features/gateway-rate-limiting.md)

## Day 3–4 — Ship Something
- [ ] Pick a `good-first-issue` ticket from your team's board
- [ ] If it touches a schema, read [Database Migrations](database-migrations.md) **before** writing the migration
- [ ] Open a PR; CI runs lint, unit tests, and contract tests
- [ ] Merge → Argo CD deploys to staging automatically; promote to prod with your buddy

## Day 5 — Operations
- [ ] Skim the runbooks so you know they exist:
  - [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md)
  - [Kafka Consumer Lag](../runbooks/kafka-consumer-lag.md)
  - [Postgres Connection Pool Exhaustion](../runbooks/postgres-connection-pool-exhaustion.md)
- [ ] Join a PagerDuty shadow rotation for the following week
- [ ] Write up anything confusing from this week into `raw/how-to/` — future hires will thank you

## Who to Ask

| Area | Team | Channel | Good first contact |
|---|---|---|---|
| Login, tokens, SSO | Identity | `#identity-eng` | @alice |
| Billing, Stripe, invoices | Billing | `#billing-eng` | @marcus |
| Gateway, Kafka, notifications | Platform | `#platform-eng` | @priya |
| Infra, Argo, on-call, databases | SRE / Platform | `#platform-eng` | @dan |

## Related Concepts & Dependencies
- [Local Development Environment Setup](local-dev-environment.md)
- [Database Migrations](database-migrations.md)
- [Testing Stripe Webhooks Locally](stripe-webhooks-locally.md)

## Change History & Superseded Decisions
- **2026-10-01**: Created by compiling setup, Stripe, and migration notes into a single new-hire checklist (feedback from @sam's first two weeks).
