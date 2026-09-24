# Tweak: experiencias-heading-meta

- change: `web/src/app/[locale]/experiencias/page.tsx` + `web/src/content/pages.ts`: the page had
  no heading of its own (the first signature tour's `<h1>` stood in) and `generateMetadata`
  concatenated two tour summaries into a description with a stray full stop before "e também" /
  "and also". Added a page-level `<h1>` + lead (PT/EN, in `content/pages.ts` as `experiences`),
  demoted each tour's heading to `<h2>`, and wrote the meta description by hand (`metaDescription`)
  instead of concatenating tour summaries.
- changelog: not warranted (repo has no changelog — `_shared/project-rules.md` → Changelog: none)
- learned: none
