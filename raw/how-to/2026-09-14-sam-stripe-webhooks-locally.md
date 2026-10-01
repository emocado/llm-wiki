# How I got stripe webhooks working locally (week 2 notes)

**Author:** @sam  
**Date:** 2026-09-14  

Context: picking up my first ticket BILL-1182 (handle `invoice.payment_failed` → send dunning email). Needed real webhook events hitting my local billing-service. Writing this down bc it took me most of a day.

## what I tried first (didn't work)
- tried to use the shared staging stripe webhook endpoint → no, that points at staging cluster obv
- tried posting a hand-written JSON to `localhost:3002/webhooks/stripe` → `400 No signatures found matching the expected signature for payload`. Signature verification is ON locally too (good, but confusing)

## what worked
marcus pointed me to stripe CLI:

```
brew install stripe/stripe-cli/stripe
stripe login   # pick "Lumen (Test mode)" account, ask #billing-eng for invite if you don't see it
stripe listen --forward-to localhost:3002/webhooks/stripe \
  --events invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted
```

it prints:
```
> Ready! Your webhook signing secret is whsec_3f9a... (^C to quit)
```

COPY THAT into `services/billing-service/.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_3f9a...
```
then restart billing-service (nest --watch does NOT pick up .env changes, have to ctrl-c `make dev`)

trigger events:
```
stripe trigger invoice.payment_failed
```

and in billing logs:
```
[WebhookController] received evt_1Q... type=invoice.payment_failed
[InvoiceHandler] idempotency key stripe:evt_1Q... -> processed
```

## gotchas
- the whsec_ secret changes every time you run `stripe listen` unless you pass `--api-key` w/ a restricted key... actually it's stable per device per account. but if you `stripe login` again it changes. 
- `stripe trigger` creates NEW customers in the test account each time, they're not in our local billing_db so the handler logs `customer not found, skipping`. Marcus says use `make seed-stripe` which creates fixture customers in stripe test mode with `metadata.lumen_account_id` matching seed accounts. Then use `stripe trigger invoice.payment_failed --override invoice:customer=cus_SEED_ACME`. 
- events get processed twice if you run two `stripe listen` in different terminals lol
- replaying: `stripe events resend evt_xxx` — handy for testing idempotency, second one should log `already processed`

q for marcus: should we doc this properly? (he said yes, so here it is)
