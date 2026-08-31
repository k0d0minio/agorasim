# Stub: The e-mail marketing page has no owner — decide it in or out

- lane: chore
- found-by: admin-portugues recut, 2026-08-31
- priority: P2
- sources: `web/src/app/admin/email/page.tsx` (design preview, `dev: true`, fixtures from `lib/admin-preview.ts`); `.icm/project.md` feature table (no row for it); `.icm/docs/admin-pt-inventory.md` §5.1 (8 strings inventoried)

## What

`admin/email/page.tsx` previews "Email marketing (proposal Feature 9)" — audience
segments, AI-drafted bilingual campaigns, open/click tracking. It renders fixtures
behind an in-dev banner and sits in the nav as a `dev: true` area.

Unlike the other four preview studios, **nothing owns it**. Blog has `blog-engine`,
social has `social-engine`, notifications has `lifecycle-messages`, referrals has a
removal stub under `content-truth` (D2). Email marketing has no epic, no ticket, and
no row in `.icm/project.md`'s feature table — it is not among the six contracted
features. It is a promise on a screen the owners can reach.

The `admin-portugues` recut declined to translate it: writing Portuguese for a surface
nobody has decided to build is speculative work, and leaving it English behind a
Portuguese nav is the thing stub 7 sweeps.

## Decide

One of three, and it is Jamie's call, not a session's:

- **Out** — delete the page, its nav entry and its `previewCampaigns` /
  `previewSegments` fixtures, the way D2 handled referrals. Cheapest, and honest about
  what was contracted.
- **In** — cut it an epic. It overlaps `lifecycle-messages` (Resend is already wired
  for transactional mail) so it would likely be a stub there, not a new epic.
- **Parked deliberately** — keep the preview, but say so in `.icm/project.md`'s
  feature table with a `wanted` state, so it stops looking like an oversight. Then
  `admin-portugues/hig-polish-pass` renders its banner note in PT and moves on.

## Prompt

In the agorasim repo, decide the fate of the admin e-mail marketing preview per
`.icm/intake/triage/admin-email-marketing-orphan.md`. Read `web/src/app/admin/email/page.tsx`
and `.icm/project.md`'s feature table first, then ask Jamie which of the three options
in the stub applies — this is a scope decision about an uncontracted feature, not a
code question, so do not pick for him. If the answer is "out", the removal mirrors
`.icm/intake/content-truth/remove-referral-surface.md`: page, `admin-nav.ts` entry,
`admin-preview.ts` fixtures, grep for stragglers. PR on a `claude/` branch; no local
checks — CI is the source of truth.
