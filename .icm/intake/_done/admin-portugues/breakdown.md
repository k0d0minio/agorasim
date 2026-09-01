# Breakdown: Admin em português — the console becomes Diogo & Rita's

- epic-slug: admin-portugues
- sources: Jamie's design brief (2026-08-29: "Apple's norms and standards, intuitive for
  Diogo and Rita"); D4 (HIG mobile-first + hardcoded PT-only — no i18n rig); 2026-08-29
  ux lens ("the HIG layout pass is substantially already on main… the epic's remaining
  weight is language") + copy lens (idiom inventory); `.icm/docs/admin-pt-inventory.md`
  (the epic's own stub 1, merged 2026-08-29 in PR #32)
- recut: 2026-08-31 — batch re-read against `main` at `35f7491`

## What I understood

Rita runs the business from her phone; the console is hardcoded English with
`lang="en"` and no i18n machinery. The mobile-first HIG structure already largely
exists (bottom toolbar, 44px targets, safe areas, typed-DELETE confirms, a written
spec in `web/docs/admin-mobile-design-spec.md`) — so this epic is chiefly a
translation and plain-language pass, done as hardcoded Portuguese (D4), plus the
residual HIG polish. Two structural copy problems ride along: the Sales screen calls
one object three names (leads/enquiries/bookings), and several labels are
engineer-idiom that translates into nothing ("Blog studio", "why it went quiet",
"Content pushed live"). New admin surfaces from other epics are written in PT from
birth; this epic converts the stock.

## Where the epic actually stands (2026-08-31)

The inventory shipped and the code has not moved under it. Four things changed the
shape of what is left:

1. **Stub 1 is done.** `.icm/docs/admin-pt-inventory.md` (1115 lines) landed in PR #32:
   the glossary, the idiom renderings, every string by file and line, the tests that
   assert on strings, and nine open questions. `content/system.ts`'s note now names PT
   as the admin language. The stub is in `_done/`.
2. **The inventory's line numbers still hold.** Between `d8b5a58` (what §5 was written
   against) and `379b053`, the only changes under `web/src` were `system.ts` — stub 1's
   own — and `security-headers.ts`. That held everywhere except the calendar, which
   PR #31 rewrote mid-recut; see below. Spot-checking 23 of §5's references found 20 exact and three
   off by a line or two (`admin-shell.tsx` 59→60, `experience-form.tsx` 169→165,
   `sales.ts:77` names the function and 78 the literal); the stubs below cite the
   corrected lines. Search for the string, not the line.
3. **A third of the inventoried strings are not this epic's to translate.** Five
   surfaces are being deleted or rewritten in Portuguese by other epics. The
   2026-08-29 cut scoped them in; translating them now is either wasted or a conflict.
   See *Out of scope* — it removes roughly 100 of the ~590 strings §8 counted.
4. **PR #31 landed during this recut, and it rewrote the calendar.** The batch was
   re-read while `origin/claude/agorasim-availability-capacity-k0iild` was still
   stranded, and the calendar stub was written to wait for it. It merged as `89046bb`
   (#38) before this commit reached `main`, so the stub was rewritten rather than
   shipped stale. Two consequences: the gate is lifted, and the inventory's calendar
   section is now the one part of that document that does not describe the code —
   `availability-calendar.tsx` went from ~33 strings to ~180 in 786 lines, with driver
   and vehicle-pool vocabulary the glossary has never seen. `translate-calendar`
   therefore re-inventories before it translates, and writes the new terms back into
   §3 and §5.2 so `booking-live`'s remaining stubs and the guest booking form can
   reuse them.

The 2026-08-29 stubs `translate-admin-core` and `translate-admin-rest` are in `_done/`
with a `> Dropped:` note — no work was done against either slug; the recut splits them
five ways.

## Vocabulary

The inventory's §9 asked for nine ticks before translation started. Jamie's answer
(2026-08-31): **the proposals stand as decided**, so the translation stubs are `ready`,
not blocked. In particular:

- One name per concept: **pedido** (an enquiry, at any stage before payment),
  **reserva** (a paid, confirmed booking), **orçamento** (a quote). The repo already
  says all three in `contact-templates.ts`, `tour-request.ts` and `emails.ts` — the
  admin is the only surface that disagrees with itself.
- The feature-request backlog is **sugestão**, deliberately not a second *pedido*,
  which makes every agreeing status and priority label feminine.
- The `EN-` reference prefix stays as an opaque identifier — it is already on records
  and possibly in messages already sent.
- The typed delete token **does** become `APAGAR`, but as its own stub: it is a
  behaviour change to a safety control that crosses two other stubs' file scopes.

Register, per the inventory: European Portuguese, informal-warm, *você* implicit,
singular throughout.

## Build order

1. translate-shell-and-nav — nav, dashboard, shared label modules, `lang="pt"`, `pt-PT`
   formats, the system screens — depends-on: none
2. translate-sales — the board, the pedido detail, the 36 action messages — depends-on:
   translate-shell-and-nav
3. translate-calendar — re-inventory after PR #31, then translate — depends-on:
   translate-shell-and-nav
4. translate-experiences — the catalogue editor, `describePricing()` — depends-on:
   translate-shell-and-nav
5. translate-settings-and-auth — settings, users, audit, login, sugestões — depends-on:
   translate-shell-and-nav
6. delete-token-apagar — `DELETE` → `APAGAR`, a safety control on its own — depends-on:
   translate-sales, translate-experiences
7. hig-polish-pass — the residue after language — depends-on: delete-token-apagar

Stub 1 is the gate: it puts the vocabulary in `admin-nav.ts` and `admin-format.ts`
where every screen reads it. After that, **2, 3, 4 and 5 are independent of each
other** — the old build order was a strict chain of four, which was an artefact of how
it was cut, not a real dependency. They are ordered by what Rita touches daily: the
board and the calendar first, the catalogue and settings after.

## Out of scope (whole epic)

- Any admin i18n framework or locale toggle — D4 says hardcoded PT; EN can return as
  a future decision, not scaffolding.
- Public-site design — targeted fixes live in their own epics' stubs.
- Guest-facing strings — already bilingual via `Localized<T>`.
- **Code identifiers.** `AdminLeadPage`, `LeadEditForm`, `lead`, route segments and
  database enum values stay English. Only rendered strings change.
- **The five surfaces other epics own.** Each is being deleted or rewritten in
  Portuguese by the epic that owns it; translating them here is wasted work or a
  merge conflict:

  | Surface | Strings | Owner |
  |---|---|---|
  | `admin/referrals/page.tsx` | 12 | deleted by `content-truth/remove-referral-surface` (D2) |
  | `admin/notifications/page.tsx` | 7 | rewritten in PT by `lifecycle-messages/notifications-page-real` |
  | `admin/blog/page.tsx` | 10 | rewritten in PT by `blog-engine/blog-publish-path` |
  | `admin/social/page.tsx` | 10 | rewritten in PT by `social-engine/social-generator-path` |
  | `admin/email/page.tsx` | 8 | deleted by `triage/admin-email-marketing-orphan` — see below |
  | `lib/admin-preview.ts` | ~60 | fixtures for the four above, plus the example bookings D3 removes |

  Their **nav entries** are still this epic's (stub 1 translates `admin-nav.ts`), and
  their in-dev banner notes are swept by stub 7 if their owning epic has not landed by
  then — a Portuguese nav must not lead to an English paragraph.

- **The e-mail-marketing preview** had no epic and was not one of the six contracted
  features. Jamie ruled it **out** on 2026-08-31 and the surface is gone — page, nav
  entry and fixtures — the way D2 took referrals out. Nothing here to translate; the
  `admin-nav.ts` row it had is no longer in stub 1's scope, and §3.3 / §5.1 of the
  inventory carry it only as a snapshot of the pre-removal tree. Resolution recorded in
  `.icm/intake/triage/_done/admin-email-marketing-orphan.md`.
- **The pricing editor.** `describePricing()` becomes Portuguese in stub 3; building an
  actual editor is `.icm/intake/triage/admin-pricing-editor.md`.
