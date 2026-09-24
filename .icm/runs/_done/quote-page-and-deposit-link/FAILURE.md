# Failures: quote-page-and-deposit-link

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-09-24 — Define specified a 404 status the route cannot send

- what happened: the spec asked for a 404 on a dead quote link; Build could only serve the neutral panel with a 200 (RD-9), and Release shipped with that criterion unticked on the operator's word.
- why: `web/src/app/[locale]/loading.tsx` streams every page under `[locale]`; the status is flushed with the loading fallback, before any awaited lookup can call `notFound()`.
- fixed by: not fixed in this run — parked as `intake/triage/quote-link-404-status.md` (a lookup in `proxy.ts`).

### 2026-09-24 — Define specified a link the sender cannot build

- what happened: the spec put a quote-page link in the receipt emails; the webhook that sends them holds only the token's digest.
- why: quote and cancel tokens are stored as HMAC digests only; the plaintext exists in the one email that minted it.
- fixed by: the operator chose no link (RD-8) at Build.

### 2026-09-24 — Release review found money-flow edge cases the build missed

- what happened: `/code-review` at high found a failed Multibanco payment stuck on "awaiting" for good, a session paid on a replaced quote sending a receipt, and a transient Stripe read minting a second payable session.
- why: the mint's branches were tested for the paths the spec named, not for Stripe's delayed-failure and error states.
- fixed by: the review-fix commit before the close-out (tests in `quote-checkout.test.ts`).

## Learned rules

- A page under `web/src/app/[locale]/` cannot answer with a 404 status after an `await`: the locale's `loading.tsx` streams it, so a real 404 needs the check in `web/src/proxy.ts` — spec it there or accept a `noindex` 200.
- A token stored as a digest (quote links, cancel links) can be put in a URL only by the code that minted it; never spec a later email, webhook or job that links back with it.
- When code reads a Stripe object to decide whether to mint a payable session, treat only `resource_missing` as "gone" and check a completed-but-unpaid session's payment intent — a delayed method can fail after `complete`.
