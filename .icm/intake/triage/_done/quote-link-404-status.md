# Stub: A dead quote link answers 200, not 404

- lane: tweak
- found-by: quote-page-and-deposit-link (Build, RD-9; operator accepted at Release) · 2026-09-24
- complexity: medium

## Problem

`/[locale]/orcamento/[token]` shows the neutral "no longer valid" panel for an unknown,
replaced, cancelled or malformed token, `noindex` and uncached — but with a 200 status: the
locale's `loading.tsx` streams every page under `[locale]`, so the status is sent before the
token lookup finishes (Next 16's streaming note, `loading.md` → Status Codes). The spec asked
for a 404.

## Proposed change

Answer the dead cases before streaming: in `web/src/proxy.ts`, for `/(pt|en)/orcamento/<token>`
only, reject a malformed token at once and look the digest up (`quoteTokenDigest` +
`getQuoteByAccessTokenHash`, live statuses only), rewriting a miss to a not-found route that
renders the same neutral panel with a 404. Keep the lookup cheap and the answer identical for
every dead case.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/quote-link-404-status.md` and make a
dead quote link return a 404 from `src/proxy.ts`, with the same neutral panel and no hint
whether the quote existed. Test the proxy branch in `src/proxy.test.ts`. `git mv` the stub to
`_done/` in the PR, on a `claude/` branch; CI is the source of truth.
