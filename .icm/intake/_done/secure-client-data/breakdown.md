# Breakdown: Secure the client's data

- epic-slug: secure-client-data
- sources: 2026-08-29 /project run (tech + data lenses); `.gitignore:3-5`'s own warning; purged AGORA-020 (cut 2026-08-27, wiped undone in the D14 clean slate); estate rule "no secrets in git, ever"

## What I understood

The repo was **public** until 2026-08-29 while tracking `.icm/docs/agorasim-info.pdf` —
which contains the client's controlpanel.pro (amen.pt) DNS/email panel password in
plaintext, plus their IBAN and personal data — alongside the signed commercial
documents. The visibility flip to private happened during the /project run (D15), but
the credential PDF is still tracked, and the password must be treated as exposed:
whoever cloned or crawled the public repo could take the client's domain and Google
Workspace mail. Rotation is not optional.

## Build order

1. rotate-registrar-credential — change the controlpanel.pro password with the client — depends-on: none
2. untrack-credential-pdfs — redact/untrack the info PDF; decide the history purge — depends-on: rotate-registrar-credential
   *(Dropped 2026-08-31 on Jamie's call — the PDF stays tracked for now and the
   history purge is declined for now. The stub is in `_done/` with the reason; the
   underlying exposure is unchanged and step 1 still carries it.)*

*(The third action of this intent — flipping the repo private — was executed during the
2026-08-29 run itself, D15; no stub needed.)*

## Out of scope (whole epic)

- Moving the other client PDFs (proposal, prices, agreement) — commercially sensitive
  but credential-free; the repo being private now covers them per "deals are tracked;
  secrets are not".
