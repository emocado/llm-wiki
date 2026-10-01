# Worklog — Refresh token rotation (sprint 38)

**Author:** @alice (Identity)  
**Date:** 2026-09-12  
**Ticket:** IDN-482 · **PRs:** #1432, #1437, #1441

---

## What I worked on

This sprint I picked up refresh token rotation for auth-service. Context: our refresh tokens were long-lived (30 days), opaque, and **reusable**. If one leaked (browser extension, log line, whatever) the attacker had a month of silent access. Security review in August flagged it as P1.

Goal: every `/v1/auth/refresh` call returns a *new* refresh token and invalidates the old one. If an already-used token shows up again → assume theft and kill the whole session ("family").

## Approach

Went with the token family model (basically what Auth0 / the OAuth 2.1 BCP describe):

- On login we create a `family_id` (uuid v7) and the first refresh token in that family.
- Each refresh token is `rt_<base64url(32 random bytes)>`. We only ever store `sha256(token)`.
- On refresh: look up hash → if `status=active`, mark it `used`, mint the next one in the same family, return it.
- If the hash is already `used` → **reuse detected** → revoke the family, emit `auth.user.v1` `session.revoked` event with `reason=refresh_reuse`.

State lives in Redis (hot path) with Postgres as the audit/durable record. I originally wanted Postgres only but the refresh endpoint p99 went from 9ms to 31ms in staging with `SELECT ... FOR UPDATE` under PgBouncer transaction mode. Not acceptable for mobile clients that refresh on every app foreground.

Redis keys I ended up with:

```
rt:{fid}:{sha256}      HASH  family_id, user_id, status, issued_at, parent, child   TTL = 30d
rtfam:{fid}            HASH  user_id, client_id, status, created_at, last_rotated_at TTL = 30d (sliding)
rtfam:{fid}:tok        SET   of token hashes in the family (for revoke-all)
```

The rotate needs to be atomic or two parallel refreshes (very common — two tabs!) both succeed. Wrote a Lua script:

```lua
-- KEYS[1] = rt:{fid}:{old}, KEYS[2] = rt:{fid}:{new}, KEYS[3] = rtfam:{fid}, KEYS[4] = rtfam:{fid}:tok
local status = redis.call('HGET', KEYS[1], 'status')
if status == false then return redis.error_reply('NOT_FOUND') end
if redis.call('HGET', KEYS[3], 'status') == 'revoked' then return redis.error_reply('REVOKED') end
if status == 'used' then
  return redis.error_reply('REUSE')  -- caller decides grace vs revoke
end
redis.call('HSET', KEYS[1], 'status', 'used', 'child', ARGV[6], 'used_at', ARGV[3])
redis.call('HSET', KEYS[2], 'family_id', ARGV[1], 'user_id', ARGV[2], 'status', 'active',
           'issued_at', ARGV[3], 'parent', ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[5])
redis.call('SADD', KEYS[4], ARGV[6])
redis.call('HSET', KEYS[3], 'last_rotated_at', ARGV[3])
redis.call('EXPIRE', KEYS[3], ARGV[5])
return 'OK'
```

Hash-tagged all keys with `{fid}` so they land on the same slot in ElastiCache cluster mode. First version didn't and I got `CROSSSLOT` errors in staging — wasted half a day on that.

## Dead end: the two-tab problem

Strict reuse detection broke the web app immediately in staging. Two tabs refresh within ~50ms of each other; tab B presents the token tab A just rotated → family revoked → user logged out. Classic.

Fix: **grace window**. If a `used` token is presented within `AUTH_REFRESH_REUSE_GRACE` (default 10s) of being rotated *and* from the same `client_id`, we return the already-minted child token instead of revoking. That's why the old token stores `child`. Outside the window → real reuse → revoke.

Talked to @priya about whether the gateway could dedupe instead — decided no, the gateway shouldn't know token semantics (service boundaries).

## Postgres audit table

```sql
CREATE TABLE refresh_token_families (
  family_id        uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users(id),
  client_id        text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz,
  revoke_reason    text CHECK (revoke_reason IN ('logout','refresh_reuse','admin','password_change'))
);
CREATE INDEX ON refresh_token_families (user_id) WHERE revoked_at IS NULL;
```

Written async (goroutine reading from a bounded channel). If the channel is full we drop + increment `auth.refresh.audit_dropped`. Debated this with myself a lot. Redis is the source of truth for liveness; Postgres is for "show me all sessions" in account settings and for forensics.

## Rollout

- LaunchDarkly flag `auth-refresh-rotation` — percentage rollout by `user_id`.
- Old non-rotating tokens still accepted until they expire naturally (they have no `family_id` → legacy path).
- Staging: 100% since 09-09. Prod: 5% on 09-11, looking fine.

## Metrics added (Datadog)

- `auth.refresh.rotated` (count)
- `auth.refresh.reuse_detected` (count, tag `within_grace:true|false`)
- `auth.refresh.latency` (histogram) — p99 11ms in prod at 5%

## Open questions / TODO

- [ ] Should password change revoke *all* families? (I think yes — ask security.)
- [ ] Mobile team says iOS background refresh can be delayed > 10s. Might need per-client grace.
- [ ] Write the wiki page once rollout hits 100%.
- [ ] JWKS rotation is related but separate — the signing key hasn't rotated since Jan 2025. Next sprint.
