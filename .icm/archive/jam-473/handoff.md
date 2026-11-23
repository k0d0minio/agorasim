# Handoff jam-473

## Next action

O Jamie lê `.icm/docs/go-live-legal.md`. Envia ao Diogo as perguntas de
`findings.md` §3 num só envio. Regista no Linear o comentário de §1 e os tickets de §2.

## How to test

Abra `.icm/docs/go-live-legal.md` no pull request. Cada item tem um estado, um dono e uma
data. A decisão sobre as faturas está na secção "The fatura decision".

## What changed

- Página nova: `.icm/docs/go-live-legal.md` (add). Os itens legais de I §1.1 com estado,
  dono e data, e a decisão sobre as faturas (à mão até o contabilista responder; a
  integração é um pedido novo, tamanho M).

## Blockers

- O check Vercel está vermelho. Causa: o projeto Neon `uat-agorasim` tem 10 branches (o
  limite do plano) em 2026-11-23 às 12:02. A integração não cria `preview/claude/jam-473-…`,
  e o deploy falha antes do build (0 ms). O mesmo acontece no PR #272 (JAM-475). A página não
  muda o código. Ação do operador: apagar um branch que já não serve (por exemplo
  `local-test/2026-11-19`) ou esperar pelo fecho de outro PR, e depois fazer "Redeploy" no
  Vercel.
- O lançamento com reservas pagas espera pelo número RNAAT e
  pelas apólices (Diogo).

## Do not touch

- none
