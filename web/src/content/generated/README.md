# generated/

Reviewed content published here by the `workspaces/geo-content` ICM pipeline (Layer 4 handoff).
Do not hand-edit — edit the pipeline output and re-publish.

Two kinds of handoff live here, and they reach the site differently:

- **`<slug>.json`** — GEO content blocks. The site *imports* these files, so a change
  is a deploy.
- **`blog/<slug>.md`** — blog articles. Nothing imports them: they are loaded into
  `blog_post_drafts` with `pnpm blog:load` and published from `/admin/blog`, so an
  article goes live without a deploy. See `blog/README.md` for the file format.
