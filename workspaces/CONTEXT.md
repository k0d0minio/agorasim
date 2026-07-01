# workspaces/ — Layer 1 (operations routing)

ICM workspaces that operate the Agorasim business. Each subfolder is a self-contained pipeline: a
folder of markdown that tells one agent what to do at each numbered stage, with human review at
every boundary. See `../icm.pdf` for the methodology.

## Shared configuration (Layer 3 — the factory, stable across runs)
- `_config/brand.md` — palette, logo, tone, naming.
- `_config/voice.md` — how Agorasim writes (PT & EN).
- `_config/business-facts.md` — canonical facts (experiences, region, contacts). Single source of truth.
- `shared/geo-checklist.md` — GEO requirements every published page must meet.

## Workspaces (pipelines)
- `geo-content/` — turns a target query/topic into a GEO-optimized content block (answer-first copy +
  FAQ) ready to publish into the website. Template for future pipelines (blog/, social/, email/).

## How to run a workspace
1. Open the workspace's `CLAUDE.md`, then `CONTEXT.md`.
2. Fill `setup/questionnaire.md` if present.
3. Work the stages in order (`01_…` → `02_…` → `03_…`). Each stage's `CONTEXT.md` declares its
   Inputs, Process and Outputs. Read the previous stage's `output/`, write to your own `output/`.
4. Review each stage's output file before running the next stage.
5. The final stage writes into `../web/src/content/generated/` for the site to render.
