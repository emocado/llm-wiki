---
title: "Auth Service"
last_updated: "2026-10-01"
sources:
  - "raw/templates/rfc-proposal.md"
  - "raw/worklogs/alice-chen/2026-09-12-refresh-token-rotation.md"
  - "raw/worklogs/alice-chen/2026-09-26-jwks-key-rotation-followup.md"
  - "raw/debug-sessions/2026-09-18-alice-401s-after-deploy.md"
tags:
  - service
  - auth
  - identity
status: "active"
---

# Auth Service

## Overview
The `Auth Service` handles identity verification, user authentication, OAuth2 federation, and JSON Web Token (JWT) issuance.

## Responsibilities & Endpoints
- **Identity Storage:** Encapsulates the user credentials database and hashing salts (Argon2id).
- **Token Minting:** Mints short-lived (15 min) access JWTs and opaque refresh tokens that rotate on every use. See [JWT Session Tokens](../concepts/jwt-session-tokens.md) and [Refresh Token Rotation](../features/refresh-token-rotation.md).
- **Key Management:** Publishes the JWKS used by the [API Gateway](api-gateway.md), and rotates signing keys monthly.
- **Events:** Publishes `auth.user.v1` to [Kafka](kafka.md).
- **Storage:** `auth_db` on [Postgres](postgres.md); refresh-token families in [Redis](redis.md). Owned by Identity ([Alice Chen](../people/alice-chen.md)).
- **SSO Integration:** Manages Google and SAML identity provider handshakes.

## Key Invariants
- Adheres to the [Service Boundaries](../concepts/service-boundaries.md) principle: no other service has direct read or write access to the identity database.
- Participates as the primary authority in the [User Login Flow](../systems/user-login-flow.md).

## Related Documents
- Architecture Concept: [Service Boundaries](../concepts/service-boundaries.md)
- Primary User Journey: [User Login Flow](../systems/user-login-flow.md)
- Runbook: [Debugging 401 Unauthorized](../runbooks/debugging-401-unauthorized.md)

## Change History
- **2026-10-01**: Bootstrapped initial entity specification.
- **2026-10-01**: Added refresh-token rotation, JWKS rotation, and storage details from Alice's worklogs. The old non-rotating refresh tokens are **superseded**.
