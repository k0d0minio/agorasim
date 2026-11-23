# Social engine — Meta access, the generator and the auto-poster

- status: spike result of JAM-477, 2026-11-23. Time box: 2 days. Nothing is built.
- source: proposal of 2026-07-23, feature 4 ("On-brand posts for Instagram & Facebook generated
  and scheduled automatically", €900). Decision of 2026-08-29 in `.icm/intake/README.md`: the
  generator writes drafts for manual posting, and the auto-poster waits on the client's
  Meta access.
- replaces: the spike `.icm/docs/social-media-automation.md` of 2026-07-01 (deleted at
  `12caf1c`) and the stubs of `.icm/intake/social-engine/` (deleted at `100458d`). Those
  compared five networks. The proposal names only Instagram and Facebook, and so does this page.

## The answer

Yes. The site can publish to the client's own Instagram and Facebook Page through Meta's
official Graph API. Because the site posts only to the client's own accounts, Meta's Standard
access is enough: no App Review and no Business Verification. The client must give three
things: an Instagram account of type Business that is linked to the Facebook Page, full
control of their Meta business portfolio for Jamie, and the photos in a library that does not
expire. The generator needs no Meta access. It can ship first, and Rita posts by hand until
the auto-poster is on. The build is 9 working days in five tickets.

## What is true today

| Item | State on 2026-11-23 | Where |
|---|---|---|
| Instagram `@agorasim.pt` | Exists. 191 posts, about 3,730 followers. The account type (Business, Creator or personal) is not visible from outside | public profile |
| Facebook Page `facebook.com/agorasim.pt` | Exists. Category "Sightseeing tour agency", 638 followers. It shows the same reels as Instagram, so the two accounts are probably linked. Not proven | public Page |
| Meta business that owns the Page | Unknown | — |
| `facebook-domain-verification=tr88umay1su0fk1udrsoazoya8y6sq` | A TXT record on `agorasim.pt`, now served by Vercel DNS. It was copied from the Amen zone. Some Meta business portfolio verified the domain in the past. Which one is unknown | `.icm/docs/launch-runbook.md` |
| Meta app | None. This spike made no app | — |
| Social studio `/admin/social` | A design preview. It renders the fixtures `previewSocialPosts` and shows `AdminInDevBanner`. All buttons are disabled | `web/src/app/admin/social/page.tsx`, `web/src/lib/admin-preview.ts` |
| Table `social_post_drafts` | Exists, with no reader and no writer. Columns: platform, caption (PT/EN), hashtags, experience slug, media URL, scheduled time, status (`draft`, `in_review`, `approved`, `published`) | `web/src/db/schema.ts` |
| Enum `social_platform` | Has `tiktok`, `youtube` and `linkedin` too. Its comment points to the deleted spike page | `web/src/db/schema.ts` |
| Social workspace | None. `workspaces/geo-content/` is the pattern (stages `01_research`, `02_draft`, `03_publish`) | `workspaces/` |
| Voice | `workspaces/_config/voice.md`: warm, concrete, PT first, EN as a parallel native text | — |
| Photo store | Vercel Blob, public store, used by `/admin/experiences` (JPEG, PNG, WebP, AVIF, max 5 MB) | `web/src/lib/experience-images.ts` |
| Cron | Three daily crons in `web/vercel.json`. The dispatcher runs at 06:00 UTC | `web/src/app/api/cron/dispatch/route.ts` |
| Photos of the info request (I §2.1, §2.5) | WeTransfer links. They expire. No stored library | `agorasim-info.pdf` |

## Meta access

Facts from Meta's developer docs, read on 2026-11-23. The Graph API version is v27.0
(released 2026-11-04).

### The three Instagram paths

| Path | Needs a Facebook Page | Permissions to publish | Token |
|---|---|---|---|
| Instagram API with Facebook Login | Yes, linked | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list` | Page access token. A Page token from a long-lived user token has no expiry date |
| Instagram API with Instagram Login | No | `instagram_business_basic`, `instagram_business_content_publish` | Instagram user token. 60 days. Refresh it before day 60, or it dies |
| Instagram API with Unified Login (Meta: "recommended for new integrations") | No, a business portfolio | as Facebook Login | Business Integration System User token. Never expires by default |

All paths need a professional Instagram account (Business or Creator). A personal account
cannot publish through the API.

### Facebook Page

- Permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
- The person behind the token must have the Page tasks CREATE_CONTENT, MANAGE and MODERATE.
- The token is the same Page token as the Instagram path with Facebook Login. One token
  publishes to both networks.
- Facebook has a native schedule: `published=false` and `scheduled_publish_time`, from 10
  minutes to 30 days ahead. This design does not need it (see the auto-poster).
- If Meta asks the Page for Page Publishing Authorization (PPA), the API cannot publish until
  an admin completes it.

### App Review and verification: not needed for this case

- Standard access is automatic for each permission. It is enough when each user of the app
  has a role on the app, or a role in the business that owns the app.
- Meta: "If your app will only be used by app users who have a role on the app itself, App
  Review is not required."
- Business Verification is required only for Advanced access.
- The site publishes only to the client's own accounts. No outside person connects. Thus
  **Standard access is enough: no App Review and no Business Verification.**
- The app must be of the type **Business**. A Business app has no Development mode. In
  Development mode, a test post is visible only to the role users of the app.

### The recommended set-up

1. The client's Meta business portfolio owns the Facebook Page and the Instagram account.
2. The client adds Jamie to that portfolio with full control.
3. Jamie makes a Business app inside the client's portfolio. The client owns the app, as the
   proposal promises ("You hold the keys").
4. Jamie makes one system user in the portfolio, installs the app for it, and gives it the
   Page and the Instagram account.
5. Jamie makes a system user token with the permissions above, with the expiry "Never".
6. The token goes into Vercel as an env value. It is never in git. The site keeps only the
   names: `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID`, `META_GRAPH_VERSION`.

Fallback, if the system user token cannot publish (not proven in Meta's docs): Jamie takes a
task on the Page, and the site uses a Page token from Jamie's long-lived user token. It also
has no expiry date. It dies when Jamie loses the Page task or changes the Facebook password.

### Publishing rules that the build must obey

- Instagram flow: `POST /{ig-id}/media` with `image_url` and `caption` makes a container.
  Read `status_code` until it is `FINISHED`. Then `POST /{ig-id}/media_publish` with
  `creation_id`. A container expires after 24 hours.
- The image must be at a public URL at the time of the call. A public Vercel Blob URL is good.
- Image: **JPEG only**, 8 MB at most, 320 to 1440 px wide, aspect ratio from 4:5 to 1.91:1,
  sRGB. The library must keep a JPEG copy of each photo in these limits.
- Caption: 2,200 characters at most, 30 hashtags at most, 20 @-tags at most.
- Limit: 50 published posts in 24 hours (Meta's pages say 50 and 100; read the live value
  at `/{ig-id}/content_publishing_limit`). Agorasim needs 3 or 4 a week.
- Instagram has no native schedule. The cron that publishes sets the post time.
- Carousels (up to 20 images, one post) and reels are possible later. The first build is one
  photo per post.
- Meta's Developer Policies forbid spam and ask for consent before a post on a person's
  behalf. The approval tap is that consent. Meta asks for no AI label on a still photo with an
  AI-written caption.

### The domain verification record

The TXT record proves that one Meta business portfolio verified `agorasim.pt` (Business
settings → Brand safety → Domains). Meta's docs give no way to read which portfolio it is from
outside. The client can see it in their portfolio. Keep the record: Meta checks it again from
time to time. The auto-poster does not need it.

### The test post

No test post was made. This spike had the order to make no Meta app and to post nothing, and
no access exists. The test post is the last step of the set-up act (ticket S4 below).

## Checklist for the client (pt-PT)

Para o Diogo e a Rita. São 8 passos. Os passos 1 a 6 levam cerca de 20 minutos ao todo.
Façam-nos num computador, com a conta de Facebook que administra a Página da Agorasim.

1. **Confirmar o tipo da conta de Instagram.** Na aplicação do Instagram, abram o perfil
   `@agorasim.pt` → Menu → Definições → "Tipo de conta e ferramentas". A conta tem de ser
   **profissional**, do tipo **Empresa**. Se for pessoal, toquem em "Mudar para conta
   profissional" e escolham "Empresa".
2. **Ligar o Instagram à Página de Facebook.** Na Página de Facebook da Agorasim → Definições →
   "Contas ligadas" → Instagram → "Ligar conta". Entrem com a conta `@agorasim.pt`.
3. **Encontrar o portfólio empresarial.** Abram `business.facebook.com`. Vejam se existe um
   portfólio empresarial (antes chamado "Gestor de Negócios") da Agorasim. Digam-nos o nome.
   Se não existir, criem um com o nome "Agorasim" e o email `info@agorasim.pt`.
4. **Pôr a Página e o Instagram no portfólio.** Em Definições da empresa → Contas → Páginas,
   confirmem que a Página "Agorasim" está lá. Em Contas → Contas do Instagram, confirmem que
   `@agorasim.pt` está lá. Se faltar uma, toquem em "Adicionar".
5. **Ver o domínio.** Em Definições da empresa → Segurança da marca → Domínios, vejam se
   `agorasim.pt` aparece como verificado. Digam-nos "sim" ou "não". Não apaguem nada.
6. **Dar acesso ao Jamie.** Em Definições da empresa → Utilizadores → Pessoas → "Adicionar",
   escrevam o email que o Jamie vos indicar e escolham **controlo total** (acesso de
   administrador). O Jamie aceita o convite. Com este acesso, o Jamie cria a ligação oficial
   do site à Meta, dentro do vosso portfólio. A ligação fica vossa.
7. **Guardar as fotografias.** Os links WeTransfer expiram. Guardem as fotografias que querem
   ver publicadas. Quando a área "Redes sociais → Fotografias" estiver pronta, carreguem-nas lá
   a partir do telemóvel. Numa foto com clientes, confirmem que eles aceitaram aparecer.
8. **Escolher o ritmo.** Digam-nos quantas publicações querem por semana e a que horas. Se não
   disserem nada, começamos com 3 por semana (terça, quinta e sábado) às 18h00.

Nenhum destes passos dá ao Jamie a vossa palavra-passe. Podem retirar o acesso do passo 6 a
qualquer momento, na mesma página.

## The design: from photo to published post

```
 Rita (phone)                 Jamie (weekly)                    Rita (phone)               cron
 ─────────────                ──────────────                    ────────────               ────
 1. Upload photos  ──►  2. Run workspaces/social-content/  ──►  4. /admin/social:   ──►  5. At the slot:
    to /admin/social        - picks photos + calendar slots        - read, edit          publish to IG + FB
    "Fotografias"           - writes PT + EN captions             - tap "Aprovar"       record the post id
    (tags, consent)          from voice.md + business-facts.md     or "Rejeitar"         and the link, or
                         3. pnpm social:load → social_post_drafts                        the error
                            (status: draft)                                           6. Card shows
                                                                                         "Publicado" + link
```

1. **The photo library.** Rita uploads photos from her phone in a new tab "Fotografias" of
   `/admin/social`. The upload uses the same Vercel Blob path as `/admin/experiences`, under the
   prefix `social/`. Each photo has tags (experience, car, season, place) and one flag: "a guest
   is in this photo, and that guest said yes". A photo with a guest and no yes is never used.
   The library replaces the WeTransfer links.
2. **The generator.** A new ICM workspace `workspaces/social-content/`, in the shape of
   `geo-content/`. Jamie runs it by hand, one batch for each week or two, as for the blog.
   Its inputs are the photo library, the experiences and the season (`business-facts.md`), new
   blog articles, and the posting calendar. Its output is reviewed markdown: one file for each
   post, with the photo, the slot, the PT caption, the EN caption and the hashtags. The voice
   rules come from `workspaces/_config/voice.md`.
3. **The loader.** `pnpm social:load` writes the batch into `social_post_drafts` with the
   status `draft`. It is a copy of `scripts/load-blog-drafts.ts`.
4. **The approval screen.** `/admin/social` becomes real, phone first, in Portuguese. One card
   for each post: the photo, the caption, the slot, the network. The actions are "Editar",
   "Aprovar" and "Rejeitar". Until the auto-poster is on, the card also has "Copiar legenda",
   "Guardar foto" and "Marcar como publicado". Each action goes to the audit log. Nothing
   publishes without the tap "Aprovar". This is the rule of the blog studio: the client owns
   the publish moment.
5. **The auto-poster.** A cron route publishes each approved post at its slot.
   - Instagram: create a media container from the public Blob URL and the caption, then
     publish the container. Instagram has no native schedule, so the cron time is the post time.
   - Facebook: post the photo and the message to the Page.
   - The row gets the remote post id, the permalink and the time, or the error text.
   - A kill switch (an env value) stops all publishing at once.
6. **The result.** The card shows "Publicado" with the link, or "Falhou" with the reason and
   a button "Tentar de novo".

The text of one post is the PT caption, a blank line, then the EN caption. This keeps one
post for both audiences and keeps one calendar. Question 1 below can change this.

## The build plan

Total: **9 working days**, in five tickets. The first three need no Meta access, and they
give the client a working generator with manual posting (the decision of 2026-08-29).

| # | Ticket | Size | Depends on | Meta access |
|---|---|---|---|---|
| S1 | The photo library: the tab "Fotografias" in `/admin/social`, upload to Blob under `social/`, a JPEG copy in Instagram's limits, tags, the guest-consent flag | M · 2 d | — | no |
| S2 | The generator: `workspaces/social-content/` (stages as `geo-content/`), the posting calendar, PT and EN captions from `voice.md`, the loader `pnpm social:load` | M · 2 d | S1 (or the experience photos for a first batch) | no |
| S3 | The approval screen: `/admin/social` reads `social_post_drafts`; edit, approve, reject; copy caption, save photo, mark as posted; audit; Portuguese; fixtures and banner removed; a migration for the approval and result columns | M · 2 d | S2 | no |
| S4 | The Meta set-up act: `.icm/setup/meta-social.md` (the app, the system user, the token in Vercel), then one test post to the client's Page and Instagram, then delete it | S · 0.5 d | the client's checklist | yes |
| S5 | The auto-poster: a Graph API client (v27.0), the cron route `/api/cron/social` with `CRON_SECRET`, the Instagram container flow and the Facebook photo post, the result on the row, retry, the kill switch, an alert on a token error | M · 2.5 d | S3, S4 | yes |

### Risks

- **Meta review time.** This design needs Standard access only, so the expected review time
  is **0 days**. If Meta asks for App Review or Business Verification all the same (for
  example, a permission that Meta moves to Advanced access), the wait is not in our control.
  Meta publishes no general figure. Reports from 2026 say 10 to 20 working days or more, and a
  review can fail. S1 to S3 do not wait for it.
- **The client's access.** S4 and S5 wait for the checklist. The info request of 2026-08-10
  asked for this access and did not get it.
- **Token death.** A token dies when Meta invalidates it (a password change, a removed role,
  a security event). S5 must show the error in the studio and send an alert, not fail in
  silence.
- **Page Publishing Authorization.** If Meta asks the Page for it, publishing stops until an
  admin completes it.
- **Vercel cron precision.** The Vercel plan of the team is not recorded in this repo. On the
  Hobby plan a cron runs once a day, at a time inside the hour. A daily slot at 18:00 Lisbon is
  enough for 3 posts a week.
- **Photo rights.** A photo with a guest needs that guest's yes. The library flag holds it.

## Still unknown

- The Instagram account type (Business, Creator or personal). Checklist step 1.
- The link from Instagram to the Page. The public pages suggest it. Checklist step 2.
- The business portfolio that owns the Page, and the one that verified `agorasim.pt`.
  Checklist steps 3 and 5.
- If a system user token can publish to the Page and to Instagram. Meta's docs cover the
  token, not a post with it. S4 proves it, or S4 uses the fallback.
- The live Instagram publishing limit (50 or 100). S5 reads it from the API.
- The Vercel plan of the team `Kodominio` (cron frequency).

### Questions for Jamie

1. Is the text of a post PT and EN in one post, or PT only? Default: PT first, a blank line,
   then EN, in one post.
2. Does the generator write a separate caption for Instagram and for Facebook? Default: one
   caption for both, with hashtags on Instagram only.
3. Does the enum `social_platform` lose `tiktok`, `youtube` and `linkedin`? The proposal names
   only Instagram and Facebook. Default: keep the enum, show only the two networks.
