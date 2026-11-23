# Handoff jam-471

## Next action

O Jamie testa as duas páginas no pull request #274 e marca **Ready to merge**. Depois diz
`release JAM-471`.

Decisão do Jamie no chat, 2026-11-23, Q1: "Yes, after go-live". O blog, as redes sociais e o
SMS vêm depois do M1 e do M2. A resposta está no corpo do pull request e em `questions.md`.

As duas páginas já estão escritas e enviadas no ramo:

- `.icm/docs/go-live-plan.md` (nova): o caminho em dois marcos. M1, o site novo em
  `agorasim.pt` com o formulário de pedido, a 2026-12-03. M2, as reservas pagas, a 2026-12-09.
  26 bloqueios, cada um com um dono e uma data. 10 perguntas para o cliente.
- `.icm/docs/launch-runbook.md` (editada): o estado de 2026-11-23. Os servidores de nomes já
  estão na Vercel DNS, por isso a passagem é dois registos (Track G). A transferência da Amen
  passa para depois (Track T). Sai cada referência a `.icm/intake/go-live/`. Novo Track P (a
  promoção). §4b segue o JAM-473 (sem RNAAT, sem reservas pagas).

## How to test

Abra `.icm/docs/go-live-plan.md` no pull request #274. Cada bloqueio do §3 tem um dono e uma
data. Abra `.icm/docs/launch-runbook.md` e procure `intake/go-live`: não há nenhum resultado.

## Blockers

- nenhum

## Do not touch

- `.icm/_system/`.
- As definições da Vercel, da DNS, da Stripe e da Neon: esta sessão só leu.
