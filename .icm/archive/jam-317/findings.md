# Findings jam-317

## 1. Um pedido descartado pela armadilha ainda parece um sucesso

- O ticket diz, em "Proposed change": "Do not let a trap hit look like a real success with no trace". Os critérios de aceitação pedem só que o pedido seja descartado e registado.
- Estado depois deste run: `submitQuoteRequest` e `submitTourRequest` respondem `{ ok: true }` e escrevem uma linha `console.warn` nos logs. `startCheckout` responde com o erro genérico. Não há linha na base de dados nem aviso à equipa.
- Mudar a resposta, ou guardar o pedido descartado para a equipa ver, é um comportamento novo e uma decisão de produto. Não cabe na lane `bug`.
- Rascunho de ticket: "agorasim · A equipa vê os pedidos que a armadilha descartou" (lane `new`).

## 2. O teste com o preenchimento automático real não é automático

- Os critérios 2 e 3 pedem um teste no Chrome com uma morada guardada. O CI não tem esse teste. O operador faz o teste na preview (How to test).
- O segundo guarda opcional do ticket (um tempo mínimo de preenchimento) não foi feito.
