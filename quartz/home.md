---
title: Lumen Engineering Wiki
---

The single place for how Lumen's platform works, how to set things up, how to debug them, and what people are building right now. It replaces the old Confluence space.

> [!tip] New here?
> Start with the [Onboarding: First Week](wiki/guides/onboarding-first-week.md) checklist, then [set up your local environment](wiki/guides/local-dev-environment.md).

## Spaces

| Space | What's in it |
| --- | --- |
| [Knowledge Base Index](wiki/index.md) | Full catalog of every compiled page |
| [Guides](wiki/guides/) | Step-by-step how-tos: local setup, migrations, webhooks |
| [Runbooks](wiki/runbooks/) | Debugging and incident playbooks |
| [Features](wiki/features/) | Implementation write-ups of shipped and in-flight work |
| [Systems](wiki/systems/) · [Entities](wiki/entities/) · [Concepts](wiki/concepts/) | Architecture: journeys, services, patterns |
| [People](wiki/people/) | Team directory and personal spaces |
| [Raw sources](raw/) | Worklogs, debug notes, meeting notes, RFCs and postmortems as engineers wrote them |
| [Compilation Log](wiki/log.md) | What changed in the wiki and why |

## How this wiki stays fresh

Engineers drop notes into `raw/` (a worklog, a debug session, meeting notes). An LLM agent compiles them into the structured pages under `wiki/`, updates cross-links and the index, and opens a PR. On merge, this site redeploys. See the [README](https://github.com/emocado/llm-wiki/blob/main/README.md) for the full workflow.
