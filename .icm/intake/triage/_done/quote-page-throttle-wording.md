# Stub: A throttled visit to a quote link reads "this link is no longer valid"

- lane: tweak
- found-by: quote-page-and-deposit-link (Release code review) · 2026-09-24
- complexity: low

## Problem

`web/src/app/[locale]/orcamento/[token]/page.tsx` answers a lookup over
`QUOTE_LOOKUP_RATE_LIMIT` (20 per IP per 10 min) with the neutral dead-link panel, whose copy
says the quote "may have been replaced by a new version". Couples on shared venue Wi-Fi or a
carrier's CGNAT share one IP; a real couple who reloads, returns from Stripe and forwards the
link can be told a live quote is dead. The cancel link page does the same
(`reserva/cancelar/[token]/page.tsx`).

## Proposed change

A throttled lookup gets its own sentence ("too many attempts from this connection — try again
in a few minutes"), still revealing nothing about the token; consider the same for the cancel
link. Optionally raise the lookup limit.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/quote-page-throttle-wording.md`. Give
the throttled branch of the quote page (and the cancel page) its own PT/EN copy in
`content/quote-page.ts` / `content/booking.ts` instead of the dead-link panel. `git mv` the stub
to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
