# debug log: spike of 401s after auth-service deploy (2026-09-18)

**Author:** @alice  
**Ticket:** IDN-772  
**Status:** resolved

---

14:02 — deployed auth-service v2.31.0 (includes scheduled signing key rotation: new `kid=2026-09-a`, old `kid=2026-06-b` kept in JWKS for 24h)

14:05 — #alerts-identity: `gateway.authz.denied rate > 5%` fires. Datadog shows ~18% of requests 401 at api-gateway, not uniform — some pods fine.

14:09 — grabbed a failing token from a customer HAR (support ticket), decoded:
```
$ echo $TOKEN | cut -d. -f1 | base64 -d
{"alg":"RS256","kid":"2026-09-a","typ":"JWT"}
```
new kid. so tokens minted by new auth pods, rejected by *some* gateway pods.

14:12 — gateway logs:
```
kubectl -n platform logs deploy/api-gateway -c ext-authz --since=15m | grep -i kid | head
{"level":"warn","msg":"jwt verify failed","err":"kid \"2026-09-a\" not found in JWKS cache","pod":"api-gateway-7c9f-xk2lp"}
```
gateway caches JWKS for **1 hour** and only refreshes on TTL. Pods that refreshed before 14:02 don't know the new kid.

hypothesis 2 (ruled out): clock skew. some 401s had `token used before issued (iat)`. checked: 3 nodes in `us-east-1c` had chrony drift ~4s. our leeway is 2s?? turns out leeway was 0 in config. separate bug but contributing ~1% of failures. 

14:20 — mitigation: `kubectl -n platform rollout restart deploy/api-gateway` → fresh JWKS fetch. 401 rate back to baseline 0.3% by 14:26.

## root causes
1. ext-authz JWKS cache has no "refetch on unknown kid". Rotation procedure assumed caches pick up new key within TTL but auth started *signing* with new key immediately.
2. clock leeway = 0s in gateway jwt verifier.

## fixes
- [x] PR platform#4450: on unknown kid, refetch JWKS (rate-limited to 1/min per pod). @priya reviewed
- [x] PR platform#4451: leeway 30s for `iat`/`nbf`/`exp`
- [x] rotation procedure: publish new key in JWKS ≥ 2h (2x cache TTL) BEFORE signing with it. Added `SIGNING_KEY_ACTIVATE_AT` config to auth-service
- [ ] node clock drift alert in datadog (@dan)

## handy commands for next time
```
# who issued / which kid
jwt decode $TOKEN            # (brew install mike-engel/jwt-cli/jwt-cli)
# what the gateway sees as current JWKS
curl -s https://auth.internal.lumen.io/.well-known/jwks.json | jq '.keys[].kid'
# datadog
service:api-gateway @msg:"jwt verify failed" | group by @err
```
