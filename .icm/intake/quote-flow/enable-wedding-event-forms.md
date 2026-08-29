# Stub: Open the two doors — casamentos and eventos enquiries go live

- feature-slug: enable-wedding-event-forms
- epic: quote-flow
- priority: P1
- size: M
- depends-on: payment-links
- sequence: 5 of 5
- sources: D10 (one flow, two doors); PR #30's quote form (landed disabled by booking-live/rescue-weddings-content); `enquiry_kind` enum (`web/src/db/schema.ts:77`); 2026-08-29 product lens (nothing public writes wedding/event kinds; eventos page is two paragraphs)

## Problem

Both doors are shut: the casamentos quote form is disabled markup, the eventos page
has no form at all, and no public path ever writes `enquiry_kind` wedding/event. The
quote engine behind them now exists.

## Proposed change

Enable the casamentos form (writes kind=wedding with event date, venue, party size);
give /eventos its own copy and form (kind=event — corporate, birthdays, shoots; same
fields); route both into the Sales board where "Criar orçamento" picks them up; lift
the noindex on casamentos (it joins `liveKeys` in `routes.ts`) once the flow works
end-to-end; eventos CTA retarget from booking-live is superseded by the real form.
Honeypot + rate limiting as the enquiry form has.

## Acceptance criteria (rough)

- [ ] Both forms submit real enquiries with the right kind; Sales board badges them
- [ ] casamentos indexed (sitemap + robots) only when the flow is live
- [ ] PT/EN complete; anti-spam parity with the tour enquiry form; CI green

## Prompt

In the agorasim repo (`web/`), open the weddings/events doors per
`.icm/intake/quote-flow/enable-wedding-event-forms.md`: enable the casamentos quote
form (PR #30 markup, currently disabled) writing `enquiry_kind='wedding'`, add an
events form + copy to `/[locale]/eventos` writing `'event'`, wire both through
`web/src/app/[locale]/reservar/actions.ts`-style server actions (honeypot,
rate-limit, consent checkbox conventions), badge kinds on the admin Sales board, and
move `casamentos` into `liveKeys` in `web/src/lib/routes.ts` so it indexes. Depends
on the rest of this epic being merged. PR on a `claude/` branch; no local checks —
CI is the source of truth.
