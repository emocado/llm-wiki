---
title: "Sam Reyes"
last_updated: "2026-09-30"
sources:
  - "raw/worklogs/sam-reyes/2026-09-30-week-one-invoice-pdf-bugfix.md"
tags:
  - person
  - team-billing
  - new-hire
status: "active"
---

# Sam Reyes

## Overview
Software Engineer on the **Billing** team, joined **2026-09-28**. Onboarding buddy: [Marcus Obi](marcus-obi.md).

| | |
|---|---|
| **Handle** | @sam |
| **Team** | Billing |
| **Slack** | `#billing-eng` |
| **Timezone** | America/Chicago |

## Current Focus
- Onboarding — see [Onboarding: First Week](../guides/onboarding-first-week.md).
- BIL-236: JPY (zero-decimal currency) handling in invoice PDFs.

## Recent Work
| Date | Work | Links |
|---|---|---|
| 2026-09-30 | BIL-233: locale-aware currency formatting in invoice PDFs (first PR) | [week-one notes](../../raw/worklogs/sam-reyes/2026-09-30-week-one-invoice-pdf-bugfix.md) · #1508 |

### Week-one lessons (useful for the next new hire)
- Remove `nvm` from your shell before `mise install`, or Node versions conflict — see [Local Dev Environment](../guides/local-dev-environment.md).
- Give Docker Desktop at least 8 GB RAM or `billing-db` never passes its healthcheck.
- Money is integer cents in `billing_db`; format with `Intl.NumberFormat` only at the edge.
- Webhook testing needs the Stripe CLI — [Stripe Webhooks Locally](../guides/stripe-webhooks-locally.md).

## Related Concepts & Dependencies
- [Billing Service](../entities/billing-service.md)
- [Idempotency Keys](../concepts/idempotency-keys.md) — ask in `#billing-eng` before touching `src/stripe/`

## Change History & Superseded Decisions
- **2026-09-30**: Page created from week-one notes.
