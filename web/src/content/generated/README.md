# generated/

Reviewed content published here by the `workspaces/geo-content` ICM pipeline (Layer 4 handoff).
Do not hand-edit — edit the pipeline output and re-publish.

The one kind of handoff here is **`blog/<slug>.md`**: blog articles. Nothing imports them:
they are loaded into `blog_post_drafts` with `pnpm blog:load` and published from
`/admin/blog`, so an article goes live without a deploy. See `blog/README.md` for the file
format. The pipeline writes no `<slug>.json` block, and no page of the site reads one.
