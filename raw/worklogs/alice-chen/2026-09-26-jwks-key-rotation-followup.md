# Worklog — JWKS signing key rotation + refresh rotation follow-ups

**Author:** @alice (Identity)  
**Date:** 2026-09-26  
**Tickets:** IDN-501, IDN-488 · **PRs:** #1489, #1495, #1502

---

## Refresh rotation status

- Prod rollout: 5% → 25% (09-15) → 100% (09-22). Flag `auth-refresh-rotation` now permanently on; cleanup PR #1502 removes the legacy path after 2026-10-22 (30 days, when the last non-family token expires).
- Reuse detections in prod: ~40/day, ~92% within grace (two-tab case). The ~3/day outside grace — I spot-checked 10; 7 were iOS background refresh being slow, 3 looked genuinely weird (different ASN). Bumped grace for mobile clients to 30s. Per-client grace is now config:

```yaml
# deploy/auth-service/values-prod.yaml
refresh:
  reuseGrace:
    default: 10s
    ios-app: 30s
    android-app: 30s
```

- Security answered: yes, password change revokes all families. Done in #1495.

## JWKS key rotation

We sign access JWTs with RS256. Key `kid=2025-01` has been live for 20 months. Nobody had rotated because "the gateway caches JWKS and we're scared". Fair.

How verification works today: api-gateway ext-authz filter fetches `https://auth.internal/.well-known/jwks.json` and caches it for **24h**. That's the scary part — if we swap the key, the gateway rejects new tokens for up to a day.

Plan I implemented:

1. auth-service now supports multiple keys in JWKS: `current` (signs) + `next` (published, not signing) + `previous` (published, not signing, still verifies).
2. Rotation = promote `next` → `current`, `current` → `previous`, generate new `next`. Run by a CronJob monthly.
3. Asked @priya to drop the gateway JWKS cache TTL to 1h and **refetch on unknown kid** (rate-limited to 1/min). That landed in her PR #1491.

Since `next` is published ≥ 1 cache TTL before it starts signing, nobody ever sees an unknown kid in the normal case.

```go
type KeySet struct {
	Current  *SigningKey // signs new tokens
	Next     *SigningKey // published only
	Previous *SigningKey // published, verify-only until max token TTL passes
}

func (ks *KeySet) Rotate(gen func() (*SigningKey, error)) error {
	n, err := gen()
	if err != nil {
		return err
	}
	ks.Previous, ks.Current, ks.Next = ks.Current, ks.Next, n
	return nil
}
```

Keys stored in AWS Secrets Manager under `auth/jwks/{kid}`; the CronJob writes, the pods pick them up via the Secrets Store CSI driver.

## Incident-ish thing on 09-18

Before the gateway change shipped, I did a manual rotation in staging and broke every request with 401s for ~40 minutes. Exactly the 24h-cache problem — I'd forgotten one staging gateway pod hadn't restarted. Dan helped debug; we wrote it up as the 401 debugging runbook. Lesson: **check `kid` in the token header vs JWKS first**, it's always that.

## TODO

- [ ] First real prod rotation scheduled 2026-10-05 with Dan on call.
- [ ] Add `gateway.jwks.unknown_kid` metric on the gateway side (Priya).
- [ ] Update the JWT concept page in the wiki with the 3-key model.
