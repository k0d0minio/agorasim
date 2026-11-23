# Findings jam-480

The operator files these later. One entry for each finding.

## A pergunta do contrato fica com o Jamie

- where: JAM-480, Q2 do ticket ("Is the brand work part of the current deal?")
- what: A resposta não muda a página, por isso não é uma pergunta deste run. O briefing diz que
  a pergunta é do Jamie. O default do ticket é "no, a new request with its own quote" (a
  proposta não tem entrega de marca). Este run não responde.
- proposed: question for the ticket

## Os ficheiros brutos ainda estão em web/public/images/

- where: `web/public/images/` do checkout principal (não rastreados)
- what: Cinco ficheiros do designer, um com 72 MB. A decisão D47 diz que pertencem ao arquivo do
  negócio. Um `git add -A` nesse checkout faz commit deles. JAM-483 precisa deles fora antes de
  começar.
- proposed: chore

## Comentário para o JAM-480 (não publicado)

- where: Linear, JAM-480
- what: Em 2026-11-23 a sessão tentou publicar este comentário com o BAXTER tool. O classificador do modo auto recusou a escrita. Nenhum ticket novo: o JAM-483 já diz para mover os ficheiros brutos primeiro. Texto do comentário: o PR #266 usa os defaults Q1 = B, framed, e as três cores marcadas como principais. O Jamie pode mudá-los no gate, e uma mudança de Q1 muda o âmbito do JAM-482 ao JAM-484. A Q2 do ticket (o contrato) fica com o Jamie. O Orange tint é `oklch(0.852 0.063 70.8)`, não `oklch(0.853 0.066 70.5)`. Os ficheiros brutos ainda estão em `web/public/images/` do checkout principal.
- proposed: question for the ticket
