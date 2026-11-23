# Handoff jam-487

## Causa

O React repõe o formulário no valor por omissão de cada campo depois da ação do servidor, e a
ação `submitQuoteRequest` não devolvia os valores escritos, por isso uma recusa do nome ou do
email apagava todos os campos.

## Correção

- `web/src/app/[locale]/quote-actions.ts`: cada recusa (campo inválido, limite de pedidos, erro
  ao gravar) devolve `values` com o que o cliente escreveu. O honeypot e os campos ocultos não
  voltam.
- `web/src/components/quote-request-form.tsx`: cada campo usa `values` como valor por omissão.
  Cada lista (`select`) tem o seu valor como `key`, porque uma lista só lê o valor por omissão
  quando é montada. A data começa no valor devolvido, para a página sem JavaScript.
- O envio válido e o honeypot (JAM-317) não mudam.

## Next action

O operador testa na pré-visualização e marca Ready to merge.

## How to test

Na pré-visualização, abra `/pt/eventos`, preencha todos os campos e escreva um email sem
domínio, como `ana@`. Envie: a mensagem de erro aparece junto ao email e todos os outros campos
ficam como estavam. Faça o mesmo em `/en/casamentos` com o nome em branco.

## Blockers

- none

## Do not touch

- none
