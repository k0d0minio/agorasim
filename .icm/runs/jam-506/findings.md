# Findings jam-506

O operador regista estes pontos mais tarde. Uma entrada por ponto.

## A contagem por mês não tem as vendas por orçamento

- where: `web/src/lib/sales.ts` `listSourceCounts`, as tabelas `quotes` e `quote_payments`
- what: uma venda por orçamento (casamento, evento, passeio à medida) não cria uma linha em
  `bookings`. A secção "Origem das reservas" conta só as linhas de `bookings`: as reservas online
  e as reservas feitas na consola. O cartão de um pedido de orçamento mostra a sua origem, mas a
  venda não entra na contagem. A comissão de eventos (6 %) vem dessas vendas.
- proposed: new ticket

## Uma reserva feita na consola a partir de um pedido do site perde a origem

- where: `web/src/app/admin/calendar/actions.ts` (a reserva manual), `web/src/lib/quote-builder.ts`
- what: a spec deixa fora a origem de uma reserva feita na consola. Mas quando Rita transforma
  um pedido do site numa reserva, o pedido tem a origem e a reserva fica "Sem registo". A
  contagem mostra essa venda como "Sem registo". Copiar a origem do pedido para a reserva
  corrige isto.
- proposed: tweak

## A página `geo-baseline.md` diz que a medida M4 não está construída

- where: `.icm/docs/geo-baseline.md`, secção 5, linha M4
- what: depois do merge de JAM-506 a linha "Not built. A follow-up ticket can record…" já não é
  verdade. A medida M4 é a secção "Origem das reservas" da página Sales.
- proposed: knowledge

## A pergunta jurídica sobre o `sessionStorage` não está em `data-protection.md`

- where: `.icm/docs/data-protection.md`, `web/src/content/privacy.ts` `legalOpenItems`
- what: `data-protection.md` é a casa das perguntas abertas da política. A pergunta nova está
  só em `legalOpenItems`: o artigo 5.º da Lei n.º 41/2004 pede consentimento para guardar o
  `utm_source` e o host do referrer no `sessionStorage` do separador? O Jamie decidiu usar o
  `sessionStorage` em 2026-11-23. Quem rever a política tem de ver esta pergunta.
- proposed: knowledge

## O ramo do run não é o ramo do Linear

- where: `.icm/runs/jam-506/run.md`
- what: a sessão começou sem o conector Linear e criou o ramo
  `claude/jam-506-booking-source-e151c6`. O ramo do Linear é
  `contact/jam-506-agorasim-each-booking-and-enquiry-records`. O blueprint rc15 lê o ticket com
  `baxter_tool run linear get_issue` (JAM-275). Este repo está em rc14.
- proposed: chore

## O agente `review-shots` não consegue fazer imagens neste repo

- where: `.icm/_system/agents/review-shots/CONTEXT.md`, `.icm/environments.md`, a proteção de deployments da Vercel
- what: para o pull request #277 o agente fez 0 imagens. O preview responde com a página de
  login da Vercel. O "antes" é o endereço de produção (`https://prod.agorasim.pt`), que responde
  `404 DEPLOYMENT_NOT_FOUND` porque ainda não houve uma promoção. O contrato não deixa abrir o
  UAT. Ficaram 8 imagens de páginas de login e de erro em
  `~/baxter_live/workspace/scratch/shots/`: um hook recusou o `rm` do agente.
- proposed: chore
