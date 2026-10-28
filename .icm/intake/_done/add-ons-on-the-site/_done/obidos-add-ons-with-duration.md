# Stub: Add-ons can be booked with Óbidos, and each add-on shows its duration

- feature-slug: obidos-add-ons-with-duration
- epic: add-ons-on-the-site
- sequence: 2 of 2
- depends-on: none
- complexity: medium
- priority: P1

## Problem

The three add-ons are gated to private Rural Saloia departures. The booking page says "Vende-se
apenas como complemento de uma partida privada da Rural Saloia". Diogo wants the add-ons
available on the Óbidos experience too. The booking page shows an add-on's name and price, not
its duration, so a guest cannot plan the day. The catalogue holds a duration per add-on
("Aprox. 2h", "Aprox. 1h30") and shows it for the tours only.

## Proposed change

An add-on in the catalogue names the tours it can attach to. The booking page offers the add-ons
of the chosen tour, each with the duration the catalogue already holds. The experience pages, the
price tables and `public/llms.txt` say which tours each add-on attaches to.

## Acceptance criteria

- [ ] An admin can set, per add-on, which tours it attaches to, at `/admin/experiences`. The duration field stays as today.
- [ ] On `/reservar`, a private Óbidos booking offers the add-ons attached to Óbidos, each with its duration shown next to its price, in PT and EN.
- [ ] A Rural Saloia booking still offers its add-ons, now with durations.
- [ ] The add-on's page and the price table name the tours it attaches to, instead of "Rural Saloia" only.
- [ ] The checkout total and the Connect fee include the add-on as today.

## Out of scope

- Add-ons on open group departures.
- New add-ons.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. Which add-ons attach to Óbidos? Default: all three (Tasco Galapito, Manzwine, Ramilo Wines), as the feedback says "the add-ons".
  2. Which durations? Default: the catalogue's values, "Aprox. 2h" for Tasco Galapito and "Aprox. 1h30" for Manzwine and Ramilo Wines, until the client corrects them.
  3. Does Manzwine's "closed Mondays" rule apply on Óbidos too? Default: yes.
- The gating is in `web/src/lib/pricing.ts` (`pricing.type: "addon"`, lines 80 to 118) and the copy in `web/src/content/pricing.ts` (`addOnsHint`, `addOnGated`, lines 101 to 125) and `web/src/content/booking.ts` lines 119 to 124. The catalogue table is `experiences` in `web/src/db/schema.ts`. Every row has a `duration` column already (line 682, "Duração" in the admin editor). An attachment list per add-on is new.
- The Óbidos cross-links on `/experiencias` (lines 146 to 174) already list all three add-ons, which is wrong today and right after this stub.
