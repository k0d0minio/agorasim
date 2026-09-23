# Stub: The words a guest reads on launch day are true — no engineer notes, no "being built", no "being recovered"

- feature-slug: launch-copy-truth
- epic: go-live
- priority: P1
- size: S
- depends-on: none
- sequence: 7 of 9
- sources: copy lens 2026-09-18 — `web/src/content/privacy.ts:107,114,115,126` (PT) and `:176,184,195` (EN) render `TODO(legal)` and "PROPOSTA, A CONFIRMAR … ver a nota em .icm/docs/data-protection.md" inside `sections[].body`, mapped verbatim by `web/src/components/privacy-policy.tsx:37-41`, while `terms.ts:278-289` keeps its notes in a never-rendered `legalOpenItems` array; `web/src/content/tour-request.ts:16-24` "O pagamento online está a ser construído" rendered at `reservar/page.tsx:158-161` whenever `canCheckout` is false, with `booking.ts:222-225` (`paymentsOff`) already carrying the honest wording; `workspaces/_config/business-facts.md:10-12` still says the domain is being recovered and names the interim host; stale cutover claims in `web/src/lib/site-origin.ts:16-18`, `email-layout.ts:78`, `legacy-redirects.ts:4`

## Problem

Three kinds of untruth reach a paying guest or the content factory: the privacy page
prints engineer notes and a repo path; `/reservar` claims online payment is unbuilt
whenever no day is open (after go-live that is a false statement about money); and the
facts file every blog draft is written from says the domain is being recovered. The draft
banner on privacy/terms is a recorded decision and stays — the notes behind it are not.

## Proposed change

Move the privacy page's `TODO(legal)` and "PROPOSTA, A CONFIRMAR" lines into a
`legalOpenItems` array on the model of `terms.ts`, keeping the register
(`.icm/docs/data-protection.md`) as the one place they are tracked; retire the
`tour-request.ts` "being built" note and let the `paymentsOff` copy carry the
no-day-open and env-missing cases; rewrite the domain lines in `business-facts.md` to the
transfer plan (D18) and correct the three code comments. Both locales, nothing else.

## Acceptance criteria (rough)

- [ ] No `TODO`, `PROPOSTA` or `.icm/` path renders on `/privacidade` or `/privacy`; the draft banner still does
- [ ] `/reservar` with no open day says what `paymentsOff` says, in both locales
- [ ] `business-facts.md` describes the domain as D18 does; CI green

## Prompt

In the agorasim repo, read `.icm/intake/go-live/launch-copy-truth.md`. Move the rendered
legal notes in `web/src/content/privacy.ts` into a never-rendered `legalOpenItems` array
like `terms.ts` has, retire the "being built" note in `web/src/content/tour-request.ts` in
favour of `booking.ts`'s `paymentsOff`, fix the domain wording in
`workspaces/_config/business-facts.md` and the three stale comments the stub cites. Keep
PT and EN in sync; touch no other copy. `git mv` the stub to `_done/` in the same PR, on a
`claude/` branch; no local checks — CI is the source of truth.
