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

## F4. Filing data for the tickets of F3

Linear was not written. On 2026-11-23 the parent session relayed Jamie's word to create these
tickets. The permission classifier of this session refused the write: the repo rule says that a
session does not write to Linear. File them with these values, or allow the write in this
session and say so here.

Common to all five:
- team `JAM`, project `agorasim`, state `Triage`, priority 4 (Low).
- Headings: Problem, Proposed changes, Acceptance criteria, Outcome. Take the text from F3.
- Header lines: the size; `depends-on`; `source: spike JAM-477, .icm/docs/social-engine.md
  (PR #270)`; and "Social follows after go-live (Jamie, 2026-11-23). Do not start before the
  site is live on `agorasim.pt`."
- Relation: each ticket is `related` to JAM-477.

| F3 # | Title | Labels | Estimate | Blocks |
|---|---|---|---|---|
| 1 | agorasim · The social studio has a photo library | Area/Client work, Type/Feature, lane/lane:new, flag/migration | 3 | 2 |
| 2 | agorasim · The social generator writes a week of posts in the brand voice | Area/Client work, Type/Feature, lane/lane:new | 3 | 3 |
| 3 | agorasim · Rita approves each social post with one tap (includes F1) | Area/Client work, Type/Feature, lane/lane:new, flag/migration | 3 | 5 |
| 4 | agorasim · The site has its Meta connection, and one test post proves it | Area/Client work, Type/Chore, lane/lane:chore, Waiting on/Waiting on a client | 1 | 5 |
| 5 | agorasim · Approved posts publish themselves to Instagram and Facebook | Area/Client work, Type/Feature, lane/lane:new, Waiting on/Waiting on a client | 5 | — |

Acceptance criteria to copy (2 to 5 each):
1. Rita uploads a photo from her phone and it shows in the list. Each photo has a JPEG copy at
   most 1440 px wide, ratio 4:5 to 1.91:1, under 8 MB. Tags and the consent flag show in the
   list. Portuguese, phone first.
2. One run writes a week of posts as markdown (photo, slot, PT and EN caption). Captions obey
   `voice.md`, under 2,200 characters and 30 hashtags. `pnpm social:load` writes them as
   `draft`, with no duplicate on a second run. No photo with a guest and no consent is used.
3. The studio lists `social_post_drafts` rows, no fixture, no banner. Edit, approve and reject
   go to the audit log. Copy caption and save photo in 3 taps or fewer, then "Marcar como
   publicado". Portuguese, phone first. F1 is corrected.
4. `.icm/setup/meta-social.md` lists each step with a box. The four env names are set in Vercel
   Production and UAT, no value in git. One test post appeared on the Page and on Instagram
   and was deleted, with the date recorded.
5. An approved post appears on Instagram and the Page at its slot and shows "Publicado" with
   the link. A failed post shows "Falhou" and "Tentar de novo" publishes it once. The kill
   switch stops all publishing. A token error sends an alert. A post without "Aprovar" never
   publishes.
