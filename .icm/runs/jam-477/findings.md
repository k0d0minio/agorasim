# Findings jam-477

## F1. Comments point to the deleted spike page and the wrong feature number

- `web/src/db/schema.ts`: the comment of `socialPlatformEnum` points to
  `.icm/docs/social-media-automation.md`. That page was deleted at `12caf1c`. Point it to
  `.icm/docs/social-engine.md`.
- `web/src/app/admin/social/page.tsx` and `web/src/lib/admin-preview.ts` say "Feature 5". The
  proposal of 2026-07-23 numbers the social generator as feature 4.
- Lane: chore. Fold it into S3.

## F2. Draft comment for JAM-477 (the operator posts it; this pipeline does not write to Linear)

> Spike done: `.icm/docs/social-engine.md` (PR #270).
> Answer: yes. We publish to the client's own Instagram and Facebook Page through the Graph
> API. Standard access is enough (own accounts only), so no App Review and no Business
> Verification. Recommended: a Business app in the client's portfolio, a system user token that
> never expires, env values in Vercel only.
> Client checklist (pt-PT, 8 steps, one batch): Instagram type Business, link to the Page,
> name the business portfolio, put Page and Instagram in it, check the domain, give Jamie full
> control, keep the photos, choose the rhythm.
> Build: 9 days in five tickets (S1 photo library, S2 generator, S3 approval screen, S4 Meta
> set-up act and test post, S5 auto-poster). S1 to S3 need no Meta access.
> AC 4 not met: no test post. The run had the order to make no Meta app and to post nothing.
> S4 makes it.

## F3. Draft build tickets (the operator files them in Linear)

1. **agorasim · The social studio has a photo library** — M, 2 d. The tab "Fotografias" in
   `/admin/social`. Upload from the phone to Vercel Blob under `social/`. Keep a JPEG copy in
   Instagram's limits (max 1440 px wide, 4:5 to 1.91:1, under 8 MB). Tags: experience, car,
   season, place. A flag: a guest is in the photo and said yes.
2. **agorasim · The social generator writes a week of posts in the brand voice** — M, 2 d.
   `workspaces/social-content/` in the shape of `geo-content/`. A posting calendar. PT and EN
   captions from `workspaces/_config/voice.md`. The loader `pnpm social:load` writes rows into
   `social_post_drafts` as `draft`. Depends on 1.
3. **agorasim · Rita approves each social post with one tap** — M, 2 d. `/admin/social` reads
   `social_post_drafts`. Edit, approve, reject. Copy caption, save photo, mark as posted.
   Audit each act. Portuguese, phone first. Remove the fixtures and the banner. A migration for
   approval and result columns. Includes F1. Depends on 2.
4. **agorasim · The site has its Meta connection, and one test post proves it** — S, 0.5 d.
   `.icm/setup/meta-social.md`: the Business app in the client's portfolio, the system user,
   the token in Vercel (names only in git). One test post to the Page and Instagram, then
   delete it. Blocked on the client checklist.
5. **agorasim · Approved posts publish themselves to Instagram and Facebook** — M, 2.5 d. A
   Graph API client (v27.0). The cron route `/api/cron/social`. The Instagram container flow
   and the Facebook photo post. The remote id, link or error on the row. Retry. A kill switch.
   An alert on a token error. Depends on 3 and 4.
