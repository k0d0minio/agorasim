# AGORA-020 · Untrack the client-credential PDFs and settle the history question

| | |
|---|---|
| Status | ready |
| Type | security |
| Priority | P0 |
| Size | S |
| Sources | 2026-08-27 estate ticket audit · `.gitignore` lines 3–5 · workspaces/deals/diogo-rita/DEAL.md (icm-board) |

## Problem

`.gitignore` says it plainly — *"agorasim-info.pdf holds credentials/IBAN, never
commit"* — yet both `.icm/docs/agorasim-info.pdf` and `.icm/docs/prices.pdf` are
**tracked and pushed** to `github.com/k0d0minio/agorasim`: gitignore cannot untrack
files that were committed before (or despite) the rule. The committed history of
`launch-runbook.md` also carries Diogo's NIF from the 18 Aug Stripe notes.

Scope mirrors `ICM-008` in `icm-board` (the barzinho precedent), deliberately
split: **untrack + verify** are unambiguous and go now; a **history scrub** and any
**credential rotation** are Jamie's decisions — surface the facts, never act on
them unprompted.

## Acceptance

- [ ] Both PDFs untracked (`git rm --cached`), still present on disk, status clean —
      the gitignore rule now actually bites
- [ ] Tree swept for any other committed credential-bearing file; findings reported,
      nothing else changed
- [ ] Reported to Jamie: what the two PDFs and the runbook history expose, that the
      remote is `k0d0minio/agorasim`, and the scrub/rotation options — his call
- [ ] `_system/AUDIT.md` in `icm-board` carries the finding (or its Done line, once
      acted on)

## Prompt

Untrack agorasim's client-credential PDFs. Read
.icm/intake/AGORA-020-untrack-credential-pdfs.md for full context. In this repo:
git rm --cached .icm/docs/agorasim-info.pdf .icm/docs/prices.pdf (the files stay on
disk — other tickets cite them as local sources), confirm .gitignore covers both,
and sweep for any other committed credential-bearing file. Never print or paste the
contents of either PDF. Then report to Jamie: what the git history still holds
(including the NIF in launch-runbook.md's 18 Aug revision), that the remote is
github.com/k0d0minio/agorasim, and the scrub/rotation options — do not rewrite
history or rotate anything yourself. The untrack is a small reviewable commit;
ticket-and-doc commits go straight to main.
