# Stub: The inventory — every admin string, its Portuguese, and one name per thing

- feature-slug: admin-i18n-inventory
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: none
- sequence: 1 of 4
- sources: copy lens 2026-08-29: idiom list (`admin/notifications/page.tsx:24` "Set-and-forget…", `lead-edit-form.tsx:245` "why it went quiet", `admin/page.tsx:81-87` ICM-speak, `admin-nav.ts:134,150` "Blog studio/Social studio"); naming drift (`admin/sales/page.tsx:48,55,71` — leads/enquiries/bookings for one object); `content/system.ts:39-41` documents the monolingual-EN decision this epic supersedes

## Problem

Translating idiom word-for-word produces nonsense, and the console currently calls
the same object three names. Translating before deciding vocabulary bakes the drift
into Portuguese.

## Proposed change

A working document (in `.icm/docs/`) listing: every admin user-facing string by file;
the PT glossary (one term per concept — proposal: *pedido* for an enquiry, *reserva*
for a paid booking, *orçamento* for a quote; agree with Jamie); rewrites for each
idiom into plain Portuguese a tour operator says; which strings are shared with
emails. Update `content/system.ts`'s monolingual note to name PT as the admin
language. This document drives stubs 2–3.

## Acceptance criteria (rough)

- [ ] Inventory covers app/admin/** and components/admin/** exhaustively
- [ ] Glossary decided (Jamie's tick) — one name per concept
- [ ] Idiom list has a PT plain-language rendering for every entry

## Prompt

In the agorasim repo, produce the admin translation inventory per
`.icm/intake/admin-portugues/admin-i18n-inventory.md`: enumerate every user-facing
string under `web/src/app/admin/` and `web/src/components/admin/`, propose the PT
glossary (flag the leads/enquiries/bookings unification explicitly), and render the
idiom list into operator-plain Portuguese (European Portuguese, informal-warm "você"
implicit — match how `web/src/content/` writes PT for guests). Write the result to
`.icm/docs/admin-pt-inventory.md` and update the note in `web/src/content/system.ts`.
This stub writes the doc + one code comment change only. PR on a `claude/` branch;
no local checks — CI is the source of truth.
