# Stub: Definições, contas e entrada — o resto do painel

- feature-slug: translate-settings-and-auth
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: translate-shell-and-nav
- sequence: 5 of 7
- sources: D4; `.icm/docs/admin-pt-inventory.md` §2 (feature requests → *sugestão*, and the gender agreement it forces), §3.5, §5.1 (`settings/*`, `login`, `forbidden`, `feature-requests`), §5.2 (the eight account/auth components), §5.3 (`lib/password-policy.ts:16`), §9 defect 3

## Problem

After the board and the catalogue, what is left in English is everything an operator
touches occasionally: their own account, the team's accounts, the audit log, the
sign-in screen, the forbidden screen, and the feature-request backlog. A console that
is Portuguese on the daily screens and English in settings is worse than either
extreme — this stub closes it.

The backlog screen carries a vocabulary trap the inventory flagged: `feature_requests`
and `tour_requests` are both "requests" in English. Mapping both to *pedido* would
re-create one level down the exact collision `translate-sales` fixes.

## Proposed change

Hardcoded Portuguese, from the inventory:

- `app/admin/settings/account/page.tsx`, `settings/users/page.tsx`,
  `settings/audit/page.tsx`
- `app/admin/login/page.tsx`, `app/admin/forbidden/page.tsx`
- `app/admin/feature-requests/page.tsx` — the backlog becomes **Sugestões** (§2), not
  a second *pedido*. Its status and priority labels change gender to agree with the
  feminine noun: `Nova`, `Planeada`, `Em curso`, `Concluída`, `Recusada`; `Baixa`,
  `Média`, `Alta`, `Urgente` (§3.5). The label records live in `admin-format.ts` and
  are translated by stub 1 — this stub verifies the agreement reads right on screen.
- `components/admin/` — `login-form.tsx`, `change-password-form.tsx`,
  `invite-user-form.tsx`, `sign-out-everywhere-button.tsx`, `subject-export-form.tsx`,
  `user-row-actions.tsx`, `feature-request-form.tsx`,
  `feature-request-status-select.tsx`
- `lib/password-policy.ts:16` — the one validation string that lives outside both
  directories.

`forbidden/page.tsx:34` renders the raw role enum (`owner`, `collaborator`) rather
than `adminRoleMeta[role].label` — a one-line fix, made here, or the translated role
record leaves this screen in English (inventory §9, third defect; the matching fix in
`admin-shell.tsx` belongs to stub 1).

`inviteUser` has no mail transport, so its message stays "{name} pode agora entrar"
rather than claiming an invitation was sent (§6).

## Acceptance criteria (rough)

- [ ] Settings, users, audit, login, forbidden and feature requests fully PT
- [ ] The backlog says *sugestão*, never *pedido*; every agreeing label is feminine
- [ ] `forbidden/page.tsx` shows the role's label, not the enum
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin settings and auth surfaces to
Portuguese per `.icm/intake/admin-portugues/translate-settings-and-auth.md`, taking
the renderings from `.icm/docs/admin-pt-inventory.md` §5.1, §5.2 and §5.3. Scope:
`web/src/app/admin/settings/{account,users,audit}/page.tsx`,
`web/src/app/admin/login/page.tsx`, `web/src/app/admin/forbidden/page.tsx`,
`web/src/app/admin/feature-requests/page.tsx`, the account/auth components
(`login-form`, `change-password-form`, `invite-user-form`, `sign-out-everywhere-button`,
`subject-export-form`, `user-row-actions`, `feature-request-form`,
`feature-request-status-select`), and `web/src/lib/password-policy.ts`. Read §2 of the
inventory first: the feature-request backlog is **sugestão**, deliberately not
*pedido*, and the feminine noun changes the gender of every status and priority label
that agrees with it. Fix the raw role enum rendered at `forbidden/page.tsx:34` while
you are in the file. Requires `translate-shell-and-nav` merged. Hardcoded PT, no i18n
rig (D4). PR on a `claude/` branch; no local checks — CI is the source of truth.
