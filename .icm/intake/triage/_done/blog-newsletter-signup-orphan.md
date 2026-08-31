> Resolved by blog-engine/blog-publish-path, 2026-08-31: the **Out** option, because
> the epic breakdown had already ruled it ("Newsletter capture — not contracted; the
> disabled input is removed in stub 1"). The block and all five `newsletterX` strings
> are gone; `web/src` has no surviving newsletter vocabulary. This stub was cut the
> same day from the other side of the decision and did not see that line. If Jamie
> wanted **In** or **Parked deliberately**, reopen — the copy is in git.

# Stub: The blog's newsletter signup promises a list nobody sends

- lane: chore
- found-by: `admin-email-marketing-orphan` resolution · 2026-08-31
- priority: P2
- size: S
- blocked: decision — three live options and none is Claude's to pick; needs Jamie
- sources: `web/src/app/[locale]/blog/page.tsx:131-149` (disabled input + button);
  `web/src/content/blog.ts:41-54` (`newsletterTitle`/`newsletterBody`/`newsletterSoon`);
  `.icm/intake/triage/_done/admin-email-marketing-orphan.md` (the sending side went out)

## What

The blog index ends with a newsletter block: "Once a month, the best of the Saloia
region in your inbox. No spam." The input and button are `disabled`, and a line below
says "Subscription will be available soon." It is bilingual, styled, and on a public
page a guest can reach today.

Nothing is behind it. The comment above the block used to say "design only until email
marketing ships" — that feature was ruled **out** on 2026-08-31, so the sentence is now
a promise with no machinery, no owner and no ticket. This is the same shape as the
referral rewards D2 removed: a dead promise that outlives the decision unless someone
removes it deliberately.

Note it is not simply the email-marketing surface's public half. A monthly stories list
is closer to `lifecycle-messages` (Resend is wired there for transactional mail) than to
the campaign studio that just left, so "delete it" is not automatic — hence a decision,
not a fix.

## Decide

- **Out** — delete the block and the five `newsletterX` strings from
  `web/src/content/blog.ts`. Cheapest, and the honest match for the e-mail-marketing
  decision. The blog index simply ends on the post grid.
- **In** — a real signup: a `newsletter_subscribers` table, double opt-in and an
  unsubscribe link (GDPR: it joins retention/erasure scope, and `.icm/project.md`
  currently says PII lives only in `tour_requests`). Almost certainly a stub under
  `lifecycle-messages`, and outside the six contracted features.
- **Parked deliberately** — keep it, but drop "available soon" for copy that does not
  promise a date, and say so in the feature table so it stops reading as an oversight.

## Prompt

In the agorasim repo, decide the fate of the public blog newsletter signup per
`.icm/intake/triage/blog-newsletter-signup-orphan.md`. Read
`web/src/app/[locale]/blog/page.tsx` (the newsletter block at the foot of the page) and
`web/src/content/blog.ts`'s `newsletterX` strings first, then ask Jamie which of the
three options applies — this is a scope decision about an uncontracted public promise,
not a code question, so do not pick for him. If the answer is "out", remove the block
and the strings, keep PT and EN in sync, and grep `web/src` for surviving newsletter
vocabulary. PR on a `claude/` branch; no local checks — CI is the source of truth.
