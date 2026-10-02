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
│   ├── worklogs/        # Personal dev diaries, one folder per engineer
│   ├── how-to/          # Setup notes as people figured things out
│   ├── debug-sessions/  # Raw debugging notes
│   └── postmortems/ meetings/ rfcs/
│
├── wiki/                # Layer 2: The Compiled Knowledge Base (Owned by LLM)
│   ├── guides/          # How-tos: local setup, migrations, webhooks
│   ├── runbooks/        # Debugging & incident playbooks
│   ├── features/        # Implementation write-ups of features
│   ├── people/          # Team directory / personal spaces
│   ├── concepts/        # Architectural patterns, domain logic, protocols
│   ├── entities/        # Services, databases, third-party vendors, teams
│   ├── systems/         # End-to-end user journeys and cross-cutting flows
│   ├── index.md         # Categorized directory of all wiki pages
│   └── log.md           # Append-only chronological audit log
│
├── quartz/              # Quartz site config + landing page
├── scripts/             # Link linter, Quartz build script
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

The wiki is published with [Quartz v5](https://quartz.jzhao.xyz/) to GitHub Pages: **https://emocado.github.io/llm-wiki/**

Quartz gives full-text search, a graph view, backlinks, folder pages, tags, and Mermaid diagrams, with no changes to the Markdown.

- **Deploy:** `.github/workflows/deploy.yml` runs on every push to `main`. It lints the wiki, builds with Quartz, and publishes to Pages.
- **Config:** `quartz/quartz.config.yaml` holds the site config, and `quartz/home.md` is the landing page. Quartz itself isn't vendored. `scripts/site.mjs` clones a pinned release into `.site/quartz` (gitignored) and stages `wiki/` and `raw/` as content, so relative links between them still work.
- **Preview locally** (Node 22+):

  ```bash
  node scripts/site.mjs serve   # http://localhost:8080
  node scripts/site.mjs build   # static output in .site/quartz/public
  ```

  The first run clones Quartz and installs its plugins, which takes a few minutes. Later runs reuse the checkout.

---

## Viewing & Searching with Obsidian

The repository includes a ready-to-use `.obsidian/` configuration, turning the repository directly into an **Obsidian Vault**:

1. **Open in Obsidian:** Launch Obsidian and choose **"Open folder as vault"**, then select this repository folder (`llm-wiki`).
2. **Pre-configured Features:**
   - **Pre-set Graph View Colors:** Concepts (Green), Entities (Blue), Features (Purple), Systems (Cyan), Guides (Teal), Runbooks (Amber), People (Pink), and Raw inputs (Slate).
   - **Standard Markdown Links:** Set to use relative markdown links (`useMarkdownLinks: true`) for 100% interoperability with Quartz, GitHub, and local editors.
   - **Noise Filtering:** `.git`, `.site`, and build caches are filtered out of search and explorer.
   - **Instant Navigation:**
     - `Ctrl + O`: Quick Switcher to jump between any wiki page or source.
     - `Ctrl + Shift + F`: Global search (supports `tag:#auth`, `path:wiki/concepts`, etc.).
     - `Ctrl + G`: Interactive Graph View.
     - Hover with `Ctrl` over links for instant previews.

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
