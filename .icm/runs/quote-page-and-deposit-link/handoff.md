# Handoff: quote-page-and-deposit-link

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie smokes the preview — https://agorasim-git-claude-sleepy-turing-k3vdjt-kodominio.vercel.app —
   with a quote sent from the admin's Orçamento card on a wedding lead: open the emailed
   `/pt/orcamento/<token>` link, read the terms, pay the deposit with a Stripe test card, check the
   receipt (couple + team), the Sales board (lead → Reservado), and the page's receipt state; an
   old link (after "Nova versão" or "Reenviar") shows the neutral panel; the phone booking bar on
   `/pt/casamentos` scrolls to the form.
2. Tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/122.
3. `release quote-page-and-deposit-link`.

## Blockers

- none. One criterion is knowingly unmet: the dead-link page is a `noindex` 200, not a 404 (RD-9).

## Do not

- Do not tick either gate box.
- Do not add a quote link to the receipts (RD-8) or an events "we cancel" rule (`[LAWYER]`).
- Do not touch refunds of quote instalments or the T−14 job (stubs 4 and 6).
