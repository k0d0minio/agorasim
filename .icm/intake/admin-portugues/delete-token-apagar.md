# Stub: Escrever APAGAR — a confirmação deixa de ser em inglês

- feature-slug: delete-token-apagar
- epic: admin-portugues
- priority: P2
- size: S
- depends-on: translate-sales, translate-experiences
- sequence: 6 of 7
- sources: `.icm/docs/admin-pt-inventory.md` §9.6 (proposal, and the reason it is not a drive-by); Jamie's tick 2026-08-31 (own stub, change to `APAGAR`); `web/src/lib/admin-format.ts:27`, `web/src/lib/form-schemas.ts:345,483`, `delete-submission-dialog.tsx:103,118`, `experience-row-actions.tsx:206,221`

## Problem

`DELETE_CONFIRMATION = "DELETE"` is the word an operator must type to erase a guest
record or a catalogue entry. In a Portuguese console, asking Rita to type an English
word under pressure is exactly the friction this epic exists to remove.

It is deliberately not folded into either translation stub. It is a behaviour change
to a safety control, not a string swap: the token is validated server-side in the
`server-only` `form-schemas.ts`, and it renders in two dialogs that belong to two
different stubs' file scopes. Bundled into either, a safety change lands inside a
large copy diff where nobody reads it.

## Proposed change

`DELETE_CONFIRMATION = "APAGAR"`, and follow it everywhere:

- `lib/admin-format.ts:27` — the constant.
- `lib/form-schemas.ts:345,483` — both `z.literal(DELETE_CONFIRMATION, …)` calls carry
  a hardcoded English message ("Type DELETE to confirm.") that does not interpolate
  the constant. Translate the message and make it read from the constant so the two
  can never drift again.
- `components/admin/delete-submission-dialog.tsx` and `experience-row-actions.tsx`
  already interpolate `{DELETE_CONFIRMATION}`, so they follow for free — verify the
  surrounding prose reads correctly with the new word.
- `app/admin/actions.test.ts` and any experience-action test that posts the literal
  `"DELETE"`.

No migration and no stored data: the token is compared at request time, never
persisted. An operator mid-form when this deploys sees a rejected confirmation and
retypes — acceptable, and the reason this is P2 rather than a launch gate.

## Acceptance criteria (rough)

- [ ] Typing `APAGAR` deletes; typing `DELETE` does not
- [ ] The validation message is Portuguese and interpolates the constant rather than
      repeating it
- [ ] `grep -rn '"DELETE"' web/src` returns nothing outside HTTP-method contexts
- [ ] Tests posting the old literal updated; CI green

## Prompt

In the agorasim repo (`web/`), change the admin's typed delete confirmation from
`DELETE` to `APAGAR` per `.icm/intake/admin-portugues/delete-token-apagar.md`. This is
a safety control — read the stub before touching anything. Change
`DELETE_CONFIRMATION` in `web/src/lib/admin-format.ts`, then follow it through the two
`z.literal(DELETE_CONFIRMATION, "Type DELETE to confirm.")` calls in the `server-only`
`web/src/lib/form-schemas.ts` (translate the message **and** make it interpolate the
constant instead of repeating the word), verify the prose in
`components/admin/delete-submission-dialog.tsx` and `experience-row-actions.tsx` reads
correctly, and update every test that posts the literal `"DELETE"` — start with
`web/src/app/admin/actions.test.ts`. Requires `translate-sales` and
`translate-experiences` merged, so the dialogs are already Portuguese around it. PR on
a `claude/` branch; no local checks — CI is the source of truth.
