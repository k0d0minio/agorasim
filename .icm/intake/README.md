# Intake — Agorasim tickets

Open work for this repo lives here as **epics and stubs**. The formats, the writing rules and
the loop from stub to merge are in `CONTEXT.md`, the blueprint's contract. This file is what is
true of this backlog.

## Shape

- **Epic** = `<epic-slug>/` with a `breakdown.md` (what was understood + `## Build order`)
  and one stub per unit of work. Every stub carries `- feature-slug:` (= filename),
  `- sequence: <n> of <m>`, `- depends-on: none | <in-epic slugs sequenced earlier>`.
- **Triage** = `triage/<slug>.md` for one-off findings, with `- lane: bug | tweak | chore`
  and `- found-by:`.
- **Identity is the path** (`<epic>/<slug>`); H1 is `# Stub: <title>`. No numbers.
- Optional dash-lines: `- priority: P0|P1|P2`, `- size:`, `- blocked: <reason>`,
  `- sources:`.
- **`## Prompt` is optional**: the stub is its own brief.
  session at the repo root and tell that session to read the stub file.

## Order

Set by Jamie on 2026-10-27.

1. triage

## Decisions

Rules that bind every epic. Restored on 2026-10-30 from the project register of 2026-09-18
(`git show 5c8eef6^:.icm/project.md`).

- Agorasim runs no referral programme (why: never contracted, never requested · Jamie,
  2026-08-29).
- The admin console is Portuguese-only and mobile-first to Apple's HIG; the public site
  gets only targeted accessibility fixes (why: Rita's phone is the reference device ·
  Jamie, 2026-08-29).
- Lifecycle messages run through email only; SMS waits until after launch (why: email
  carries every message type without a new channel · Jamie, 2026-08-29).
- A guest cancels a booking through their own signed link, and the system refunds
  automatically outside the 48-hour window (why: self-serve keeps Rita out of the common
  case · Jamie, 2026-08-29).
- Every experience page shows the real price table and carries Offer JSON-LD (why: a
  guest and a search engine both read the one true price · Jamie, 2026-08-29).
- A wedding or event deposit is 30%, non-refundable inside 30 days, with a free date
  change subject to availability, as the default until the client confirms (why: the
  client has not answered the sinal question yet · Jamie, 2026-08-29).
- One quote flow serves both doors, casamentos and eventos, through the `enquiry_kind`
  column (why: one builder, one page, two intents · Jamie, 2026-08-29).
- Jamie runs the blog pipeline by hand, drafts land in `blog_post_drafts`, and the client
  publishes with one tap in the Blog studio (why: the client owns the publish moment, not
  the pipeline · Jamie, 2026-08-29).
- The social generator writes drafts for manual posting; the Meta auto-poster waits on the
  client's Instagram and Facebook access (why: auto-posting needs a credential the client
  has not given · Jamie, 2026-08-29).
- Gift vouchers stay out of scope; interest is logged, not built (why: a dead proposal,
  never contracted · Jamie, 2026-08-29).
- The public site holds to WCAG 2.2 AA (why: the accessibility bar the client agreed to ·
  Jamie, 2026-08-29).
- A tour's price tier and its minimum count adults only; a child or an infant rides free
  of the headcount (why: the client's own answer, and `pricing.ts` already matched it ·
  client, 2026-09-11).
- Lifecycle messages and the weddings quote flow shipped first after launch; the blog's
  first batch, the social auto-poster, the admin extras and SMS stay parked (why: the
  smallest money-moving features went first · Jamie, 2026-09-18).
- Agorasim runs no web analytics and sets no cookie beyond the admin session (why: the
  privacy policy's "nothing to consent to" claim stays true · Jamie, 2026-09-18).
- Every guest gets one post-tour thank-you email under a soft opt-in with an opt-out line;
  the day-before reminder goes to every guest as contract performance (why: the thank-you
  needs consent, the reminder does not · Jamie, 2026-09-18).
- A wedding or event's deposit and balance are paid from a token-gated quote page that
  mints a Checkout session on tap, never a long-lived Stripe Payment Link (why: one page,
  one session, no stale link · Jamie, 2026-09-18).

## The loop

`.icm/scripts/new-run.sh <epic>/<slug>` starts a stub: it moves the stub into `_done/` and opens
the draft pull request. `.icm/scripts/close-out.sh` moves a finished epic into `_done/`. The
go-live choreography (DNS, Stripe, Resend, the switch) is not a ticket. It is the runbook at
`.icm/docs/launch-runbook.md`, and Jamie drives it.

## Status is positional

- Open = the stub sits in a live epic or triage. Next = lowest unmet sequence.
- Done = `git mv` the stub to its epic's `_done/` in the PR that finishes the work.
  Dropped work moves there too with a `> Dropped: <reason, date>` line prepended.
- A completed epic archives whole: `git mv intake/<epic>/ intake/_done/<epic>/`.

## History

The tree was purged on 2026-09-11 (every earlier epic, triage stub and `_done/` archive)
to leave only the go-live work; `git log -- .icm/intake` holds the rest. On 2026-10-23 the
`go-live/` epic was deleted (Jamie's decision) and the backlog was cut again from the client's
feedback round 1 of 2026-10-12 (Drive, `feedback-round-1.pdf`): five epics and six triage stubs.
