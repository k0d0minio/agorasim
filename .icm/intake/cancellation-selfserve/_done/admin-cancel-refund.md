# Stub: Cancel & refund from the Sales board

- feature-slug: admin-cancel-refund
- epic: cancellation-selfserve
- priority: P1
- size: S
- depends-on: cancellation-token-schema
- sequence: 3 of 4
- sources: 2026-08-29 data lens (no admin cancel/refund action exists); guests will still phone/WhatsApp — Rita needs the same power the link has

## Problem

Even with self-serve, guests will message Rita directly. The admin has no
cancel/refund action: her only option would be the Stripe dashboard, which (before
refund-machinery) strands seats and (always) skips the guest email.

## Proposed change

A "Cancelar e reembolsar" action on the admin booking detail: typed-confirmation
dialog (existing pattern), full or partial refund amount, records `cancelledVia:
admin` + audit-log entry, sends the guest the cancellation email. Works regardless of
the 48h window — Rita's judgment overrides (bad weather, goodwill).

## Acceptance criteria (rough)

- [ ] Admin cancel refunds via Stripe, frees seats, emails the guest, audits the action
- [ ] Partial refund possible with an explicit amount
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add an admin cancel-and-refund action per
`.icm/intake/cancellation-selfserve/admin-cancel-refund.md`: server action guarded by
`requireAdmin()` first-statement (see `web/src/app/admin/actions.ts` conventions +
`admin/authorization.test.ts`), typed-confirmation dialog following
`web/src/components/admin/delete-submission-dialog.tsx`, Stripe refund with
proportional fee return (refund-machinery substrate), seat release, guest email, and
an `audit_log` entry. Surface on `web/src/app/admin/sales/[id]/page.tsx`. PR on a
`claude/` branch; no local checks — CI is the source of truth.
