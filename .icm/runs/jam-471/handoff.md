# Handoff jam-471

## Next action

O Jamie responde à Q1 no cartão do HUD ou no corpo do pull request #274. Depois diz
`knowledge JAM-471`. A sessão corre `questions.sh JAM-471`, regista a resposta aqui, ajusta o
§1 e o §4 de `.icm/docs/go-live-plan.md` se a resposta for "no, all six first", muda o pull
request para ready, lê o CI e põe `phase: release`.

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

- Q1 espera pela resposta do Jamie (pull request #274).

## Do not touch

- `.icm/_system/`.
- As definições da Vercel, da DNS, da Stripe e da Neon: esta sessão só leu.
