---
title: "Stripe API"
last_updated: "2026-10-01"
sources:
  - "raw/how-to/2026-09-14-sam-stripe-webhooks-locally.md"
  - "raw/rfcs/2026-09-05-rfc-usage-based-billing.md"
tags:
  - vendor
  - billing
  - stripe
status: "active"
---

# Stripe API

## Overview
Stripe is Lumen's payment processor and billing engine. It handles customers, subscriptions, invoices, Billing Meters for usage-based pricing, and Checkout Sessions. Only the [Billing Service](billing-service.md) talks to Stripe.

## Key Architecture & Responsibilities
- **API version is pinned** in `services/billing/src/stripe/client.ts`. Upgrades go through a PR reviewed by Billing.
- **Accounts** — the `test` mode account serves local, dev, and staging; `live` serves prod only. Keys live in AWS Secrets Manager (`billing/stripe/*`).
- **Webhooks** — endpoint `/webhooks/stripe`. Signatures are verified with `STRIPE_WEBHOOK_SECRET`, and events are deduplicated on `event.id`. See [Stripe Webhooks Locally](../guides/stripe-webhooks-locally.md).
- **Events we handle** — `checkout.session.completed`, `customer.subscription.updated`, `invoice.finalized`, `invoice.payment_failed`, `invoice.paid`.
- **Metered usage** — hourly meter events per [Usage-Based Billing](../features/usage-based-billing.md).

### Invariants
- Every mutating call sends an `Idempotency-Key` ([Idempotency Keys](../concepts/idempotency-keys.md)).
- Stripe calls never run inside a DB transaction (see the [2026-09-29 postmortem runbook](../runbooks/postgres-connection-pool-exhaustion.md)).

## Related Concepts & Dependencies
- Journey: [Checkout Journey](../systems/checkout-journey.md)

## Change History & Superseded Decisions
- **2026-10-01**: Page created.
