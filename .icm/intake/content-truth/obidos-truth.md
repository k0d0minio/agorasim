# Stub: Óbidos tells the truth — the vehicle and the departure time

- feature-slug: obidos-truth
- epic: content-truth
- priority: P1
- size: S
- depends-on: none
- sequence: 4 of 7
- sources: info PDF §2.6 header ("the óbidos and medieval villages experience is not on classical cars and the meeting point is in Lisbon centre"); copy lens: hero image/alt is a classic at the town gate (`web/src/content/experiences.ts:226-230`) vs its own description; product lens: paid confirmation says "at your departure time" and names none (`content/logistics.ts:31-51`, `content/emails.ts:81-86`)

## Problem

Two truth gaps on the same tour: the imagery sells the classic-car experience the
tour explicitly doesn't include, and a guest can pay without ever learning a
departure time — the confirmation email refers to a time it never states.

## Proposed change

Swap the Óbidos hero/alt to a non-classic image from
`web/public/images/obidos-medieval-villages/` (13 files, mostly unreferenced) and
state the touring-vehicle fact plainly in the description. Until the client commits
clock times (open question): honest copy everywhere a slot renders — "Partida da
manhã — hora exata confirmada por email" — and the confirmation email says the exact
time follows by email/WhatsApp, so nothing promises what fulfilment can't keep.

## Acceptance criteria (rough)

- [ ] Óbidos imagery/alt shows no classic car; vehicle fact stated
- [ ] Every Óbidos time surface says the exact time is confirmed by email
- [ ] PT/EN; CI green

## Prompt

In the agorasim repo (`web/`), fix Óbidos truth per
`.icm/intake/content-truth/obidos-truth.md`: replace the hero image/alt in
`web/src/content/experiences.ts` with a non-classic-car photo from
`web/public/images/obidos-medieval-villages/`, and add the "exact time confirmed by
email" copy to the Óbidos slot labels in `web/src/content/logistics.ts` and the
confirmation email path in `web/src/lib/booking-emails.ts` /
`web/src/content/emails.ts`. If the client's departure-time answer has arrived in
the icm-board deal folder, encode the real times instead. PT/EN in sync. PR on a
`claude/` branch; no local checks — CI is the source of truth.
