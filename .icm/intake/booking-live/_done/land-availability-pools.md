# Stub: Land PR #31 — availability becomes driver + vehicle pools

- feature-slug: land-availability-pools
- epic: booking-live
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 8
- sources: PR #31 (`origin/claude/agorasim-availability-capacity-k0iild`, 3f5e7f9 + 88b4d3c, opened 2026-08-25); info PDF §1.5 ("2 drivers", 2 slots 10h/14h, 3/3/3/8 seats); D1 (2026-08-29: land, don't rebuild)

## Problem

Main's availability model is per-tour seat counts — two tours can sell the same 10:00
twice even though the real constraint is two drivers across four cars. PR #31 fixes
this correctly (one row per (day, departure) carrying a driver roster; vehicle classes
`classic-small`/`classic-van`/`touring`; Óbidos consumes a driver but never a classic;
parties >8 → enquiry; every booking private to its vehicle) with a 0013 migration that
collapses existing rows and backfills vehicle classes. It is complete, tested, and
merged nowhere — the purged AGORA-012 ticket was its only tracker.

## Proposed change

Merge PR #31 into main (resolve any drift since 88b4d3c), let CI judge it, and verify
the migration ran cleanly against the database: one row per (date, slot), drivers
default 2, every booking has a plausible `vehicle_class`.

## Acceptance criteria (rough)

- [ ] PR #31 merged; CI green
- [ ] `availability` has a unique (date, slot) index and no per-tour rows
- [ ] Existing bookings carry a `vehicle_class`
- [ ] Booking form greys out what the pools cannot supply

## Prompt

In the agorasim repo, land the open PR #31 (branch
`claude/agorasim-availability-capacity-k0iild`): rebase or merge it over current main,
resolve conflicts in favour of the branch's driver/vehicle-pool model (it is the
decided target, D1 in `.icm/project.md`), and push so CI judges it. Read
`.icm/intake/booking-live/land-availability-pools.md` and the branch's own migration
comments in `web/drizzle/0013_shared_capacity_pools.sql` first. Do not run local
checks — CI is the source of truth. After merge, `git mv` this stub to
`.icm/intake/booking-live/_done/` in the same PR or a follow-up ticket commit.
