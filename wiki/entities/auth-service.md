---
title: "Auth Service"
last_updated: "2026-10-01"
sources:
  - "raw/templates/rfc-proposal.md"
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
- **Token Minting:** Mints short-lived (15 min) access tokens and rotatable refresh tokens.
- **SSO Integration:** Manages Google and SAML identity provider handshakes.

## Key Invariants
- Adheres to the [Service Boundaries](../concepts/service-boundaries.md) principle: no other service has direct read or write access to the identity database.
- Participates as the primary authority in the [User Login Flow](../systems/user-login-flow.md).

## Related Documents
- Architecture Concept: [Service Boundaries](../concepts/service-boundaries.md)
- Primary User Journey: [User Login Flow](../systems/user-login-flow.md)

## Change History
- **2026-10-01**: Bootstrapped initial entity specification.
