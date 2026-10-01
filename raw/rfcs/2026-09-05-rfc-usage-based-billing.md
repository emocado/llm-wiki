# RFC: Usage-based billing for the Analytics Pro plan

**Status:** Accepted  
**Author:** @marcus  
**Date:** 2026-09-05  
**Reviewers:** @priya, @dan, @alice

---

## 1. Summary
Introduce metered billing for the new Analytics Pro plan: customers pay a base fee plus $0.002 per dashboard query and $0.50 per GB exported. Product services emit usage events to Kafka; billing-service aggregates them hourly and reports to Stripe's Billing Meters API, which invoices monthly.

## 2. Motivation & Problem Statement
- Sales is losing large prospects who don't fit seat-based pricing (few seats, huge query volume).
- Today billing-service only understands fixed `price_id`s per seat. No concept of usage.
- Finance requires usage invoiced to be reconcilable to source events within 0.1%.

## 3. Detailed Proposal & Architecture

### Flow
```
query-service / export-service
     │  produce
     ▼
usage.events.v1  (24 partitions, key = tenant_id, retention 3d)
     │  consume (group: billing-usage)
     ▼
billing-service UsageConsumer ──► usage_hourly (billing_db)
                                     │ every 15 min
                                     ▼
                              UsageReporter ──► Stripe meter_events
                                     │ nightly
                                     ▼
                              Reconciler ──► Datadog + Slack #billing-alerts
```

### Event contract (`usage.events.v1`, JSON, schema_version 1)
| field | type | notes |
|---|---|---|
| event_id | uuid v7 | required, global dedupe key |
| tenant_id | string | `ten_*` |
| metric | enum | `dashboard.query`, `export.bytes` |
| quantity | int64 | count or bytes |
| occurred_at | RFC3339 | producer clock |
| schema_version | int | currently `1` |

### Schema changes (`billing_db`)
```sql
CREATE TABLE usage_hourly (
  tenant_id          text        NOT NULL,
  metric             text        NOT NULL,
  hour               timestamptz NOT NULL,
  quantity           bigint      NOT NULL DEFAULT 0,
  reported_quantity  bigint      NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, metric, hour)
);

CREATE TABLE usage_events_seen (
  event_id uuid        NOT NULL,
  seen_at  timestamptz NOT NULL,
  PRIMARY KEY (event_id, seen_at)
) PARTITION BY RANGE (seen_at);
```

### Stripe
- One Stripe Meter per metric (`lumen_dashboard_query`, `lumen_export_bytes`).
- Subscription items with metered prices attached at plan upgrade.

## 4. Drawbacks & Trade-offs
- Up to ~15 min (+ Stripe's own lag) between usage and what customers see in the billing portal.
- `usage_events_seen` grows fast (~40M rows/day at projected volume) — mitigated by daily partitions + 7-day drop.
- At-least-once Kafka delivery means correctness depends entirely on producers setting stable `event_id`s.

## 5. Alternatives Considered
- **Send every event straight to Stripe:** rejected — Stripe rate limits and no way to reconcile.
- **Aggregate in the producers:** rejected — pushes billing logic into every product service, violates service boundaries.
- **Third-party metering vendor (Metronome/Orb):** good fit, but 6-week procurement and data residency review. Revisit in 2027.
