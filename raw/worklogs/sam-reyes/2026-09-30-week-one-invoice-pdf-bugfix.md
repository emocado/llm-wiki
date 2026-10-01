# Week one notes — invoice PDF bug

**Author:** @sam (Billing, new hire)  
**Date:** 2026-09-30  
**Ticket:** BIL-233 · **PR:** #1508 (my first one!)

---

## Setup

Day 1–2 was mostly getting the local env running. Followed the local dev guide on the wiki. Things that tripped me:

- `mise install` failed on node because I also had nvm on PATH. Removed nvm from `.zshrc`.
- `make up` hung on the `billing-db` healthcheck — Docker Desktop only had 2GB RAM. Bumped to 8GB.
- Needed the Stripe CLI for webhooks; Marcus pointed me at the Stripe webhooks guide.

## The bug

BIL-233: Customers in Germany / France see invoice totals like `€1234.5` instead of `1.234,50 €`. US invoices also showed `$1,234.5` sometimes (missing trailing zero).

Found it in `billing-service/src/invoices/pdf/render.ts`:

```ts
// before
const total = `${currency.symbol}${(invoice.totalCents / 100).toString()}`;
```

Two problems: number `toString()` drops trailing zeros, and it ignores locale entirely.

```ts
// after
const total = new Intl.NumberFormat(invoice.customerLocale ?? 'en-US', {
  style: 'currency',
  currency: invoice.currency.toUpperCase(),
}).format(invoice.totalCents / 100);
```

Marcus pointed out `customerLocale` isn't always set on older customers, hence the fallback. Also learned we never do math on floats — only format at the edge. All amounts are integer cents in `billing_db`.

Wrote snapshot tests for `de-DE`, `fr-FR`, `en-US`, `ja-JP` (JPY has no minor units — `Intl` handles it but our `/ 100` doesn't!). Opened BIL-236 for JPY since we don't sell in JPY yet.

## Things I learned

- Invoices are rendered by billing-service on the `invoice.finalized` webhook from Stripe, then a `billing.invoice.v1` event goes out and notification-service emails it.
- That event publish is moving to an outbox pattern (Marcus explained the 09-15 meeting decision).
- Ask in `#billing-eng` before touching anything in `src/stripe/` — idempotency keys everywhere.

## Questions I still have

- Why do we render PDFs ourselves instead of using Stripe's hosted invoice PDF? (Answer from Marcus: custom branding + usage breakdown tables Stripe can't do.)
- How do I get read access to prod Datadog? (Dan: request `datadog-readonly` in Okta.)
