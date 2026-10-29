# Breakdown: Open group and private group tours, said truthfully and sold that way

- epic-slug: open-and-private-tours
- source: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`), items "Price per person" and "FAQs – How many people can participate?". The unsent client question 2 of 2026-08-24 (sharing a car) is answered by item "Price per person".

## What I understood

The site prices a tour in two ways. "Preço por pessoa" is the public departure. "Preço por grupo"
is the private one. Under "Preço por pessoa" the site says "O carro é sempre só do vosso grupo".
Diogo says this is wrong. He sells an **open group tour**, where other people can join the same
car, and a **private group tour** with a minimum price. Today the booking engine gives every
booking its own car (`web/src/lib/fleet.ts`, `web/src/lib/availability.ts`), so the copy and
the engine agree with each other and both disagree with the business. The engine must share a
car between per-person bookings on the same departure before the copy can promise it. The FAQ
"Quantas pessoas podem participar?" must state the seats of each car. The minimum price of a
private group already exists as the first private tier.

## Build order

1. shared-seats-on-open-departures — per-person bookings on one departure share a car up to its seats — depends-on: none
2. open-and-private-wording — "Grupo aberto" and "Grupo privado" across the site, the false sentence gone, the private minimum shown — depends-on: shared-seats-on-open-departures
3. faq-seats-per-car — the FAQ answer names each car and its seats — depends-on: none

## Out of scope

- Big groups above 8 and a third driver (client question 1). The site keeps the enquiry route.
- Price changes. The tiers and minimums stay as the catalogue holds them.
- Add-ons on Óbidos and the homepage add-on section (epic `add-ons-on-the-site`).
