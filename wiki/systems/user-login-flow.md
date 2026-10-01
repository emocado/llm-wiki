---
title: "User Login Flow"
last_updated: "2026-10-01"
sources:
  - "raw/templates/rfc-proposal.md"
tags:
  - system
  - authentication
  - user-journey
status: "active"
---

# User Login Flow

## Overview
Describes the end-to-end journey of a user logging into the application, from client credentials submission to JWT verification.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Web / Mobile App
    participant Gateway as API Gateway
    participant Auth as Auth Service

    User->>Client: Enters email & password
    Client->>Gateway: POST /v1/auth/login
    Gateway->>Auth: Forward credentials
    Auth->>Auth: Verify Argon2id hash
    Auth-->>Gateway: Issue Access Token (JWT) + Refresh Token
    Gateway-->>Client: Set HttpOnly Cookie & Return Access Token
    Client-->>User: Redirect to Dashboard
```

## Relevant Services & Concepts
- Primary Service: [Auth Service](../entities/auth-service.md)
- Architectural Constraints: [Service Boundaries](../concepts/service-boundaries.md)

## Change History
- **2026-10-01**: Flow formalized during wiki bootstrap.
