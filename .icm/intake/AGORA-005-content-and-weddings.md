# AGORA-005 · Content & weddings: real photos, car stories, /casamentos live

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Blocked by | — unblocked 24 Aug: the Section 2 answers are in the info PDF (car stories §2.2, weddings offer §2.3, testimonials §2.5). Only photos remain missing → AGORA-008/019 |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 4 |

## Problem

Media is thin: 8 real photos, partners reusing generic car shots, two "photographs on their
way" tiles on the weddings page, and no real weddings offer or testimonials. Launch scope
includes weddings (`/casamentos`) going live.

## Acceptance

- [ ] ~~Real photos ingested~~ — moved to AGORA-008 (WeTransfer links expired). Land
      everything photo-ready: tiles render "photos coming" until an image path is set.
- [ ] Car details and stories in `site.ts` / experience content — info PDF §2.2 has all
      four (Josefina 2CV '86, Catrel 4L '89, Cerejinha Fiat 600 '70, Caravela T3 '88).
- [ ] Real weddings offer in `weddings.ts` — §2.3: transport of the couple, photo
      sessions, flower decoration, personalised wooden boards; coverage unlimited; book
      3–4 months ahead. **Pricing is quote-per-event — no fixed price list**; the page
      copy sells the enquiry (the quote itself is AGORA-015's flow). Enquiry form
      enabled; `/casamentos` flipped to live in `routes.ts`.
- [ ] Testimonials section from the three §2.5 quotes (Jacob & Danita CA, Madeline &
      Elliot AU, Brian & Elizabeth US) — trim with care, publish without faces until the
      photo link is re-sent.
- [ ] PT/EN parity on all new content (`Localized<T>` everywhere).
- [ ] CI green.

## Prompt

Land the real content for the agorasim launch and take /casamentos live. Read
.icm/intake/AGORA-005-content-and-weddings.md and .icm/docs/launch-plan.md (Phase 4) for
full context — do not start until the Section 2 answers and photos exist; never invent
offer facts. Open a PR on a claude/ branch; do not run local checks — CI is the source of
truth.
