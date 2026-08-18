# AGORA-007 · Remaining legal blanks: RNAAT, insurance, invoicing/retention

| | |
|---|---|
| Status | blocked |
| Type | task |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-002 (landed the answered facts) |
| Blocked by | Diogo & Rita — three Section 1.1 answers still blank in the info PDF |
| Sources | .icm/docs/agorasim-info.pdf (local only, gitignored) · [.icm/docs/data-protection.md](../docs/data-protection.md) |

## Problem

AGORA-002 landed everything Diogo & Rita answered, but three Section 1.1 items came
back blank, so `web/src/content/privacy.ts` still carries its draft banner and three
`TODO(legal)` markers:

1. **RNAAT registration number** (animação turística licence) — should be referenced
   on the site; legally expected of a tour operator.
2. **Liability insurance provider + policy number** — guests ask; we may reference it.
3. **Do they invoice customers themselves?** — decides the legal retention period for
   booking data (the tax back-stop in the privacy policy) and the 24-month enquiry
   retention proposal that is still marked "PROPOSTA, A CONFIRMAR".

## Acceptance

- [ ] Three answers obtained (WhatsApp/email is fine; they must be written and exact).
- [ ] `privacy.ts`: remaining `TODO(legal)` markers resolved; retention wording final.
- [ ] Draft banner removed from the privacy policy.
- [ ] RNAAT number displayed where the law expects it (site footer or privacy page).
- [ ] CI green.

## Prompt

Finish the agorasim privacy policy with the three legal facts Diogo & Rita still owe
(RNAAT number, insurance details, whether they self-invoice). Read
.icm/intake/AGORA-007-remaining-legal-blanks.md for context — do not start until the
answers exist in writing; never invent legal facts. Fill the remaining TODO(legal)
markers in web/src/content/privacy.ts, finalize the retention wording, remove the
draft banner, and surface the RNAAT number. Open a PR on a claude/ branch; no local
checks — CI is the source of truth.
