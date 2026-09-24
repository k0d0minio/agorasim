# Failures: thankyou-review-email

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

### 2026-09-24 — a moved booking kept its no-show mark

- what happened: the Release code review found that `lib/booking-move.ts` rewrote date, slot and vehicle class but left `bookings.no_show_at`, so a "Faltou" booking moved as goodwill would never be thanked for the tour the guest did take.
- why: Build added a per-departure fact to `bookings` and read only the paths that set it, not the one that changes the departure under it.
- fixed by: the Release review-fix commit on this branch (`noShowAt: null` in the move's update).

### 2026-09-24 — the one-click throttle shared the page's per-IP key

- what happened: the review found the RFC 8058 endpoint throttled at 20 per IP under the page's key, while one-click POSTs come from a mailbox provider's small IP pool that does not retry.
- why: the throttle was copied from the guest-facing cancel pattern without asking who the caller is.
- fixed by: its own key and a provider-sized limit (`OPT_OUT_ONE_CLICK_RATE_LIMIT`).

## Learned rules

- A column on `bookings` that describes one departure (like `no_show_at`) must be reset in `web/src/lib/booking-move.ts`'s update — a move changes the departure under it.
- Size a public endpoint's throttle for who actually calls it: a mail provider's one-click POST, a webhook sender or a crawler is not one guest on one IP.
