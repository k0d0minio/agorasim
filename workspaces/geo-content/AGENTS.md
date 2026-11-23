# geo-content — Layer 0

You are operating the **GEO content pipeline** for Agorasim. Its job: take a topic of the topic
queue (`topics.md`) and produce a GEO-optimized blog article (answer-first, PT & EN) in the blog
markdown format. The article goes to the website's blog and is built to be cited by AI search
engines.

- Shared reference (the factory): `../_config/` (brand, voice, business-facts) and
  `../shared/geo-checklist.md`. Read them; internalize as constraints.
- Route: `CONTEXT.md` (this workspace) tells you which stage handles what.
- Stages run in order under `stages/`. Read the previous stage's `output/`, write your own `output/`.
- A human reviews each stage's output before the next runs. Every output is an editable markdown file.

Do not invent facts. Everything factual comes from `../_config/business-facts.md`.
