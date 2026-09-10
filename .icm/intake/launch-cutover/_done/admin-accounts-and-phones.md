# Stub: Diogo & Rita on their phones — accounts, install, Portuguese manifest

- feature-slug: admin-accounts-and-phones
- epic: launch-cutover
- priority: P0
- size: S
- depends-on: none
- sequence: 10 of 14
- sources: `web/public/admin-manifest.webmanifest` (`"lang": "en"`, `"name": "Agorasim Operations"`, English shortcuts, `"orientation": "portrait"`); `web/src/components/admin/invite-user-form.tsx` (temporary-password invite, no email); D4 (admin is Portuguese, Rita's phone is the reference device); `admin-answers/admin-offline-and-manifest` (the manifest half of that stub is lifted here because launch needs it; the offline half stays there)

## Problem

"Truly manage it from their phones" on Saturday means: an account each, the admin
installed as an app on the home screen, and a first-week routine they understand. The
installed app today announces itself in English ("Agorasim Operations", English
shortcuts) on a console that is Portuguese-only, and locks portrait for no remaining
reason. Nothing in the repo tells them how to install it or what to check each morning.

## Proposed change

Manifest: `lang: pt-PT`, name "Agorasim — Gestão", short name "Agorasim", shortcuts
"Vendas" / "Calendário" / "Catálogo", drop `orientation`. A one-page
`web/docs/guia-telemovel.md` in Portuguese: install steps (iOS Safari → Partilhar →
Adicionar ao ecrã principal; Android Chrome → Instalar aplicação), first sign-in and
password change, the morning routine (Vendas → hoje; Calendário → fechar dias), how
to cancel-and-refund, where the audit log is. Account creation itself is Jamie's
(runbook Track E) — the guide is what he walks them through on the call.

## Acceptance criteria (rough)

- [ ] Manifest is Portuguese, unlocked orientation, shortcuts to Vendas/Calendário/Catálogo
- [ ] `web/docs/guia-telemovel.md` exists, Portuguese, covers install + routine + refund
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/launch-cutover/admin-accounts-and-phones.md`.
Localise `web/public/admin-manifest.webmanifest` to Portuguese (lang, name, short_name,
description, shortcut names — add a Calendário shortcut to `/admin/calendar`), remove the
orientation lock, and write `web/docs/guia-telemovel.md` for Diogo & Rita per the stub.
Keep `admin-answers/admin-offline-and-manifest` open but note in it that the manifest
half landed here. PR on a `claude/` branch; no local checks — CI is the source of truth.
