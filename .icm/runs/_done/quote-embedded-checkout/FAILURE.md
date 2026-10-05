# Failures: quote-embedded-checkout

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

### 2026-10-05 — payment-step heading named the rendered instalment, not the one the tap opened

- what happened: Release's `/code-review` found the quote payment step's heading built from the page render ("Sinal — 576 €") while the session was minted from what the server found due at tap time — a deposit paid since from another phone would leave the heading on the deposit over a balance form.
- why: Define's spec and Build both took the "line naming the instalment and amount" from the page's props, forgetting the module's own rule that the server re-decides what is due.
- fixed by: 6a5a49c — `startQuoteCheckout` returns the instalment it opened; `payQuote` names it.

## Learned rules

- Anything shown beside a payment form on the quote page — the instalment, its amount — comes from the server action's answer, never from the page render: the action re-decides what is due at tap time.
