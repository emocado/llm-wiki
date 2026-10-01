# Meeting Notes — Billing architecture sync

**Date:** 2026-09-15  
**Attendees:** @marcus, @priya, @dan, @alice, @sam (shadowing)  
**Topic:** Architectural Discussion — reliability of billing domain events  

---

## 1. Context & Goals
On 2026-09-08 a billing-service pod was OOM-killed between committing an invoice row and publishing `billing.invoice.v1` to Kafka. 14 customers never received their invoice email (notification-service never saw the event). Found via a customer support ticket 3 days later.

Today we publish to Kafka *after* the DB transaction commits ("dual write"). There is no atomicity between the two. Goal: decide how to make billing events reliable without a distributed transaction.

## 2. Key Decisions Made
- **Adopt the transactional outbox pattern for all billing-service domain events.** Events are written to an `outbox` table in `billing_db` inside the same transaction as the business change. A relay publishes them to Kafka.
- Relay implementation: in-process poller in billing-service (`OutboxRelay`, `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100` every 500ms). Debezium CDC considered but rejected for now (another moving part, MSK Connect cost).
- Delivery semantics are **at-least-once**. Consumers (notification-service first) must dedupe on `event_id`. Priya to add a `processed_events` table to notification-service.
- Outbox rows retained 7 days after publish, then deleted by a nightly job.
- The new `usage.events.v1` consumer side is unaffected (billing-service is a consumer there, not a producer of domain events).

## 3. Superseded Decisions / Deprecations
- Supersedes the 2025 decision "billing-service publishes directly to Kafka after commit" (from the original billing-service design doc). Direct `kafkaProducer.send()` calls from request handlers are now disallowed in billing-service — ESLint rule to follow.

## 4. Action Items & Follow-ups
- [ ] @marcus — implement `outbox` table + `OutboxRelay` (after usage metering ships, target sprint 40)
- [ ] @priya — idempotent consumer in notification-service (`processed_events`)
- [ ] @dan — Datadog monitor: `billing.outbox.oldest_unpublished_age > 60s` → page Billing
- [x] @marcus — backfill the 14 lost invoice emails (done during the meeting via admin tool)
- [ ] @alice — consider the same pattern for `auth.user.v1` (not urgent)
