# Handoff: thankyou-review-email

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. The operator adds `EMAIL_OPT_OUT_SECRET` in Vercel (Preview, development/uat and
   Production — `openssl rand -base64 32`, generated once, never rotated), then redeploys
   the preview so it picks the value up.
2. The operator smokes the preview
   (https://agorasim-git-claude-sweet-bohr-jdugh1-kodominio.vercel.app): the Sales detail's
   "Marcar falta" / "Faltou" / "Retirar falta" on a past confirmed booking; an opt-out link
   (`/pt/reserva/deixar-de-receber/<token>`) — GET shows the page, the button shows
   "Feito", a mangled token shows "Este link não é válido"; `/pt/privacidade` and
   `/en/privacy` read the thank-you paragraphs.
3. Once **Ready to merge** is ticked on PR #141: `/pipeline release thankyou-review-email`.

## Blockers

- blocked on operator: tick **Ready to merge** in the body of
  https://github.com/k0d0minio/agorasim/pull/141 after the smoke
- blocked on operator: `EMAIL_OPT_OUT_SECRET` set in Vercel — Release stop class 3 re-asks
  `env.sh audit --changed`, which reports it as a GAP until it exists

## Do not

- Do not tick either gate box.
- Do not rotate `EMAIL_OPT_OUT_SECRET` or derive it from `BOOKING_TOKEN_SECRET`.
- Do not edit `.icm/scripts/env.sh` here — its fault is parked as
  `triage/template-change-env-audit-empty-targets.md` for icm-board.
- Do not subscribe PR #141 to PR activity (`_shared/github.md`).
