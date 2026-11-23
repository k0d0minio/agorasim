# Handoff jam-497

## Causa

O React repõe o formulário no valor por omissão de cada campo depois da ação do servidor, e a
ação `submitTourRequest` devolvia só a data, por isso uma recusa do nome, do email ou do dia
apagava todos os outros campos do formulário de passeio.

## Reprodução

Num servidor local, em `/pt/reservar`, com todos os campos preenchidos e o email `ana@`: a
mensagem "Indique um email válido." aparece e todos os campos ficam vazios. A página não
recarrega.

## Correção

- `web/src/app/[locale]/reservar/actions.ts`: cada recusa (campo inválido, dia sem lugar,
  limite de pedidos, erro ao gravar) devolve `values` com o que o cliente escreveu. O honeypot
  e o campo oculto `locale` não voltam. A data volta como antes (sem espaços, ausente se vazia),
  por isso o calendário não muda.
- `web/src/components/tour-request-form.tsx`: cada campo usa `values` como valor por omissão:
  nome, email, telefone, pessoas, experiência, data, extras, mensagem e consentimento. A lista
  da experiência tem o seu valor como `key`, porque uma lista só lê o valor por omissão quando é
  montada.
- O envio válido, o honeypot e o checkout (`checkout-actions.ts`) não mudam.

## Next action

O operador testa na pré-visualização e marca Ready to merge.

## How to test

Na pré-visualização, abra `/pt/reservar`, preencha todos os campos, escolha um extra e escreva
um email sem domínio, como `ana@`. Envie: a mensagem de erro aparece junto ao email e todos os
outros campos ficam como estavam. Faça o mesmo em `/en/reservar` com o nome em branco.

## Blockers

- none

## Do not touch

- none
