---
title: "Alice Chen"
last_updated: "2026-09-26"
sources:
  - "raw/worklogs/alice-chen/2026-09-12-refresh-token-rotation.md"
  - "raw/worklogs/alice-chen/2026-09-26-jwks-key-rotation-followup.md"
tags:
  - person
  - team-identity
status: "active"
---

# Alice Chen

## Overview
Senior Software Engineer on the **Identity** team. Primary owner of the [Auth Service](../entities/auth-service.md) session and token lifecycle.

| | |
|---|---|
| **Handle** | @alice |
| **Team** | Identity |
| **Slack** | `#identity-eng` |
| **Timezone** | America/Los_Angeles |

## Owns
- [Auth Service](../entities/auth-service.md) — tokens, sessions, JWKS
- [Refresh Token Rotation](../features/refresh-token-rotation.md)
- [JWT Session Tokens](../concepts/jwt-session-tokens.md) — key rotation process

## Current Focus (Q4 2026)
- First production JWKS key rotation on **2026-10-05** (with SRE on call).
- Removing the legacy non-rotating refresh path after 2026-10-22 (#1502).
- Evaluating the [Transactional Outbox](../concepts/transactional-outbox.md) for `auth.user.v1`.

## Recent Work
| Date | Work | Links |
|---|---|---|
| 2026-09-26 | JWKS three-key rotation; per-client reuse grace; password change revokes all sessions | [worklog](../../raw/worklogs/alice-chen/2026-09-26-jwks-key-rotation-followup.md) · #1489 #1495 #1502 |
| 2026-09-18 | Debugged staging 401 storm after manual key rotation | [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md) |
| 2026-09-12 | Refresh token rotation with family reuse detection | [worklog](../../raw/worklogs/alice-chen/2026-09-12-refresh-token-rotation.md) · #1432 #1437 #1441 |

## Related Concepts & Dependencies
- Works closely with [Priya Nair](priya-nair.md) (gateway JWKS caching) and [Dan Kowalski](dan-kowalski.md) (rotation on-call).

## Change History & Superseded Decisions
- **2026-09-26**: Page created from worklogs.
