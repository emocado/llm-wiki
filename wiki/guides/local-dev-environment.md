---
title: "Local Development Environment Setup"
last_updated: "2026-10-01"
sources:
  - "raw/how-to/2026-09-08-dan-local-dev-setup-notes.md"
tags:
  - guide
  - setup
  - local-dev
  - onboarding
status: "active"
---

# Local Development Environment Setup

## Overview
How to get the full `lumen/platform` monorepo running on your machine: all four services ([API Gateway](../entities/api-gateway.md), [Auth Service](../entities/auth-service.md), [Billing Service](../entities/billing-service.md), [Notification Service](../entities/notification-service.md)) plus their backing stores, via `mise` + `make` + Docker Compose. Expect ~30 minutes on a fresh machine.

> [!warning] Superseded instructions
> The 2024 Confluence page recommended `nvm`/`pyenv` and Postgres on port `5432`. Both are obsolete: tool versions are now pinned by `mise`, and local databases run on ports `5433`/`5434`.

## Prerequisites

| Tool | Version | Install (macOS) | Notes |
|---|---|---|---|
| Docker Desktop | ≥ 4.30 | download from docker.com | **Set memory ≥ 8 GB** (Settings → Resources) |
| mise | latest | `brew install mise` | Manages Go / Node / Python versions |
| awscli, kubectl, jq | latest | `brew install awscli kubectl jq` | Needed for staging access, not for local-only work |
| GitHub SSH key | — | [GitHub docs](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) | Must be in the `lumen` org with SSO authorised |

Pinned language versions (from `.mise.toml`):

```toml
[tools]
go = "1.23"
node = "22"
python = "3.12"
```

## Setup Steps

### 1. Clone and install toolchains

```bash
git clone git@github.com:lumen/platform.git
cd platform
mise trust && mise install
```

Make sure mise is activated in your shell, otherwise you will see `go: command not found`:

```bash
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc   # or bash
```

### 2. Run the doctor

```bash
make doctor
```

`make doctor` checks tool versions, free ports, and Docker memory allocation. Fix anything red before continuing.

### 3. Bootstrap dependencies

```bash
make bootstrap
```

This runs, in order:
- `npm ci` in `services/billing-service`
- `go mod download` for `api-gateway` and `auth-service`
- `uv sync` for `notification-service`
- copies each service's `.env.example` → `.env.local` (only if missing)
- installs pre-commit hooks

### 4. Start backing services

```bash
make up    # docker compose --profile core up -d
```

| Container | Purpose | Host port |
|---|---|---|
| `auth-db` | Postgres for `auth_db` | `5433` |
| `billing-db` | Postgres for `billing_db` | `5434` |
| `redis` | Refresh-token families, rate-limit counters | `6379` |
| `redpanda` | Kafka-compatible broker (stands in for MSK) | `9092` |
| `kafka-ui` | Topic/consumer browser | `8081` |
| `localstack` | S3 (invoice PDFs), SQS | `4566` |
| `mailpit` | Catches outgoing email from notification-service | `8025` (UI) |

> [!note]
> Locally there is no PgBouncer; services connect to Postgres directly. See [Postgres](../entities/postgres.md) for how production differs.

### 5. Migrate and seed

```bash
make migrate   # runs goose / prisma / alembic for each service
make seed      # creates seed accounts, plans, dev@lumen.test user
```

See [Database Migrations](database-migrations.md) for per-service migration tooling.

### 6. Run the services

```bash
make dev   # air (Go), nest --watch (billing), uvicorn --reload (notification)
```

### 7. Verify

```bash
$ curl -s localhost:8080/healthz | jq
{
  "status": "ok",
  "upstreams": { "auth": "ok", "billing": "ok", "notification": "ok" }
}

$ make login-dev        # prints a dev JWT for dev@lumen.test
$ curl -s -H "Authorization: Bearer $(make -s login-dev)" localhost:8080/v1/me | jq .email
"dev@lumen.test"
```

If both commands succeed, you're done.

## Platform-Specific Gotchas

> [!tip] Apple Silicon
> All compose images are multi-arch. If you see `exec format error`, you are on an old branch that pinned an amd64-only `localstack` digest — rebase onto `main` (fixed in platform#4412).

> [!warning] Windows
> Use **WSL2 (Ubuntu)** with Docker Desktop's WSL integration enabled. Clone the repo **inside the Linux filesystem** (`~/code/platform`), never under `/mnt/c/...` — file watching breaks and builds are ~10× slower across the 9P boundary.

> [!warning] Docker memory
> With the default 4 GB, Redpanda gets OOM-killed and silently restarts, causing consumers to hang. Allocate at least 8 GB.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `go: command not found` | mise not activated in shell | Add `mise activate` to shell rc, open new terminal |
| `relation "plans" does not exist` during seed | Migrations not run | `make migrate && make seed` |
| `port is already allocated` on 5433/5434 | Another local Postgres | Stop Postgres.app / Homebrew postgres, or change `*_DB_PORT` in `.env.local` |
| Kafka consumers hang, Redpanda restarting | Docker memory too low | Raise Docker memory to ≥ 8 GB |
| Prisma: `drift detected` | Local schema diverged | `make db-reset` (drops, migrates, re-seeds both DBs) |
| `.env` change not picked up | Watchers don't reload env | Restart `make dev` |
| Webhook signature errors in billing | Missing local Stripe secret | Follow [Stripe Webhooks Locally](stripe-webhooks-locally.md) |

## Related Concepts & Dependencies
- [Onboarding: First Week](onboarding-first-week.md)
- [Database Migrations](database-migrations.md)
- [Stripe Webhooks Locally](stripe-webhooks-locally.md)
- [Kafka](../entities/kafka.md), [Redis](../entities/redis.md), [Postgres](../entities/postgres.md)

## Change History & Superseded Decisions
- **2026-10-01**: Compiled from `raw/how-to/2026-09-08-dan-local-dev-setup-notes.md`. Supersedes the 2024 nvm/pyenv-based instructions and the `5432` port convention. Added `make doctor` as the first verification step.
