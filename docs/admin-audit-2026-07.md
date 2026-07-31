# Admin area — code, UX & product audit

**Date:** 2026-07-31 · **Scope:** `web/src/app/admin/**`, `web/src/components/admin/**`,
`web/src/lib/admin-auth.ts`, `web/src/lib/admin-format.ts`, `web/src/lib/admin-preview.ts`,
`web/src/proxy.ts`, `web/src/db/schema.ts`, plus the public form that feeds it.

Everything below judges the admin **as if the in-development areas were finished** — the point
is to find what's structurally wrong now, and what's missing from the product thesis, not to
count unfinished screens.

**Verdict in one line:** the design layer is genuinely good — better than most small-business
back offices — but the foundation it sits on has one real security hole, no error/loading
handling, no primitives layer, and a mobile story that stops at navigation. As a product it is
a *lead viewer*, not yet an *operations tool*: nothing in it tells you something happened,
nothing lets you act on a lead, and it's in English for two Portuguese operators.

---

## 1. Security & correctness

### 1.1 Server actions rely on the proxy for authorization — they shouldn't (highest priority)

Five actions in `web/src/app/admin/actions.ts` carry comments asserting
*"`/admin` is gated by `proxy.ts`, so this only runs for authenticated operators."*
That guarantee does not hold.

`proxy.ts` runs only for requests whose **URL path** matches `matcher: "/admin/:path*"`. A Server
Action is dispatched by the `Next-Action: <id>` header, and the action that executes is decided by
that header — not by the path posted to. A POST to any unmatched path (`/pt`, `/en/sobre`, …)
carrying an admin action's ID runs the action with no session check:

- `updateTourRequestStatus` — rewrite any lead's triage status
- `updateFeatureRequestStatus` — rewrite any backlog item's status
- `submitFeatureRequest` / `requestProposalFeatures` — unauthenticated writes into the DB
- `logout` — nuisance only

Exploitation needs the action ID, which is a build-stable hash living in the client chunks under
`/_next/static/` (also not gated by the matcher). That's obscurity, not a boundary — and it's
exactly the case Next.js's own docs call out: *authorization must be performed inside the action.*

**Fix:** add a `requireAdmin()` helper that reads the cookie and calls `verifySessionToken`, and
call it as the first line of every non-login action. Then delete the misleading comments — a
comment that states a false invariant is worse than no comment, because the next person builds on it.

### 1.2 The login action has no rate limiting

`login()` is unauthenticated by design and does an unthrottled password comparison. One shared
password, no attempt counter, no lockout, no delay, no logging of failures. A script can grind it
at whatever rate the platform allows. Add a per-IP limiter (Vercel KV / Upstash) or at minimum an
exponential delay plus a failure log.

### 1.3 Sessions cannot be revoked, and rotating the password doesn't end them

The token is `${expiresAt}.${hmac(expiresAt)}` — the expiry is the *entire* payload. Consequences:

- Every token minted in the same second is byte-identical; there is no per-session identity.
- Nothing can be revoked. Changing `ADMIN_PASSWORD` has **no effect** on live sessions — only
  rotating `ADMIN_SESSION_SECRET` logs everyone out, all at once.
- A leaked cookie is valid for the full 7 days with no way to kill it.

For two operators this is survivable, but it's worth a session ID + issued-at in the payload now,
so "sign out everywhere" is a one-line change later rather than a re-architecture.

### 1.4 Smaller auth notes

- `timingSafeEqual` early-returns on length mismatch (`admin-auth.ts:79`), leaking the password's
  length through timing. Compare SHA-256 digests instead — fixed length, no leak.
- The dev fallback password (`"agorasim"`) and secret are committed. They only apply when
  `NODE_ENV !== "production"`, which is correct today, but it means any environment that misses
  that flag ships an admin area with a publicly-known password. Prefer failing closed everywhere
  and requiring the env vars locally too.
- `/admin/login` doesn't redirect an already-authenticated user to the dashboard.

### 1.5 No error, loading, or not-found boundaries anywhere in the app

There is not a single `error.tsx`, `loading.tsx`, or `not-found.tsx` in `web/src/app`. Every admin
page is `force-dynamic` and hits Neon on render. If `DATABASE_URL` is unset or Neon is briefly
unavailable, `db/index.ts:28` throws and the operator sees Next's raw error screen — on a phone,
in production, with a stack trace shape that tells them nothing.

This is the single cheapest fix in the whole audit: an `app/admin/error.tsx` ("Couldn't reach the
database — try again") and an `app/admin/loading.tsx` skeleton would take an hour and remove the
worst failure mode.

### 1.6 The status selects swallow their own failures

`updateTourRequestStatus` and `updateFeatureRequestStatus` `return` silently on invalid input and
have no `try/catch` around the DB write. Combined with the auto-submit-on-change select
(§3.1), the operator gets **no signal at all** when a status change doesn't land — the select shows
the new value locally, the DB never changed, and after the next navigation it's back to the old one.
Silent data loss on the one write path the admin actually uses today.

### 1.7 Public form has no spam protection

`submitTourRequest` has no rate limit, no honeypot, no captcha, no duplicate check. The admin
Submissions page is the direct consumer: the first bot that finds the form makes the admin unusable,
and there's no bulk-delete or bulk-archive to recover with (§3.4).

---

## 2. Code quality & architecture

### 2.1 No form primitives — the same input class string is copy-pasted 5+ times

The repo's stated convention is shadcn/ui, but `web/src/components/ui/` contains only `accordion`,
`badge`, `button`, `card`, `navigation-menu`, `separator`, `sheet`. No `Input`, `Select`,
`Textarea`, `Label`, `Table`, `Dialog`, `Toast`.

So this exact string is duplicated across `login-form.tsx`, `feature-request-form.tsx`,
`request-status-select.tsx`, `feature-request-status-select.tsx`, `proposal-catalogue.tsx` and
`tour-request-form.tsx`:

```
h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

Every future field styling decision is a six-file search-and-replace. Add `ui/input.tsx`,
`ui/textarea.tsx`, `ui/select.tsx`, `ui/label.tsx`, `ui/table.tsx` — this is the highest
leverage refactor in the admin and it unblocks several UX fixes below.

### 2.2 The navigation map exists in three places

- `SECTIONS` in `app/admin/page.tsx:34` — 10 entries with `dev` flags, hrefs, icons, descriptions
- `NAV_GROUPS` in `components/admin/admin-shell.tsx:47` — the same 10, again with `dev` flags
- the `title` string every page hand-passes to `<AdminShell title="…">`

Three copies of the same truth, kept in sync by hand. They happen to agree today. Extract one
`admin-nav.ts` module; derive the dashboard cards, the sidebar, the bottom sheet **and** the page
title from it. (This is the repo's own ICM principle — *configure the factory, not the product* —
applied to its own UI.)

Related: `PRIMARY_ITEMS` (`admin-shell.tsx:83`) uses a non-null assertion over a `.find()`. A typo
in `PRIMARY_HREFS` crashes the whole shell at module evaluation, on every page, with no error
boundary to catch it (§1.5).

### 2.3 Badge variant types are hand-mirrored and already stale

`admin-format.ts:9` and `proposal.ts:20` each declare their own `BadgeVariant` union. Neither
includes `ghost` or `link`, which `badge.tsx` does define — and `bookings/page.tsx:61`,
`referrals/page.tsx:60` and `notifications/page.tsx:31` already use `variant="ghost"`. The mirrors
are drifting from the source. Use
`VariantProps<typeof badgeVariants>["variant"]` and let the compiler enforce it.

### 2.4 Hand-rolled validation, three times

`isRequestStatus`, `isFeatureRequestStatus`, `isFeatureRequestPriority` are the same
`(ARRAY as string[]).includes(value)` guard written three times, and every action starts with a
wall of `String(formData.get(...) ?? "")`. There's no schema-validation dependency in
`package.json`. One `zod` schema per action would delete all of it and give real field errors for free.

### 2.5 Query patterns won't survive success

- **Dashboard**: 10 separate `count()` queries (`page.tsx:133`). Neon's HTTP driver means 10 round
  trips per dashboard render, on a `force-dynamic` page, on every load. Four `GROUP BY status`
  queries — or one `UNION ALL` — gives the same numbers in one trip.
- **Unbounded selects**: `submissions`, `feature-requests` and `content` all do bare
  `db.select().from(...)` with no `LIMIT`. Every row, every render, forever. Enquiry #500 renders
  a 500-row table into the RSC payload of a phone.
- **No indexes**: `schema.ts` declares none. Every dashboard count is a sequential scan on
  `status`; every list is a sort on `created_at`. Add them before it matters, not after.

### 2.6 `revalidatePath` is redundant on `force-dynamic` pages

All four data pages declare `export const dynamic = "force-dynamic"`, so they re-render on every
request anyway. The `revalidatePath("/admin/…")` calls after each mutation are no-ops dressed up as
correctness ("revalidates the page so the change is reflected immediately"). Harmless, but it
misrepresents how the page actually stays fresh.

### 2.7 Duplicate-prevention has a race

`requestProposalFeatures` reads existing proposal titles, then inserts (`actions.ts:196–218`).
Two clicks in flight both read "not present" and both insert. There's no unique constraint to catch
it. Either add `unique(title, category)` or use `onConflictDoNothing`.

### 2.8 Dead dark-mode surface

`globals.css` defines `@custom-variant dark` and a full `.dark` token block; `badge.tsx` and others
ship `dark:` classes. Nothing ever sets the `dark` class — no theme provider, no toggle, no
`prefers-color-scheme` hook-up. The admin layout hardcodes `themeColor: "#fdfaf4"`. Either wire it
up (an ops tool used in a car, at night, has a real case for it) or delete the tokens so the next
person doesn't assume dark mode works.

### 2.9 No tests, no lint in CI

Zero test files in the repo. `.github/workflows/` contains only `db-migrate.yml` — nothing runs
`next build`, `eslint`, or `tsc` on a PR. The auth helpers (`createSessionToken` /
`verifySessionToken` / expiry) and `computeTotals` in `proposal.ts` are pure functions with real
branching logic and are the obvious first tests. A build+lint+typecheck workflow is an hour's work.

### 2.10 The sales proposal is compiled into the ops app

`proposal.ts` (210 lines of pricing) and `proposal-catalogue.tsx` (372 lines, including a bespoke
`requestAnimationFrame` count-up animation) ship in the admin bundle, and the catalogue renders
*above* the actual feature-request form on `/admin/feature-requests`. Also `admin-preview.ts`
(210 lines of fake leads, bookings and campaigns) ships to production.

This is a deliberate sales device and it's a clever one — but see §3.6 for why it shouldn't live
where it lives.

---

## 3. UX

### 3.1 The status control shows the same value twice and gives no feedback

Every row in Submissions and Feature requests renders a `<Badge>` with the current status **and**,
directly below it, a `<select>` preset to that same status. Two controls, one value, stacked.

Worse, the select auto-submits `onChange` with:

- no pending state (`useFormStatus` is available and unused here)
- no optimistic update
- no success confirmation
- no error surface (§1.6)

On a phone on 4G, the operator taps a status, sees nothing change for a second or two, and taps
again. Replace with a single control: a `DropdownMenu` whose trigger *is* the badge, with an
optimistic update (`useOptimistic`) and a toast on failure.

### 3.2 No way to actually work a lead

Submissions is read-only apart from the status field. From a new enquiry the operator can:
`mailto:` the guest (leaving the app, losing all context, with no record that it happened).

Missing: notes, contact history, "mark as replied", a reply template, a phone/WhatsApp link
(`tel:` / `wa.me` — the phone number is captured and rendered as *plain text*, not even tappable at
`submissions/page.tsx:75`). The CRM preview promises "notes, contact history and reminders one tap
away", which is exactly right — but none of that exists on the page that has real data today.

### 3.3 No search, filter, sort, or pagination

Not on Submissions, not on Feature requests, not on Content. The only ordering is
`createdAt DESC`. There's no "show me only new", no "find the Carter enquiry", no date range —
on the page whose entire job is triage. Filtering by status is table stakes and the enum already
exists.

### 3.4 No bulk actions and no delete

Nothing can be deleted or bulk-archived anywhere in the admin. Spam (§1.7), test rows, and
duplicate proposal requests are permanent. For GDPR alone (§4.4) there must be a way to delete a
person's record.

### 3.5 The dashboard is a link list

Ten cards, one per area — of which seven are marked "In development" and go to preview screens.
On mobile that's a single column: the operator scrolls past seven dead ends to reach Content and
Feature requests. Meanwhile the four stat tiles are counts with no trend, no comparison, no
click-through to a filtered view ("New submissions: 3" should link to Submissions filtered to
`status=new`).

The sidebar already lists every area. The dashboard should answer *"what needs me today?"* —
newest unanswered enquiries, drafts awaiting review, anything overdue — not repeat the nav.

### 3.6 The proposal catalogue hijacks a functional page

`/admin/feature-requests` opens with a €7,900 priced catalogue and a running-total gauge, then the
real form, then a list mixing genuine operator ideas with auto-generated "Proposal" line items whose
descriptions embed prices. The client's own backlog tool leads with an upsell.

It's effective as a sales artefact and awkward as a product: it means the operator can't use their
own backlog without scrolling past a price list, and the backlog itself is now two unrelated kinds
of thing in one list. Give it its own route (`/admin/roadmap`), and filter proposal-category items
out of the free-form request list.

### 3.7 Small things that add up

- The header (`h-14`, page title + Sign out) doesn't stick. On a long list on mobile, scrolling
  loses both the title and the only way to sign out.
- No breadcrumbs, no back affordance in the PWA — installed standalone, there's no browser chrome
  either, so a deep page has no "up".
- `formatDate` renders `31 Jul 2026` with no time. For triage, *"3h ago"* is the useful unit —
  the CRM preview already uses relative ages, so the pattern is agreed, just not implemented where
  the real data is.
- Empty states are good (`PlaceholderPanel`) — keep them.
- "In development" is signalled three different ways: a `Badge` on the dashboard, a coloured dot in
  both navs, and a full banner on the page. Pick one or two.

---

## 4. Mobile-first review

The admin is *installed* as a PWA — manifest, maskable icons, `viewportFit: "cover"`,
safe-area padding, a bottom toolbar. The intent is clearly phone-first, and the navigation shell
delivers on it. The **content** does not.

### 4.1 Data tables are desktop tables in a horizontal scroller

| Page | Forced minimum width |
| --- | --- |
| Submissions | `min-w-[860px]` |
| Bookings | `min-w-[760px]` |
| Referrals | `min-w-[700px]` |

On a 390px iPhone, Submissions — the one page with real data, and the reason to open the app at
all — is a 7-column table you scroll sideways through, with the Status control in the *last* column,
furthest from the thumb. Message text is clamped to `max-w-xs` inside a cell.

This is the audit's biggest mobile finding: mobile-first navigation wrapped around desktop-first
content. Below `md`, these should be stacked cards — name + experience + relative time + a
thumb-reachable status control — with the table kept for `md:` and up.

### 4.2 The proposal catalogue's sticky bar is hidden behind the bottom toolbar

`proposal-catalogue.tsx:229` uses `sticky bottom-4 z-20`. The mobile nav is `fixed inset-x-0
bottom-0 z-40` and roughly `4.5rem` tall. Sticky positioning is resolved against the **viewport**,
not against `<main>`'s bottom padding — so on any screen below `md` the running total, the name
field, Clear and "File N as requests" sit *underneath* the toolbar. The primary action of that
page is unreachable on a phone. Needs `bottom-[calc(4.5rem+env(safe-area-inset-bottom)+1rem)]`
below `md`, or a `z-index` above the nav plus matching offset.

### 4.3 Bottom toolbar details

- `aria-expanded={active}` on the "More" button (`admin-shell.tsx:147`) reflects *route state*, not
  whether the sheet is open. It should be `aria-expanded={moreOpen}` and have
  `aria-controls`/`aria-haspopup="dialog"`. As written it announces "expanded" whenever you're on
  any non-primary page, with the sheet closed.
- The "More" tab shows as *active* on 6 of the 10 areas — so Content, Notifications and Feature
  requests never get a highlighted tab of their own. The 4 fixed slots include two in-development
  screens (CRM, Bookings) while the two areas with real data (Content, Feature requests) are buried
  in the sheet. The toolbar prioritises the demo over the job.
- Labels are `text-[10px]`. That's below any readable-minimum guidance, in a `muted-foreground`
  colour, for a tool used outdoors.
- Total tab height lands around 44px — just at the floor of Apple's 44pt / Google's 48dp guidance,
  with no margin.

### 4.4 Other mobile gaps

- The CRM board is a horizontal scroller of `w-72` columns with `cursor-grab` cards — a
  mouse metaphor with no touch equivalent designed in. Worth resolving *before* it's built:
  on a phone, a per-column list with a "move to…" action beats drag-and-drop.
- No `loading.tsx` (§1.5) means every navigation on a phone is a dead tap until the DB responds.
- No offline handling despite being an installable PWA: no service worker, so airplane mode or a
  dead spot in the Saloia countryside gives the browser's offline page. For a tool meant to be used
  *in a car between tours*, a read-only cache of today's leads is arguably the whole point of
  installing it.
- Portrait is locked in the manifest, but the wide tables are exactly the content that would
  benefit from landscape.

---

## 5. Accessibility

- **Tables**: no `<caption>`, no `scope="col"` on any `<th>`. Screen-reader users get an
  unnavigable grid on the main triage page.
- **Fake switch**: `notifications/page.tsx:46` puts `role="switch" aria-checked aria-disabled` on a
  `<span>` with no `tabindex`. It announces as an interactive control that cannot be reached or
  operated. For a decorative preview, `aria-hidden="true"` is the correct answer.
- **`aria-label` on plain spans**: the "in development" dots (`admin-shell.tsx:109` and `:218`)
  put `aria-label` on a `<span>` with no role. `aria-label` is ignored on generic elements by most
  screen readers, so the marker is silent. Use a visually-hidden `<span>` with text.
- **`title` as the only tooltip** (`admin-shell.tsx:109`, `proposal-catalogue.tsx:197`) — never
  appears on touch, which is the target platform. The add-on cards put their entire `summary` in a
  `title`, so on a phone that explanatory text simply doesn't exist.
- **Contrast**: `text-muted-foreground/70` at `text-[10px]`/`text-[11px]` appears in the sidebar
  footer, the sheet footer, the group headers and every toolbar label. Almost certainly fails
  WCAG AA on the `#fdfaf4` background.
- **Focus**: the dashboard section `<Link>` wraps a whole `<Card>` with no visible focus ring
  (`page.tsx:214`) — hover is styled, focus is not.
- **Keyboard**: an auto-submitting `<select>` (§3.1) fires on arrow-key navigation in some
  browsers, so a keyboard user browsing options can trigger several writes before reaching the one
  they wanted.

---

## 6. Does it hold up as a product?

### What's genuinely strong

1. **The design and the framing.** The information architecture (Overview / Sales / Marketing /
   System) maps to jobs, not to database tables. The copy is written for two tour operators, not
   for engineers. That's rarer and harder than the code.
2. **The honesty mechanism.** Rendering unfinished features as real layouts with clearly-labelled
   example data, and a consistent in-dev banner, is a much better way to sell a roadmap than a
   slide deck — the client can *feel* the product.
3. **The content pipeline is a real differentiator.** The workspaces → drafts → review → publish
   loop, with GEO as a first-class concern, is the part of this that a competitor can't buy off the
   shelf.
4. **PWA + bilingual content model + JSON-LD.** The foundations that are hard to retrofit are in
   place.

### The structural problem: it's a pull tool in a push job

The admin only works if someone remembers to open it. There are no notifications, no email on a new
lead, no badge, no digest. Diogo and Rita run tours — they're driving a classic car around Sintra,
not refreshing a dashboard. **Realistically, an enquiry sits unseen until someone happens to check.**

Notifications is listed as a €700 feature. It shouldn't be a feature — it's the precondition that
makes every other feature get used. Ship "email/WhatsApp the team on a new enquiry" before anything
else on the roadmap, or the admin stays a demo no matter how good the screens are.

### The second structural problem: it doesn't know about the bookings that actually happen

Booking today goes through **FareHarbor** (`fareharbor-script.tsx`, and `/reservar` is a *preview*
of a booking flow that persists nothing). So the real revenue events happen in a system the admin
cannot see. The admin knows about *enquiries*; the business runs on *bookings*.

Until instant booking + Stripe ships, the Bookings and CRM pages will show example data while the
operator does the real work in FareHarbor's dashboard — two systems, no reconciliation. Either
pull FareHarbor bookings in via their API now, or be explicit that the admin is enquiry-only until
Stripe lands. Anything in between trains the team not to trust the tool.

### The third: it's in the wrong language

The site is meticulously bilingual PT/EN because the *guests* need it. The admin is
`lang="en"`, English-only, hardcoded — for two Portuguese operators who will use it every day. The
`Localized<T>` machinery and the `t()` helper already exist and are used everywhere else. This is a
notable inconsistency, and it's the kind of thing that quietly decides whether a tool gets adopted.

### What else is missing

**To be trustworthy**
- Per-user login. A shared password means no audit trail: you can never answer "who archived this
  lead?" or "who approved that post?". The schema has `submittedBy` as *free text the user types* —
  which tells you the gap is already felt.
- Delete / export of a guest's data. `tour_requests` holds name, email, phone and free-text message
  — PII, EU citizens, no retention policy, no deletion path, no privacy policy in the repo. GDPR
  is currently a €300 add-on in the catalogue; it's a legal obligation the moment the form is live.
- An audit log on status changes.

**To be useful daily**
- Reply-from-the-app with templates (see §3.2), and a record that a reply was sent.
- Availability / calendar. There is nowhere in the system that knows which days are already booked,
  which car is out, or who's driving. For a business whose constraint is *one car, one day*, that's
  the most conspicuous absence in the whole product.
- Search and filter (§3.3).
- Money: no revenue view, no deposits owed, no unpaid balances. The Bookings preview shows payment
  states; nothing aggregates them.

**To grow**
- Analytics tying a lead to its source. GEO is the whole marketing thesis and there is currently no
  way to see whether it works — which enquiry came from which page, query, or AI referrer. The
  content pipeline generates blocks aimed at named `targetQuery` values; nothing measures them. If
  one add-on graduates to a core feature, it's this one.
- Reviews. Social proof drives this category and nothing in the system captures or requests it.
- Seasonality. Tours are weather- and season-dependent; nothing models it.

### What I'd cut or defer

- **Referrals (€800)** before notifications and reviews exist is out of order — a referral system
  with no automated "share your experience" email is a page nobody visits.
- **Email marketing (€800)** needs a list. Right now the only email addresses in the system are
  enquiry contacts, with no consent capture on the form. Add a consent checkbox *now*, cheaply, so
  the list exists when the feature ships. Without it the feature launches to an empty — and
  legally unusable — audience.
- **TikTok/YouTube** posting: correctly deferred already.

### Suggested order

1. New-enquiry notification (email/WhatsApp to the team) — makes everything else get used
2. `requireAdmin()` in every server action + login rate limiting — §1.1, §1.2
3. `error.tsx` / `loading.tsx` — §1.5
4. Mobile card layout for Submissions + fix the hidden sticky bar — §4.1, §4.2
5. Reply-from-app with notes and contact history, on real submission data — §3.2
6. Filter + search + pagination — §3.3
7. Consent checkbox on the public form, delete/export for a guest record — GDPR
8. `ui/` form primitives + one `admin-nav.ts` — §2.1, §2.2 (do before building more screens)
9. FareHarbor read-only sync, or instant booking + Stripe — the revenue gap
10. Availability calendar
11. Lead-source attribution

---

## Appendix — file references

| Finding | Location |
| --- | --- |
| Actions trust the proxy | `web/src/app/admin/actions.ts:76`, `:110`, `:150`, `:177`; `web/src/proxy.ts:31` |
| No login rate limit | `web/src/app/admin/actions.ts:35` |
| Session cannot be revoked | `web/src/lib/admin-auth.ts:93` |
| Password length timing leak | `web/src/lib/admin-auth.ts:79` |
| Silent status-update failure | `web/src/app/admin/actions.ts:77`, `:151` |
| Duplicated input classes | `login-form.tsx:35`, `feature-request-form.tsx:11`, `request-status-select.tsx:30`, `feature-request-status-select.tsx:30`, `proposal-catalogue.tsx:269`, `tour-request-form.tsx:13` |
| Nav duplicated | `app/admin/page.tsx:34`, `components/admin/admin-shell.tsx:47` |
| Non-null assertion in nav | `components/admin/admin-shell.tsx:83` |
| Stale BadgeVariant mirrors | `lib/admin-format.ts:9`, `lib/proposal.ts:20` |
| 10 dashboard round-trips | `app/admin/page.tsx:133` |
| Unbounded selects | `submissions/page.tsx:25`, `feature-requests/page.tsx:21`, `content/page.tsx:84` |
| Dedupe race | `app/admin/actions.ts:196` |
| Tables forced wide on mobile | `submissions/page.tsx:49`, `bookings/page.tsx:43`, `referrals/page.tsx:39` |
| Sticky bar behind toolbar | `components/admin/proposal-catalogue.tsx:229` vs `admin-shell.tsx:164` |
| Wrong `aria-expanded` | `components/admin/admin-shell.tsx:147` |
| Non-interactive `role="switch"` | `app/admin/notifications/page.tsx:46` |
| `aria-label` on plain span | `components/admin/admin-shell.tsx:109`, `:218` |
| Phone not tappable | `app/admin/submissions/page.tsx:75` |
