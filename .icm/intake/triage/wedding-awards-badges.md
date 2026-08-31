# Stub: The Wedding Awards badges — verify the claim, then publish it

- lane: chore
- found-by: booking-live/rescue-weddings-content · 2026-08-31
- priority: P2

## Problem

`web/public/images/wedding-awards/` holds five badges (2022–2026) and PR #30 rendered
them on `/casamentos` as "Wedding Awards — five years running". That claim's source is
still an **open client question** (`.icm/project.md` → client pack: "Wedding-awards
claim source (2022–2026 badges)"), so the rescue PR left the section out rather than
publish an award the site cannot stand behind. The badges remain unreferenced.

## Proposed change

Once Diogo & Rita name the awarding body and the years (casamentos.pt, by the README's
reading), add the badge row back to `/casamentos` — PR #30 put it under the hero, a
quiet centred strip of five round badges with a `title` line — with copy that names the
award and alt text that says what the badge is. If the claim turns out to be narrower
than five consecutive years, publish what is true and nothing more. If the answer never
comes, move this stub to `_done/` with a `> Dropped:` line and delete the images with
the image audit.

## Prompt

In the agorasim repo (`web/`), publish the Wedding Awards badges per
`.icm/intake/triage/wedding-awards-badges.md` — but **only** if the client's answer on
the awards claim has arrived (check the deal-folder open-questions pack; the badges are
in `web/public/images/wedding-awards/`, 2022–2026). Add the badge row to
`/[locale]/casamentos` under the hero with copy naming the actual award, PT/EN, and real
alt text; the claim on the page must not exceed the claim the client verified. If the
answer has not arrived, leave the stub in place and say so. PR on a `claude/` branch; no
local checks — CI is the source of truth.
