# LLM Wiki

> A persistent, compounding, agent-maintained knowledge base designed to replace manual wikis like Confluence.

Based on the [LLM Wiki architecture by Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), this repository shifts knowledge management from transient RAG search to **continuous AI compilation**.

---

## The Problem: Why Confluence Fails

Most engineering teams struggle with internal documentation rot:

1. **The Maintenance Tax:** Writing initial documentation is easy; keeping it updated as systems evolve is painful. When an architectural change occurs, nobody remembers to update the 12 disparate Confluence pages that reference it.
2. **The "Graveyard" Effect:** Search queries yield 5-year-old out-of-date design docs alongside current specs, forcing engineers to ask in Slack: *"Is this Confluence page still accurate?"*
3. **The Limitations of Traditional RAG:** Uploading raw documents into a vector database (RAG) doesn't solve this. RAG rediscovers answers from raw, fragmented chunks at query time from scratch. If an architectural decision spans 5 meeting notes and 2 PRDs, RAG must attempt to find and reconcile all 5 chunks every time. There is no accumulated intelligence.

---

## The Solution: The LLM Compilation Model

Instead of querying raw documents on demand, an **LLM Agent acts as the compiler and librarian**:

```
Traditional RAG:
[Raw Documents] ──> Chunker ──> Vector Store ──> [Query: Retrieve + Re-derive from scratch]

LLM Wiki (This Repo):
[Raw Sources]   ──> [LLM Agent Compiler] ──> [Structured, Interlinked Wiki] ──> [Query]
(Immutable notes)   (Runs ingest & lint)      (Compounding Markdown)             (Instant, synthesized)
```

- **Compounding Value:** When new meeting notes, PRDs, or incident postmortems arrive, the agent reads them and integrates facts into existing concept and entity pages.
- **Automated Bookkeeping:** Cross-referencing, contradiction flagging, and catalog updates are performed by the LLM, eliminating the tedious work humans avoid.
- **Docs-as-Code:** The knowledge base is pure Markdown versioned in Git. Every change is tracked, diffable, and reviewable.

---

## The Three-Layer Architecture

```
llm-wiki/
├── raw/                 # Layer 1: Immutable Source Documents (Inputs)
│   ├── templates/       # Standard templates for human inputs
│   └── 2026-10-auth/    # Ingested meeting notes, RFCs, PRDs, transcripts
│
├── wiki/                # Layer 2: The Compiled Knowledge Base (Owned by LLM)
│   ├── concepts/        # Architectural patterns, domain logic, protocols
│   ├── entities/        # Services, databases, third-party vendors, teams
│   ├── systems/         # End-to-end user journeys and cross-cutting flows
│   ├── index.md         # Categorized directory of all wiki pages
│   └── log.md           # Append-only chronological audit log
│
├── scripts/             # Lightweight utilities (e.g. link & orphan linter)
├── .github/workflows/   # CI/CD: Automated PR validation & static site deployment
└── SCHEMA.md            # Layer 3: The Agent Constitution (Rules & instructions)
```

1. **`raw/` (Raw Sources):** Immutable source of truth. Humans deposit meeting notes, Slack thread transcripts, architectural decisions, and specs here. The agent reads this layer but never modifies it.
2. **`wiki/` (The Compiled Wiki):** Human-readable, interlinked Markdown pages. The LLM maintains this layer: creating pages, updating cross-links, reconciling contradictions, and logging changes.
3. **`SCHEMA.md` (The Schema):** The operational instructions directing the AI agent on how to ingest sources, answer queries, maintain naming conventions, and run health checks.

---

## Team Workflow: How Teammates Contribute

To replace Confluence seamlessly, teammates do not need to manually write complex wiki pages.

### 1. Daily Ingestion Flow

```
1. Engineer drops raw file into `raw/` 
   (e.g., raw/2026-10-02-billing-migration.md)
              │
              ▼
2. Trigger the Agent (Local CLI, GitHub Action, or PR review)
   Prompt: "Ingest raw/2026-10-02-billing-migration.md"
              │
              ▼
3. Agent compiles updates:
   ├── Reads the raw note
   ├── Identifies affected concepts and entities
   ├── Updates existing pages (e.g., wiki/entities/billing-service.md)
   ├── Creates new pages if novel concepts were introduced
   ├── Updates `wiki/index.md` & appends entry to `wiki/log.md`
   └── Opens a Pull Request for team review
              │
              ▼
4. PR is approved and merged into `main`
   (Static site builder deploys the updated wiki automatically)
```

### 2. Querying Knowledge

Teammates can query the compiled wiki directly using their AI coding assistant (Antigravity, Claude Code, Cursor, Codex):

```text
User: "What authentication mechanism does our billing service use, and when was it migrated?"
Agent: Checks `wiki/index.md` ──> Reads `wiki/entities/billing-service.md` and `wiki/concepts/auth-tokens.md` 
       ──> Returns synthesized answer with exact citations to wiki pages and source notes.
```

If an exploratory query results in a valuable comparison or technical analysis, the user can instruct:
> *"File this analysis into `wiki/concepts/auth-vs-session-tradeoffs.md` and update the index."*

### 3. Continuous Hygiene (Linting)

Run the built-in validator locally or in CI:

```bash
node scripts/lint-wiki.mjs
```

Or instruct the AI agent to perform a holistic audit:
> *"Run a lint pass over the wiki. Check for orphan pages, broken links, conflicting claims, and topics missing coverage."*

---

## Hosting the Wiki for Your Team

To give teammates a polished, browser-based Confluence replacement, host the Markdown repository using a modern docs-as-code frontend:

### Recommended: [Quartz](https://quartz.jzhao.xyz/) or [VitePress](https://vitepress.dev/)
- **Quartz:** Obsidian-compatible out of the box, supports `[[wikilinks]]`, renders interactive dependency graph views, has instant full-text search, and deploys to Cloudflare Pages, GitHub Pages, or Vercel.
- **GitHub Pages / Internal Portal:** With the included GitHub Actions workflow, every merge to `main` automatically builds and publishes the wiki to a private team URL.

---

## Confluence Migration Strategy

1. **Phase 1: Space Export:** Export key Confluence spaces to Markdown/HTML using tools like `confluence-to-markdown` or native Atlassian space exports.
2. **Phase 2: Raw Seeding:** Place legacy exports into `raw/legacy-confluence/`.
3. **Phase 3: Agent Distillation:** Run batch agent ingestion sessions:
   ```text
   "Ingest all files in raw/legacy-confluence/auth/ and synthesize them into wiki/concepts and wiki/entities. Deprecate obsolete patterns."
   ```
4. **Phase 4: Confluence Deprecation:** Mark Confluence spaces as read-only and point team bookmarks to the hosted LLM Wiki.

---

## Repository Conventions

- **Page Titles & Slugs:** Lowercase kebab-case (e.g., `user-service.md`, `oauth-jwt-flow.md`).
- **Internal Links:** Standard relative markdown links (e.g., `[Auth Service](../entities/auth-service.md)`).
- **Frontmatter:** Every wiki page must include YAML frontmatter with `title`, `last_updated`, `sources`, and `tags`.
