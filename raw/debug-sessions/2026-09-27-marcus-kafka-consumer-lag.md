# kafka lag on billing usage consumer — sat 27 sep

**Author:** @marcus (on-call)  
**Paged:** PagerDuty `billing-usage-consumer lag > 50k for 10m` at 09:41

---

ok what I saw:
- `usage.events.v1` consumer group `billing-usage-aggregator` lag 210k and climbing, 12 partitions, but lag only on partitions 3 and 7. others ~0.
- billing pods (6 replicas) CPU fine, no errors in logs except a lot of:
```
WARN [UsageAggregator] slow batch: partition=7 size=500 took=48211ms
```

checked kafka-ui (`kubectl -n platform port-forward svc/kafka-ui 8081:80`) → partitions 3 & 7 assigned to pod billing-7d4f..-q8x. and that pod rebalancing every ~5 min:
```
INFO [Consumer] group rebalancing ... reason: member left (max.poll.interval.ms exceeded)
```

so: batch takes 48s > max.poll.interval (we have 30s in config?!), consumer gets kicked, rebalance, partitions reassigned, same slow batch replays on whatever pod picks it up, gets kicked again. classic poison-ish loop.

why's partition 7 slow? hot key. one customer (acct_8812, big enterprise trial) started sending ~40x normal usage events friday night — they all hash to same partition (key = account_id). And per-event we do an upsert to `usage_meter` with `SELECT ... FOR UPDATE` on the same row → row lock contention, serialized.

## what I did
1. 09:58 — bumped `max.poll.interval.ms` to 300000 + reduced `max.poll.records` 500→100 via configmap, restarted. rebalances stopped.
2. 10:15 — lag on p7 draining but slow (~2k/min).
3. 10:30 — hotfix: pre-aggregate in memory per (account, meter, minute) within a batch before writing → 1 upsert per bucket instead of per event. PR billing#2218 (approved by priya on slack, merged 10:52)
4. 11:20 — lag 0. 

## followups
- [ ] alert on per-partition lag skew, not just total
- [ ] consider keying by account_id+meter_id to spread hot accounts (but ordering per meter is what matters, so ok)
- [ ] write a runbook — doing it now kinda
- note for dashboards: Datadog metric is `kafka.consumer_lag` tagged `consumer_group`, `partition`. There's also `aws.kafka.max_offset_lag` from MSK but it's 1-min delayed.
