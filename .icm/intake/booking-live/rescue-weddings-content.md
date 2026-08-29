# Stub: Rescue PR #30 — weddings content onto today's main

- feature-slug: rescue-weddings-content
- epic: booking-live
- priority: P1
- size: M
- depends-on: land-availability-pools
- sequence: 3 of 8
- sources: PR #30 (b138aa0, GitHub state MERGED 2026-08-18 into base `claude/agora-002-full-booking-model` — a dead branch; `merge-base --is-ancestor` confirms main never got it); purged rescue ticket AGORA-005; info PDF §2.2–2.3 (cars, stories, weddings offer)

## Problem

PR #30 carries the client-supplied weddings reality: the real offer (couple transport,
photo sessions, floral decoration, personalised boards), the four named cars with
their stories (Josefina, Catrel, Cerejinha, Caravela), testimonials, the corrected
3–4-month lead time, and a wedding quote form. GitHub shows it merged, but its base
branch died before reaching main — `/casamentos` still ships the in-dev banner and the
wrong "6 to 12 months" claim. Ten weeks of drift separate b138aa0 from today's main.

## Proposed change

Cherry-pick/rebase b138aa0's content onto main, reconciling against current
`content/weddings.ts` and the PR #31 schema. Keep the quote form **disabled** and the
page noindex — enabling is `quote-flow/enable-wedding-event-forms`. Fix the branch's
known defect while landing: the wedding date input accepts past dates (no `min`).
The two `image: null` fleet entries ("photographs on their way") stay — the photo
chase is `content-truth/wedding-fleet-photos`.

## Acceptance criteria (rough)

- [ ] `/casamentos` shows the real offer, four named cars with stories, 3–4-month lead time
- [ ] Quote form still disabled; page still noindex
- [ ] Date field refuses past dates
- [ ] CI green

## Prompt

In the agorasim repo: commit b138aa0 (branch `claude/agora-005-content-weddings`, the
content of GitHub PR #30) never reached main — its base branch died. Bring its
weddings content (real offer, named cars + stories, testimonials, 3–4-month lead
time, quote form markup) onto current main, resolving ~10 weeks of drift; keep the
quote form disabled and the page noindex (a later epic enables it), and add `min` =
today to the wedding date input. Read
`.icm/intake/booking-live/rescue-weddings-content.md` and info PDF §2.2–2.3 (the
client's own car stories) for fidelity. Open a PR on a `claude/` branch; no local
checks — CI is the source of truth.
