> Dropped: superseded by the 2026-08-31 recut, which splits this stub in two and
> carves out the surfaces other epics delete or rewrite. Its catalogue half became
> `translate-experiences`, its settings/auth half became `translate-settings-and-auth`,
> and the preview studios it scoped in (blog, social, notifications, referrals, e-mail
> marketing) left the epic — see the breakdown's out-of-scope list for who owns each.
> The `DELETE` → `APAGAR` token it carried became `delete-token-apagar`. No work was
> done against this slug.

# Stub: Traduzir o resto — experiências, definições, utilizadores, auditoria

- feature-slug: translate-admin-rest
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: translate-admin-core
- sequence: 3 of 4
- sources: D4; inventory doc from stub 1

## Problem

The remaining admin surfaces — experiences CRUD, settings (account/users/audit),
login, feature requests, error/empty states, and the still-preview studios' chrome —
stay English after the core pass.

## Proposed change

Complete the hardcoded PT pass over everything under `app/admin/**` and
`components/admin/**` not covered by stub 2, including `describePricing()` (documented
"English only" — now PT), form validation messages, empty states, and the in-dev
banners' text on the preview pages. Team-facing notification emails (the internal
copies) stay PT as they already are guest-team split.

## Acceptance criteria (rough)

- [ ] `grep` finds no user-facing English under app/admin or components/admin
- [ ] Preview pages' banners honest and PT
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), finish the admin Portuguese pass per
`.icm/intake/admin-portugues/translate-admin-rest.md` and the inventory in
`.icm/docs/admin-pt-inventory.md`: every surface not covered by translate-admin-core —
experiences CRUD + `describePricing()` in `web/src/lib/pricing.ts`, settings, users,
audit, login, feature requests, loading/error/empty states, preview-page banners.
Hardcoded PT; update tests. PR on a `claude/` branch; no local checks — CI is the
source of truth.
