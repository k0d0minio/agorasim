# Stub: Checkout UX fixes — the four defects a paying guest actually hits

- feature-slug: checkout-ux-fixes
- epic: booking-live
- priority: P1
- size: M
- depends-on: fix-pricing-mapping
- sequence: 4 of 8
- sources: 2026-08-29 ux + product + copy lenses (findings with file:line below)

## Problem

Four real defects in the paid path, one line each:
1. **Stripe cancel-return wipes the form** — `cancel_url` is bare `/reservar`
   (`web/src/lib/booking-checkout.ts:190`) and form state is pure `useState`; a guest
   who taps back in Stripe re-enters everything from zero.
2. **Experience pages don't carry their tour** — "Book this experience" on the Óbidos
   page lands with Rural Saloia preselected; `/reservar` reads no searchParams.
3. **Tour cards name no starting point** — a guest can pay without seeing Sintra vs
   Lisbon; the data exists in `content/logistics.ts`.
4. **`/reservar` metadata always says enquiry** — `generateMetadata` emits "Request an
   experience" even when the page renders the paid checkout.
Plus one adjacent retarget: the eventos CTA is a `BookingButton` into the paid tour
checkout (`web/src/app/[locale]/eventos/page.tsx:47`) — event enquirers land on tour
prices; point it at `/contactos` until the quote flow ships. And on PR #31's form:
changing party size remounts the date picker and silently discards the chosen
day/slot while the parent keeps a stale date (`booking-checkout-form.tsx:450,179` on
the branch); the calendar step also lacks the `h2` its sibling sections have.

## Proposed change

Rehydrate the checkout from query params (or sessionStorage) on cancel-return; accept
a `?tour=` param on `/reservar` and emit it from experience pages; render each tour
card's meeting point line; branch the metadata on `canCheckout`; retarget the eventos
CTA; fix the picker remount/stale-date bug and the heading.

## Acceptance criteria (rough)

- [ ] Back from Stripe restores tour, mode, party, date, slot, add-ons, name, email
- [ ] Óbidos page CTA preselects Óbidos
- [ ] Tour cards show Sintra/Lisbon starting points
- [ ] Metadata matches the rendered branch; eventos CTA no longer enters checkout
- [ ] Party-size change preserves (or explicitly clears + announces) the chosen date
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), fix the checkout UX defects listed in
`.icm/intake/booking-live/checkout-ux-fixes.md` (read it — each has file:line):
Stripe cancel-return rehydration, `?tour=` carry-through from experience pages,
meeting-point lines on the checkout tour cards (data in
`web/src/content/logistics.ts`), `generateMetadata` branching with `canCheckout` on
`/[locale]/reservar`, the eventos CTA retarget to `/contactos`, the date-picker
remount bug on party-size change, and the missing calendar-step heading. Keep PT/EN
in sync for any new strings. Open a PR on a `claude/` branch; no local checks — CI is
the source of truth.
