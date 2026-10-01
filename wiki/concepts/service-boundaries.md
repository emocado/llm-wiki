---
title: "Service Boundaries"
last_updated: "2026-10-01"
sources:
  - "raw/templates/rfc-proposal.md"
tags:
  - architecture
  - microservices
  - boundaries
status: "active"
---

# Service Boundaries

## Overview
Service boundaries define the operational, data ownership, and domain isolation lines across our engineering ecosystem. Services must encapsulate their private storage and interact strictly via versioned public interfaces.

## Key Principles & Invariants
1. **Database Isolation:** Direct cross-service database access is strictly prohibited. All data queries must pass through public APIs or domain events.
2. **Synchronous vs Asynchronous:**
   - Synchronous HTTP/gRPC is reserved for low-latency queries and immediate user-facing reads.
   - Cross-domain state changes must emit asynchronous domain events via message queues.
3. **Decoupled Auth:** Services do not maintain user password hashes; authentication is delegated exclusively to [Auth Service](../entities/auth-service.md).

## Related Concepts & Entities
- Implemented by: [Auth Service](../entities/auth-service.md)
- User Journey: [User Login Flow](../systems/user-login-flow.md)

## Change History & Decisions
- **2026-10-01**: Documented initial boundary conventions during repository bootstrap.
