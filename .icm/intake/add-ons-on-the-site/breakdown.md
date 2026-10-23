# Breakdown: Add-ons, shown apart from the tours and sold on Óbidos too

- epic-slug: add-ons-on-the-site
- source: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`), items "Add-ons – Homepage" and "Please add the add-ons to the Obidos experience as well, and display the duration of each add-on".

## What I understood

The home page shows the two tours and the three add-ons in one grid of identical cards. Guests
read five experiences. Diogo wants the add-ons shown apart, as `/experiencias` already does.
The add-ons (Tasco Galapito, Manzwine, Ramilo Wines) are sold only on private Rural Saloia
departures today. Diogo wants them on the Óbidos experience too, and the duration of each add-on
shown while the guest books. The catalogue holds a duration per add-on. The booking page shows
it for the tours only.

## Build order

1. home-add-ons-section — the home page shows tours, then add-ons in their own section — depends-on: none
2. obidos-add-ons-with-duration — add-ons can attach to Óbidos, and the booking page shows each add-on's duration — depends-on: none

## Out of scope

- New add-ons or new partners.
- Add-ons on open group departures. They stay on private departures only.
