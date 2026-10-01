---
title: "JWT Session Tokens"
last_updated: "2026-09-26"
sources:
  - "raw/worklogs/alice-chen/2026-09-12-refresh-token-rotation.md"
  - "raw/worklogs/alice-chen/2026-09-26-jwks-key-rotation-followup.md"
  - "raw/worklogs/priya-nair/2026-09-24-gateway-rate-limiting.md"
tags:
  - concept
  - auth
  - jwt
  - security
status: "active"
---

# JWT Session Tokens

## Overview
Lumen sessions use two tokens: a short-lived **access token** (RS256-signed JWT, 15 min) verified statelessly by the [API Gateway](../entities/api-gateway.md), and a long-lived opaque **refresh token** (30 days) that only the [Auth Service](../entities/auth-service.md) understands. Signing keys are published via JWKS and rotate monthly using a three-key model.

## Key Architecture & Responsibilities

### Token types

| | Access token | Refresh token |
|---|---|---|
| Format | JWT (RS256) | `rt_<base64url(32 bytes)>`, opaque |
| Lifetime | 15 min | 30 days, rotated on every use |
| Verified by | api-gateway ext-authz (JWKS) | auth-service only |
| Stored server-side | No | `sha256` only, in Redis + Postgres |
| Transport | `Authorization: Bearer` | HttpOnly, Secure, SameSite=Strict cookie (web); keychain (mobile) |

### Access token claims

```json
{
  "iss": "https://auth.lumen.internal",
  "sub": "usr_3f9a1c",
  "tid": "ten_8Hq2",
  "scp": ["dashboards:read", "reports:export"],
  "sid": "01926f3a-...-family-id",
  "iat": 1759312800,
  "exp": 1759313700
}
```

- The JOSE header carries `kid`, which **must** match a key in the current JWKS.
- `tid` (tenant) feeds [Gateway Rate Limiting](../features/gateway-rate-limiting.md).
- `sid` is the refresh-token family id, so revoking a family can be correlated in logs.

### JWKS and the three-key model
auth-service publishes `https://auth.internal/.well-known/jwks.json` containing up to three keys:

| Slot | Signs? | Published? | Purpose |
|---|---|---|---|
| `next` | No | Yes | Pre-published so caches learn it before use |
| `current` | Yes | Yes | Signs all new access tokens |
| `previous` | No | Yes | Verifies tokens minted before the last rotation |

A monthly CronJob rotates `next → current → previous` and generates a new `next`. Keys live in AWS Secrets Manager under `auth/jwks/{kid}`.

```go
func (ks *KeySet) Rotate(gen func() (*SigningKey, error)) error {
	n, err := gen()
	if err != nil {
		return err
	}
	ks.Previous, ks.Current, ks.Next = ks.Current, ks.Next, n
	return nil
}
```

### Gateway JWKS caching
- Cache TTL **1 h** (was 24 h until PR #1491).
- On an unknown `kid`, the gateway refetches JWKS immediately, rate-limited to once per minute.
- Because `next` is published at least one TTL before it signs, unknown `kid`s should not occur in normal operation.

> [!warning] Most common 401 cause
> A `kid` in the token header that is missing from the gateway's cached JWKS. On 2026-09-18 a manual staging rotation with a stale 24 h cache caused ~40 min of 401s. Start with [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md).

### Refresh tokens
Refresh tokens rotate on every use and are grouped into families with reuse detection — see [Refresh Token Rotation](../features/refresh-token-rotation.md).

## Related Concepts & Dependencies
- [Refresh Token Rotation](../features/refresh-token-rotation.md)
- [User Login Flow](../systems/user-login-flow.md)
- [Service Boundaries](../concepts/service-boundaries.md) — only auth-service mints or interprets refresh tokens
- [Auth Service](../entities/auth-service.md), [API Gateway](../entities/api-gateway.md)

## Change History & Superseded Decisions
- **2026-09-26**: Three-key JWKS model and monthly rotation; gateway cache TTL reduced 24 h → 1 h with refetch-on-unknown-`kid` (`2026-09-26-jwks-key-rotation-followup.md`, `2026-09-24-gateway-rate-limiting.md`). Supersedes the single static key `kid=2025-01`.
- **2026-09-12**: Refresh tokens changed from reusable to rotating (`2026-09-12-refresh-token-rotation.md`).
