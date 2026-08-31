# Stub: A moldura — navegação, início, formatos e os ecrãs de sistema

- feature-slug: translate-shell-and-nav
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: none
- sequence: 1 of 7
- sources: D4; `.icm/docs/admin-pt-inventory.md` §3.3 (nav), §3.2/§3.4 (label records), §4.3 (dashboard ICM-speak), §4.4 ("Blog studio"/"Social studio"), §5.1 `page.tsx`/`layout.tsx`/boundaries, §5.3 (`admin-nav.ts`, `admin-format.ts`, `content/system.ts`), §7 (the two tests that break)

## Problem

Every admin screen renders inside the same chrome and reads its words from the same
two modules: `lib/admin-nav.ts` (~45 strings) and `lib/admin-format.ts` (~60 — the
status, priority, role and audit vocabularies, plus `en-GB` date formatters). Until
those are Portuguese, every per-screen stub either duplicates the vocabulary decision
or lands half-translated screens. This stub puts the frame and the shared words in
place so stubs 2–5 only touch their own surfaces.

It also carries the two changes that are true of the whole console rather than any one
screen: `lang="en"` → `lang="pt"` on `admin/layout.tsx:59`, and the `en-GB` → `pt-PT`
formatters at `admin-format.ts:194,200`.

## Proposed change

Hardcoded Portuguese, taking every word from the inventory rather than translating
afresh:

- `lib/admin-nav.ts` — group titles, labels, shortLabels, cardTitles, descriptions and
  the `adminPageTitle` fallback (§3.3). "Blog studio"/"Social studio" lose *studio*
  (§4.4). The `Referrals` entry is left alone — `content-truth/remove-referral-surface`
  deletes it (D2); do not spend words on it.
- `lib/admin-format.ts` — `requestStatusMeta` (§3.2), `adminRoleMeta` (§3.4), the other
  lifecycle vocabularies (§3.5), the 26 `auditActionLabels`, the relative-time suffixes,
  and the two `Intl.DateTimeFormat` locales → `pt-PT`.
- `app/admin/page.tsx` — the dashboard, including the ICM-speak hints at `:81–87`
  rewritten per §4.3 rather than translated.
- `app/admin/layout.tsx` — `lang="pt"` and the document metadata.
- `content/system.ts` `adminSystemContent` — the 7 error/404 strings, using §5.3's
  table (reuse the guest side's exact "Página não encontrada" / "Voltar ao início").
  Its doc comment says the strings "are translated by its `translate-admin-rest` stub"
  — a slug the 2026-08-31 recut retired. Once the strings are Portuguese the sentence
  is false anyway: delete it and leave the pointer to `.icm/docs/admin-pt-inventory.md`,
  which stays true.
- The boundary screens (`error.tsx`, `loading.tsx`, `not-found.tsx`) and the chrome
  components: `admin-shell.tsx`, `pagination.tsx`, `record-meta.tsx`, `contact-links.tsx`,
  `in-dev-banner.tsx`, `in-dev-marker.tsx`, `form-action-bar.tsx`.

`admin-shell.tsx:60` renders the raw role enum instead of `adminRoleMeta[role].label`
— fix it here, since translating the record without it leaves the shell in English
(inventory §9, third defect).

## Acceptance criteria (rough)

- [ ] Nav, dashboard, shell, boundaries and both shared label modules fully PT
- [ ] `lang="pt"`; dates and times render `pt-PT` everywhere they were `en-GB`
- [ ] `admin-shell.tsx` shows the role's label, not the enum
- [ ] `lib/admin-nav.test.ts:35` and `lib/admin-format.test.ts:51,52,66` updated (§7);
      `actions.test.ts:448,470` untouched — those are database enum values, not labels
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin chrome to Portuguese per
`.icm/intake/admin-portugues/translate-shell-and-nav.md`, taking every word from
`.icm/docs/admin-pt-inventory.md` (§3.2–§3.5, §4.3, §4.4, §5.1, §5.3) rather than
translating afresh — the point of that document is one name per concept. Scope:
`web/src/lib/admin-nav.ts`, `web/src/lib/admin-format.ts` (labels **and** the two
`Intl.DateTimeFormat("en-GB")` locales), `web/src/app/admin/page.tsx`,
`web/src/app/admin/layout.tsx` (`lang="pt"`), the `error`/`loading`/`not-found`
boundaries, `adminSystemContent` in `web/src/content/system.ts`, and the shared
components `admin-shell`, `pagination`, `record-meta`, `contact-links`,
`in-dev-banner`, `in-dev-marker`, `form-action-bar`. Leave the `Referrals` nav entry
untranslated — it is being deleted. Hardcoded PT, no i18n rig (D4 in `.icm/project.md`).
Update `lib/admin-nav.test.ts` and `lib/admin-format.test.ts` where they assert on the
English. PR on a `claude/` branch; no local checks — CI is the source of truth.
