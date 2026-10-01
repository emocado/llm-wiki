---
title: "Testing Stripe Webhooks Locally"
last_updated: "2026-10-01"
sources:
  - "raw/how-to/2026-09-14-sam-stripe-webhooks-locally.md"
tags:
  - guide
  - billing
  - stripe
  - local-dev
status: "active"
---

# Testing Stripe Webhooks Locally

## Overview
[Billing Service](../entities/billing-service.md) reacts to Stripe events (`invoice.paid`, `invoice.payment_failed`, subscription changes). Signature verification is enforced in every environment, including local, so you cannot simply POST JSON at the endpoint. Use the Stripe CLI to forward signed test-mode events to your machine.

## Prerequisites
- A working [local dev environment](local-dev-environment.md) with billing-service running on `localhost:3002`.
- Access to the **Lumen (Test mode)** Stripe account — ask in `#billing-eng` for an invite.

## Steps

### 1. Install and log in

```bash
brew install stripe/stripe-cli/stripe
stripe login          # choose "Lumen (Test mode)"
```

### 2. Seed Stripe fixtures

```bash
make seed-stripe
```

This creates test-mode customers (e.g. `cus_SEED_ACME`) whose `metadata.lumen_account_id` matches the local seed accounts. Without it, events reference customers that don't exist in your local `billing_db` and the handler logs `customer not found, skipping`.

### 3. Start forwarding

```bash
stripe listen --forward-to localhost:3002/webhooks/stripe \
  --events invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted
```

```text
> Ready! Your webhook signing secret is whsec_3f9a... (^C to quit)
```

### 4. Configure the signing secret

Add it to `services/billing-service/.env.local` and **restart `make dev`** (the Nest watcher does not reload env vars):

```bash
STRIPE_WEBHOOK_SECRET=whsec_3f9a...
```

> [!note]
> The secret is stable per device and Stripe account, but changes if you run `stripe login` again.

### 5. Trigger events

```bash
# Generic event (creates a throwaway customer — handler will skip it)
stripe trigger invoice.payment_failed

# Targeted at a seeded customer — this is what you usually want
stripe trigger invoice.payment_failed --override invoice:customer=cus_SEED_ACME
```

Expected billing-service logs:

```text
[WebhookController] received evt_1Q... type=invoice.payment_failed
[InvoiceHandler] idempotency key stripe:evt_1Q... -> processed
```

### 6. Test idempotency with replays

```bash
stripe events resend evt_1Q...
```

The second delivery must log `already processed`. Webhook handlers key on the Stripe event ID — see [Idempotency Keys](../concepts/idempotency-keys.md).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `400 No signatures found matching the expected signature` | Missing/stale `STRIPE_WEBHOOK_SECRET` | Copy the secret from `stripe listen` output, restart `make dev` |
| `customer not found, skipping` | Event references non-seeded customer | `make seed-stripe` and use `--override invoice:customer=cus_SEED_...` |
| Every event processed twice | Two `stripe listen` sessions running | Kill the extra terminal |
| Nothing arrives | Wrong port / path | Billing listens on `3002`, path `/webhooks/stripe` |

> [!warning]
> Never point `stripe listen` at the shared staging endpoint or use live-mode keys locally.

## Related Concepts & Dependencies
- [Stripe API](../entities/stripe-api.md)
- [Billing Service](../entities/billing-service.md)
- [Checkout Journey](../systems/checkout-journey.md)
- [Idempotency Keys](../concepts/idempotency-keys.md)
- [Usage-Based Billing](../features/usage-based-billing.md)

## Change History & Superseded Decisions
- **2026-10-01**: Created from `raw/how-to/2026-09-14-sam-stripe-webhooks-locally.md` (written while working on BILL-1182, dunning emails).
