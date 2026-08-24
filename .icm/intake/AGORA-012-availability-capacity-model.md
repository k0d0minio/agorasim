# AGORA-012 · Availability model: shared drivers & vehicles, not per-tour calendars

| | |
|---|---|
| Status | today |
| Type | fix |
| Priority | P0 |
| Size | M |
| Depends on | AGORA-002 (the model this corrects) |
| Sources | .icm/docs/agorasim-info.pdf §1.5, §2.2, §2.4, §2.6 (local only, gitignored) · Jamie's decisions, 24 Aug 2026 |

## Problem

The booking engine models **independent per-tour calendars** with two departures.
Reality (info PDF §1.5): the constraint is **2 drivers across 4 cars** — at most two
concurrent tours business-wide, in two fixed slots (**10:00 / 14:00**). A Rural Saloia
booking at 10:00 consumes a driver the Medieval/Óbidos tour can no longer use; the
current model lets both sell the same capacity and double-book a day.

Vehicle facts: Citroën 2CV / Renault 4L / Fiat 600 carry **3 guests** each, the VW T3
carries **8**; bigger groups combine vehicles (their stated max is 14 — the arithmetic
needs a third driver, open question in AGORA-019). The Óbidos/Medieval tour runs in a
**non-classic** vehicle (§2.6) but still consumes a driver.

## Acceptance

- [ ] Availability is shared pools per date+slot: **drivers (2)** and vehicles; a booking
      consumes a driver plus vehicle(s) sized to the party, across all tours.
- [ ] Party→vehicle assignment: ≤3 → one small classic; 4–8 → VW T3; 9+ → blocked at
      checkout until AGORA-019 settles the big-group rule (do not guess).
- [ ] Bookings are private-per-vehicle (no strangers sharing) until AGORA-019 answers the
      public-tier question — the pricing tiers stay, only the sharing semantics wait.
- [ ] Óbidos consumes a driver + non-classic vehicle; it never depletes the classic fleet.
- [ ] Checkout re-checks pool capacity server-side; seat-hold/expiry logic updated to match.
- [ ] Admin calendar: Rita can close a single slot, a day, or a whole date range (seasonal
      window, §1.5) from her phone.
- [ ] **Olaria MZ removed from the sellable offer** everywhere (catalogue, add-ons, repo
      CLAUDE.md facts) — no longer a partner (§2.4).
- [ ] Existing bookings survive the migration; tests updated to the suite's standard.
- [ ] CI green.

## Prompt

Rebuild the agorasim availability model around shared driver/vehicle capacity. Read
.icm/intake/AGORA-012-availability-capacity-model.md for the real-world constraints and
what must wait for client answers (big groups, seat sharing). The current model lives in
web/src/lib/availability.ts + bookings.ts with admin writes in
web/src/app/admin/calendar/. Open a PR on a claude/ branch; do not run local checks — CI
is the source of truth.
