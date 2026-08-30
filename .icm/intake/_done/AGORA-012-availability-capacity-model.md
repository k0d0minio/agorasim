# AGORA-012 · Availability model: shared drivers & vehicles, not per-tour calendars

| | |
|---|---|
| Status | in-progress |
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
needs a third driver, open question in the pack at icm-board
`workspaces/deals/diogo-rita/open-questions.md`; still unanswered 27 Aug). The model below
is confirmed as current reality by Jamie (27 Aug), subject to change when Diogo & Rita
answer. The Óbidos/Medieval tour runs in a **non-classic** vehicle (§2.6) but still
consumes a driver.

## Acceptance

- [x] Availability is shared pools per date+slot: **drivers (2)** and vehicles; a booking
      consumes a driver plus vehicle(s) sized to the party, across all tours.
      (`availability` lost `experience_slug`/`capacity` and gained `drivers`;
      `lib/fleet.ts` owns the fleet, `lib/availability.ts` the arithmetic.)
- [x] Party→vehicle assignment: ≤3 → one small classic; 4–8 → VW T3; 9+ → blocked at
      checkout until the open-questions pack settles the big-group rule (do not guess).
      (`assignVehicle`; the steppers stop at 8 and point at the contact page.)
- [x] Bookings are private-per-vehicle (no strangers sharing) until the open-questions pack
      answers the public-tier question — the pricing tiers stay, only the sharing semantics wait.
      (`bookings.exclusive` dropped; `mode` is a price tier and nothing else. The
      "Shared — you join other travellers" copy is gone, since it had stopped being true.)
- [x] Óbidos consumes a driver + non-classic vehicle; it never depletes the classic fleet.
- [x] Checkout re-checks pool capacity server-side; seat-hold/expiry logic updated to match.
      (`checkSlotAvailable` takes a party and a route and hands back the assigned car;
      the 30-minute hold now holds a driver and a car.)
- [x] Admin calendar: Rita can close a single slot, a day, or a whole date range (seasonal
      window, §1.5) from her phone. (Day sheet, month sweeps, and a new from/to season card
      posting one bounded range instead of hundreds of hidden inputs.)
- [x] **Olaria MZ removed from the sellable offer** everywhere (catalogue, add-ons, repo
      CLAUDE.md facts) — no longer a partner (§2.4). (Catalogue was already archived by
      migration 0012; the remaining mentions in `CLAUDE.md`, `workspaces/_config/
      business-facts.md` and `web/public/llms.txt` are gone.)
- [x] Existing bookings survive the migration; tests updated to the suite's standard.
      (Migration 0013 collapses the per-tour calendar rows — an open row wins — and
      backfills every booking's `vehicle_class` by the same rule new ones use.)
- [x] CI green.

## Still waiting on the open-questions pack

Two answers are deliberately *not* guessed here (the pack now lives on icm-board at
`workspaces/deals/diogo-rita/open-questions.md`), and both are one constant away when they
arrive:

- **Big groups.** `MAX_PARTY_ONLINE` in `web/src/lib/fleet.ts` is 8 — the T3's seats. Their
  stated 14 needs a third car and a third driver; who drives it is the open question. Groups
  above 8 are sent to the enquiry form, which still takes them.
- **Seat sharing.** Every booking takes its vehicle whole. If strangers may share, the change
  is in `assignVehicle`/`slotFitsParty` and the public payload already carries what it needs.
- **The touring vehicle's seat count** is not in the sources; it is recorded at the same 8
  ceiling, which nothing sellable can exceed today.

## Prompt

Rebuild the agorasim availability model around shared driver/vehicle capacity. Read
.icm/intake/AGORA-012-availability-capacity-model.md for the real-world constraints and
what must wait for client answers (big groups, seat sharing). The current model lives in
web/src/lib/availability.ts + bookings.ts with admin writes in
web/src/app/admin/calendar/. Open a PR on a claude/ branch; do not run local checks — CI
is the source of truth.
