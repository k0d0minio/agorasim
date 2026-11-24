# Spec: agorasim · The admin console lists the payments and refunds to invoice

- ticket: JAM-528
- touches: web/src/app/admin/sales/faturar/, web/src/app/admin/sales/page.tsx, web/src/app/admin/sales/actions.ts, web/src/components/admin/, web/src/db/schema.ts, web/drizzle/, web/src/lib/
- complexity: standard

## Problem

Cada reserva paga e cada prestação de casamento ou evento (sinal, saldo) precisa de uma fatura
na data do pagamento, e cada reembolso de uma nota de crédito (CIVA art. 29.º n.º 1 b),
art. 36.º n.º 1 c)). No go-live o Diogo, a Rita ou o contabilista emitem-nas à mão. A consola
não tem uma lista do que faturar, e uma fatura pode faltar ou chegar tarde.

## Proposed change

A consola tem uma página nova "Para faturar" (`/admin/sales/faturar`), em português e pensada
para o telemóvel. A página de vendas tem uma ligação para ela.

1. **As linhas.** Uma linha para cada pagamento com sucesso (reserva de tour, sinal, saldo) e
   uma linha para cada reembolso. Cada linha mostra os campos da fatura: a data do pagamento
   ou do reembolso, o nome do hóspede, o NIF quando existe (JAM-527), o serviço (o tour ou o
   orçamento, e o tipo: reserva, sinal, saldo, reembolso) e o valor.
2. **O dia.** A página mostra um dia de cada vez, hoje por defeito, com um seletor de data.
3. **A marca.** Cada linha tem a ação "Fatura emitida" com o número do documento (uma fatura,
   uma fatura-recibo ou uma nota de crédito). A marca fica guardada numa tabela nova, com quem
   a fez e quando, e uma linha marcada mostra o número. A marca pode ser desfeita. Cada marca
   escreve no `audit_log`.
4. **Os atrasos.** Acima do dia escolhido, uma secção "Em atraso" lista cada linha de um dia
   passado sem marca, a mais antiga primeiro.
5. **Os reembolsos (Q1).** Hoje cada reserva e cada prestação guarda só o total reembolsado e
   a data do último reembolso. Um segundo reembolso parcial apaga a data do primeiro. Esta
   spec acrescenta uma tabela de reembolsos: cada caminho de reembolso escreve uma linha (o
   valor, a data, o id do Stripe). Os reembolsos antigos aparecem uma vez, com o total e a
   data guardados hoje.
6. **A migração.** A migração deste run tem o número a seguir à migração do JAM-527. Só cria
   tabelas novas.

A decisão da fatura (JAM-473, `.icm/docs/go-live-legal.md`): "por mão" no go-live. Esta
página é a lista de trabalho de quem fatura à mão.

## Acceptance criteria

- [ ] A página lista cada pagamento e cada reembolso do dia escolhido, com a data, o nome, o NIF, o serviço e o valor. (verify: agent)
- [ ] Uma linha marcada "Fatura emitida" com um número de documento mantém a marca e o número depois de recarregar a página. (verify: agent)
- [ ] Um pagamento de um dia passado sem marca aparece no topo, em "Em atraso". (verify: agent)
- [ ] A consulta das linhas inclui reservas, sinais, saldos e reembolsos, e exclui reservas não pagas. (verify: CI)
- [ ] Dois reembolsos parciais do mesmo pagamento dão duas linhas. (verify: CI)
- [ ] Diogo ou Rita abre a página no telemóvel e marca uma linha. (verify: operator)

## Out of scope

- A emissão de faturas ou notas de crédito pela plataforma (um pedido novo, fora do acordo).
- Uma exportação CSV para o contabilista.
- Pagamentos fora do Stripe (dinheiro, transferência).
- Lembretes por email das linhas em atraso.

## Open questions

- O JAM-527 pode mudar a coluna do NIF no build. Este run usa a coluna que o JAM-527 juntar.
