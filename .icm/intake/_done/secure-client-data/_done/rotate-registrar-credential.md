# Stub: Rotate the exposed controlpanel.pro password with the client

- feature-slug: rotate-registrar-credential
- epic: secure-client-data
- priority: P0
- size: S
- depends-on: none
- sequence: 1 of 2
- sources: `.icm/docs/agorasim-info.pdf` §1.3 (login + password in plaintext); repo was public until 2026-08-29 (D15); deleted launch runbook (`d4d3fc4:.icm/docs/launch-runbook.md`) already said "shared in plaintext — rotate after transfer"

## Problem

The client's domain/DNS/email control-panel password for agorasim.pt sat in a
**publicly visible** GitHub repo inside `agorasim-info.pdf`. That credential controls
their domain and their Google Workspace mail. The repo is private now, but exposure
must be assumed.

## Proposed change

Jamie messages Diogo (WhatsApp) to change the controlpanel.pro password immediately —
or does it together with him on a call. Confirm the new password is **not** written
into any repo or chat log; if Jamie needs ongoing DNS access, use the panel's delegate
mechanism or keep the credential in a password manager only. Note the rotation date in
the deal folder log.

## Acceptance criteria (rough)

- [ ] Old password no longer works on controlpanel.pro
- [ ] New credential stored nowhere in git, in either repo
- [ ] DEAL.md log line added (icm-board)

## Prompt

This is a human coordination ticket — most of it is Jamie messaging the client. A
session picking it up should: draft the short WhatsApp message (PT) asking Diogo to
change the controlpanel.pro password (context: it was shared in a document that was
briefly in a public code repository; the repo is private now, changing it is
precautionary), present it to Jamie to send, and add a log line to
`workspaces/deals/diogo-rita/DEAL.md` in the icm-board repo once Jamie confirms
rotation. Read `.icm/intake/_done/secure-client-data/_done/rotate-registrar-credential.md` for
context. Never write the old or new password anywhere. No outbound action leaves the
session — Jamie sends.
