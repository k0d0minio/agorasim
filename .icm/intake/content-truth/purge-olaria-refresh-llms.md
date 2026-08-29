# Stub: Olaria MZ out everywhere; llms.txt tells today's truth

- feature-slug: purge-olaria-refresh-llms
- epic: content-truth
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 7
- sources: info PDF §2.4 ("Olaria is no longer with us"); repo CLAUDE.md ("do not reintroduce it"); copy lens: `web/src/content/pages.ts:39-40` (home still sells "a ceramics workshop"), `web/public/llms.txt:17` (lists Olaria with a dead slug), llms.txt omits Óbidos entirely, calls Rural Saloia "full-day", claims booking is "through the request form"

## Problem

The home intro and the AI-answer feed both still sell a retired partner — and
`robots.ts` explicitly invites AI crawlers, so llms.txt is live-facing. The same file
omits an entire sellable tour and describes the pre-payment era.

## Proposed change

Remove the ceramics-workshop clause from both locales of the home intro; rewrite
llms.txt: Olaria out, Óbidos & Medieval Villages in (with meeting point and
non-classic-vehicle fact), durations right (4h30 / 5h), booking described as instant
online payment with enquiry fallback, partner minimums correct. Sweep `web/src` and
`workspaces/_config/` for any other Olaria mention.

## Acceptance criteria (rough)

- [ ] Zero Olaria references outside git history and archived docs
- [ ] llms.txt covers both tours, correct durations, correct booking story
- [ ] PT/EN in sync; CI green

## Prompt

In the agorasim repo (`web/`), per
`.icm/intake/content-truth/purge-olaria-refresh-llms.md`: cut the ceramics-workshop
clause from `web/src/content/pages.ts` home intro (both locales), rewrite
`web/public/llms.txt` to today's truth (add the Óbidos tour, fix durations, describe
instant booking, drop Olaria), and grep-sweep `web/src` + `workspaces/_config` for
remaining Olaria mentions. Facts live in `.icm/docs/prices.pdf` and
`web/src/content/{experiences,logistics}.ts`. PR on a `claude/` branch; no local
checks — CI is the source of truth.
