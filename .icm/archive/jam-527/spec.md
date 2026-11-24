# Spec: agorasim · The guest can give a NIF for the fatura at booking and on a quote

- ticket: JAM-527
- touches: web/src/components/booking-checkout-form.tsx, web/src/components/tour-request-form.tsx, web/src/components/quote-pay-form.tsx, web/src/lib/booking-checkout.ts, web/src/app/[locale]/reservar/actions.ts, web/src/app/[locale]/orcamento/[token]/, web/src/db/schema.ts, web/drizzle/, web/src/lib/subject-data.ts, web/src/content/privacy.ts, web/src/app/admin/sales/[id]/page.tsx, .icm/docs/data-protection.md
- complexity: standard

## Problem

Um consumidor pode pedir o NIF na fatura, e então o NIF é obrigatório (CIVA art. 36.º n.º 16).
O fluxo de reserva (`/reservar`) e a página do orçamento não pedem o NIF. Um hóspede que quer
o NIF tem de escrever um email, e a fatura pode chegar tarde.

## Proposed change

O hóspede vê um campo opcional "NIF para a fatura" / "Tax number for the invoice" em três
sítios: o formulário de reserva com pagamento, o formulário de pedido de reserva, e o passo de
pagamento do orçamento.

1. **O campo é opcional.** Vazio, a reserva continua como hoje.
2. **A validação (Q1).** Um valor de 9 dígitos, com ou sem o prefixo `PT`, é um NIF português:
   o dígito de controlo é verificado. Um NIF com o dígito errado é recusado com uma mensagem no
   campo, e o formulário mantém os outros campos. Qualquer outro valor (letras, outro
   comprimento) é um número fiscal estrangeiro: é aceite como texto livre, até 20 caracteres.
3. **O registo.** O NIF fica na reserva (ou no pedido) e no orçamento, numa coluna nova
   `tax_id`, por uma migração Drizzle. A migração só adiciona colunas que aceitam `NULL`.
4. **A consola.** A ficha de venda (`/admin/sales/[id]`) mostra o NIF quando existe.
5. **Os dados pessoais.** A exportação do Art. 15 (`subject-data.ts`) inclui o NIF. A política
   de privacidade nomeia o NIF e a sua finalidade (a fatura), em `pt-PT` e em `en`. A regra de
   retenção do NIF é a da linha da reserva (`data-protection.md`, item 2): o NIF não tem regra
   própria.

A decisão da fatura (JAM-473, `.icm/docs/go-live-legal.md`): "por mão" no go-live. Este campo
dá o NIF a quem emite a fatura à mão.

## Acceptance criteria

- [ ] Um hóspede reserva um tour com NIF e sem NIF, e as duas reservas são aceites. (verify: agent)
- [ ] Um NIF português com o dígito de controlo errado é recusado, e o formulário mantém os outros campos. (verify: agent)
- [ ] A função de validação aceita NIFs válidos, recusa dígitos errados e aceita um número estrangeiro. (verify: CI)
- [ ] A consola mostra o NIF da reserva e do orçamento na ficha de venda. (verify: operator)
- [ ] A exportação do Art. 15 inclui o NIF. (verify: CI)
- [ ] A política de privacidade nomeia o NIF e a sua finalidade, em `pt-PT` e em `en`. (verify: operator)

## Out of scope

- A emissão de faturas pela plataforma (uma integração é um pedido novo, fora do acordo).
- A lista "Para faturar" da consola (JAM-528).
- O nome ou a morada de faturação de uma empresa.
- Mostrar o NIF no email de confirmação ao hóspede.
- Alterar o NIF depois da reserva: o hóspede escreve um email, como hoje.

## Open questions

- O prazo de retenção espera a resposta do contabilista (C11 de `go-live-legal.md`).
