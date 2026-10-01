# Worklog — Usage metering pipeline (week 2)

**Author:** @marcus (Billing)  
**Date:** 2026-09-19  
**Epic:** BIL-210 Usage-based billing · **PRs:** #1450, #1458, #1463, #1470

---

Second week on the metering pipeline from the RFC. Writing down where I am because I keep forgetting why I did things.

## Where things are

```
product services ──► usage.events.v1 (Kafka, 24 partitions, key=tenant_id)
                         │
                         ▼
             billing-service: UsageConsumer (NestJS, kafkajs)
                         │  upsert into usage_hourly (tenant, metric, hour)
                         ▼
             UsageReporter cron (every 15 min)
                         │  POST Stripe /v1/billing/meter_events
                         ▼
                      Stripe
```

## Event contract

Agreed with Platform on this. Producers MUST set `event_id` (uuid v7) — that's our dedupe key.

```json
{
  "event_id": "01926f3a-8b1e-7c4d-9a2f-3e5b6c7d8e9f",
  "tenant_id": "ten_8Hq2",
  "metric": "dashboard.query",
  "quantity": 1,
  "occurred_at": "2026-09-18T14:03:11.204Z",
  "schema_version": 1
}
```

## Dedupe — took me two tries

Try 1: dedupe in memory per consumer with an LRU. Broke instantly on rebalance — partition moves to another pod, LRU is empty, duplicates go through. Dumb in hindsight.

Try 2 (current): a `usage_events_seen` table with `event_id` PK, inserted in the **same transaction** as the hourly upsert:

```ts
await this.db.transaction(async (tx) => {
  const inserted = await tx.query(
    `INSERT INTO usage_events_seen (event_id, seen_at) VALUES ($1, now())
     ON CONFLICT DO NOTHING RETURNING event_id`,
    [evt.event_id],
  );
  if (inserted.rowCount === 0) return; // duplicate, skip
  await tx.query(
    `INSERT INTO usage_hourly (tenant_id, metric, hour, quantity)
     VALUES ($1, $2, date_trunc('hour', $3::timestamptz), $4)
     ON CONFLICT (tenant_id, metric, hour)
     DO UPDATE SET quantity = usage_hourly.quantity + EXCLUDED.quantity`,
    [evt.tenant_id, evt.metric, evt.occurred_at, evt.quantity],
  );
});
```

`usage_events_seen` is partitioned by day, partitions dropped after 7 days (Kafka retention is 3 days so anything older can't be redelivered).

Per-message transactions were way too slow (~600 msg/s per pod). Batched: kafkajs `eachBatch`, one transaction per 500 messages with a multi-row insert. Now ~9k msg/s per pod. Offsets committed only after the transaction commits.

## Reporting to Stripe

`UsageReporter` picks hours where `reported_quantity < quantity` and sends the delta. Stripe meter events take an `identifier` for idempotency — I use `"{tenant}:{metric}:{hour}:{reported_quantity}"`, so retrying the same delta is a no-op on Stripe's side but a new delta for the same hour gets a new identifier.

Gotcha: Stripe rejects meter events with timestamps > 35 days old or > 5 min in the future. Late events beyond 35 days get dumped into `usage_late_events` and a human adjusts the invoice. Hasn't happened yet.

## Consumer lag scare

Wednesday the consumer fell 2M messages behind. Turned out the analytics team backfilled a month of `dashboard.query` events into the topic. Nothing was broken; it caught up in 40 min after I scaled to 6 pods. Dan said to write it up — it's in the kafka lag runbook now.

## Open questions

- Raised in billing sync (09-15): we currently publish `billing.invoice.v1` straight to Kafka after the DB commit. If the pod dies between commit and publish we lose the event. Team agreed to move to an outbox. I'll do that after metering ships.
- Reconciliation job: nightly compare `sum(usage_hourly)` vs Stripe's meter event summaries per tenant. Prototype in #1470, alerting threshold TBD (0.1%?).
- [ ] Load test with 20k events/s.
- [ ] Wiki page for the feature once reconciliation is in.
