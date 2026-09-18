# Stub: Open the two doors — casamentos and eventos enquiries reach the Sales board

- feature-slug: wedding-event-enquiry-forms
- epic: go-live
- priority: P0
- size: M
- depends-on: none
- sequence: 4 of 9
- sources: Jamie 2026-09-11 (quote enquiry = the public enquiry forms; quoting stays by hand); `web/src/app/[locale]/casamentos/page.tsx:22` ("every field on this page is a disabled preview"), `:182`; `web/src/app/[locale]/eventos/page.tsx` (no form); `enquiry_kind` enum in `web/src/db/schema.ts` (`tour | wedding | event` — nothing public writes wedding/event); the tour enquiry path in `web/src/app/[locale]/reservar/actions.ts` (honeypot `:11`, rate limit `:12`, `enquiry-ack` send `:168`); `web/src/lib/routes.ts:74` (`liveKeys`, casamentos not in it); Sales board `web/src/components/admin/sales-board.tsx`

## Problem

Weddings and events are the 6%-commission side of the business and both doors are shut:
the casamentos quote form is disabled markup, /eventos has no form at all, and no public
path ever writes `enquiry_kind` wedding or event. Diogo & Rita quote by hand, but the
enquiry has to arrive with the fields a quote needs — event date, venue, party size.

## Proposed change

Enable the casamentos form (names, email, phone, event date, venue/location, party
size, message → `tour_requests` with `kind = wedding`); give /eventos its own short copy
and the same form with `kind = event` (corporate, birthdays, shoots). Reuse the tour
enquiry server action's shape: honeypot, rate limit, zod schema in
`web/src/lib/form-schemas.ts`, the `enquiry-ack` email (a wedding/event variant of the
§2.6 voice — "we will come back with a quote"), team copy to `BOOKING_NOTIFICATION_EMAILS`.
Sales board: the kind badge already renders from `kind`; make sure wedding/event rows
show the event date and venue in the card and detail. Add casamentos to `liveKeys` so
it joins the sitemap and loses `noindex`; PT and EN complete.

## Acceptance criteria (rough)

- [ ] Both forms submit real enquiries with the right `kind`; Sales board and detail show date + venue
- [ ] Honeypot + rate-limit parity with the tour enquiry; acknowledgement email sent and logged
- [ ] casamentos indexed (sitemap, robots, hreflang) only once submissions work; PT/EN in sync; CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/go-live/wedding-event-enquiry-forms.md`
first. Enable the disabled quote form on `src/app/[locale]/casamentos/page.tsx` and add
the same form to `src/app/[locale]/eventos/page.tsx`, writing `tour_requests` rows with
`kind` wedding / event through a server action modelled on
`src/app/[locale]/reservar/actions.ts` (honeypot, rate limit, zod, enquiry-ack email).
Surface event date and venue on the Sales board card and detail, add casamentos to
`liveKeys` in `src/lib/routes.ts`, keep PT and EN in sync, and add tests beside the
existing enquiry tests. Finish by `git mv`-ing the stub to
`.icm/intake/go-live/_done/`. PR on a `claude/` branch; no local checks — CI is the
source of truth.
