# Handoff jam-317

## Causa

O campo armadilha dos formulários públicos tinha o nome `company_website` e a etiqueta "Company website". O preenchimento automático do Chrome associa esse nome à organização de uma morada guardada e ignora `autoComplete="off"`. Por isso preenchia o campo, e a ação descartava o pedido real como se viesse de um robô.

## O que mudou

- `web/src/lib/honeypot.ts`: o campo chama-se agora `hp_trap`, com a etiqueta "Leave this field empty". Tem os atributos que excluem o 1Password, o LastPass, o Bitwarden e o Dashlane. A função `isHoneypotHit` faz a verificação nas três ações.
- Os três formulários (`quote-request-form.tsx`, `tour-request-form.tsx`, `booking-checkout-form.tsx`) leem o nome, a etiqueta e os atributos desse ficheiro.
- Um pedido com a armadilha preenchida continua a ser descartado e registado nos logs. A resposta de cada ação não mudou.
- Testes unitários: o descarte e a passagem para cada uma das três ações, e as palavras proibidas no nome e na etiqueta.
- O stub `.icm/intake/triage/quote-form-honeypot-autofill.md` passou para `_done/`.
- O código é o do pull request #250, aplicado de novo sobre `main`. Nesse pull request, o job `check / code` estava verde.

## Next action

O operador testa na preview, marca **Ready to merge** no pull request #259 e diz `release JAM-317`.

## How to test

Abra a preview num Chrome com uma morada guardada, com o campo "Empresa" preenchido. Em `/pt/casamentos`, escolha a sugestão do preenchimento automático e envie o pedido. O pedido tem de aparecer no quadro de Vendas, e os dois emails têm de chegar.

## Blockers

- none

## Do not touch

- JAM-320 muda o campo da data em `web/src/components/quote-request-form.tsx` depois deste merge. Este run mudou só o bloco da armadilha nesse ficheiro.
