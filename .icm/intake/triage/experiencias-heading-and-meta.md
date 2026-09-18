# Stub: /experiencias has no heading of its own and a 500-character meta description

- lane: tweak
- found-by: copy lens (/project) · 2026-09-18
- priority: P2

## Problem

The first thing rendered is the first tour's `<h1>`, with one `<h1>` per signature tour
(`web/src/app/[locale]/experiencias/page.tsx:75`), so the page states no value proposition of
its own; the meta description concatenates two ~40-word summaries with a stray full stop
before " — e também" (`:32-37`). voice.md's answer-first rule; the home hero
(`content/pages.ts:9-16`) is the model.

## Proposed change

A page-level `<h1>` and lead in both locales; a written meta description; tour titles as
`<h2>`.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/experiencias-heading-and-meta.md` and
give `src/app/[locale]/experiencias/page.tsx` its own heading, lead and meta description
(PT + EN), demoting the tour headings. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
