# local dev setup — notes from re-imaging my laptop

**Author:** @dan  
**Date:** 2026-09-08  
**Context:** new M3 laptop, figured I'd write down everything since the old Confluence page is from 2024 and says to use `nvm` (we don't anymore)

---

ok so the actual order that worked:

1. install homebrew, then `brew install mise docker-credential-helper awscli kubectl jq`
2. docker desktop — **bump memory to 8GB**, default 4GB is NOT enough, kafka + 2 postgres + redis + localstack OOMs and kafka just silently restarts. took me 40 min to figure out
3. clone: `git clone git@github.com:lumen/platform.git && cd platform`
4. `mise trust && mise install` — pulls go 1.23, node 22, python 3.12 from `.mise.toml`
5. `make bootstrap` — this does:
   - `npm ci` in services/billing-service
   - `go mod download` for gateway + auth
   - `uv sync` for notification-service
   - copies `.env.example` -> `.env.local` for each service if missing
   - installs pre-commit hooks
6. `make up` = `docker compose up -d` with the `core` profile (postgres x2, redis, kafka (redpanda actually, locally), localstack, mailpit)
7. `make migrate` then `make seed`
8. `make dev` runs all 4 services with hot reload (air for go, nest --watch, uvicorn --reload)

verify:
```
$ curl -s localhost:8080/healthz
{"status":"ok","upstreams":{"auth":"ok","billing":"ok","notification":"ok"}}

$ make login-dev   # prints a dev JWT for seed user dev@lumen.test
```

gotchas I hit:
- apple silicon: the `localstack` image tag in compose was pinned to an amd64-only digest. switched to `localstack/localstack:3.8` multi-arch. PR #4412
- port 5432 conflict if you have Postgres.app running. our compose maps auth_db to **5433** and billing_db to **5434** anyway but the old docs said 5432
- `make seed` fails with `relation "plans" does not exist` → you forgot `make migrate`
- mise not activated in shell → `go: command not found`. add `eval "$(mise activate zsh)"` to .zshrc

windows folks (priya asked): use WSL2 ubuntu, clone INSIDE the wsl filesystem (`~/code`), NOT /mnt/c — file watching is broken + 10x slower on /mnt/c. docker desktop WSL integration on.

also `make doctor` exists now?? priya added it last month, checks versions + ports + docker mem. use that first.
