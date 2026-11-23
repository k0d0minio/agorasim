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
