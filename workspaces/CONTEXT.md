# workspaces/ — Layer 1 (operations routing)

ICM workspaces that operate the Agorasim business. Each subfolder is a self-contained pipeline: a
folder of markdown that tells one agent what to do at each numbered stage, with human review at
every boundary.

## Shared configuration (Layer 3 — the factory, stable across runs)
- `_config/brand.md` — palette, logo, tone, naming.
- `_config/voice.md` — how Agorasim writes (PT & EN).
- `_config/business-facts.md` — canonical facts (experiences, region, contacts). Single source of truth.
- `shared/geo-checklist.md` — GEO requirements for a site page and for a blog article.

## Workspaces (pipelines)
- `geo-content/` — turns a topic of its queue (`geo-content/topics.md`) into a GEO-optimized blog
  article (answer-first, PT & EN) in the blog markdown format. Template for future pipelines
  (social/, email/).

## How to run a workspace
1. Open the workspace's `AGENTS.md`, then `CONTEXT.md`.
2. Fill `setup/questionnaire.md` if present.
3. Work the stages in order (`01_…` → `02_…` → `03_…`). Each stage's `CONTEXT.md` declares its
   Inputs, Process and Outputs. Read the previous stage's `output/`, write to your own `output/`.
4. Review each stage's output file before running the next stage.
5. The final stage writes into `../web/src/content/generated/blog/`. The blog loader reads that
   folder (`web/src/content/generated/blog/README.md`).
