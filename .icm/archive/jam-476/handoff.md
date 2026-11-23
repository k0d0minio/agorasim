# Handoff jam-476

## Próxima ação

O operador lê `.icm/docs/sms-channel.md`, decide a recomendação e leva as 7 perguntas ao
cliente. Depois o BAXTER cria os tickets SMS-1 a SMS-5. Este run não os cria.

## O que mudou

- Página nova: `.icm/docs/sms-channel.md`. Tem a comparação de Twilio, Vonage, Infobip e Bird
  (preços por segmento em 9 países, regras do remetente, custos fixos), as mensagens que vão
  por SMS, o custo mensal, o consentimento, a alteração do `message_log`, o plano de
  construção com tamanhos e as perguntas para o cliente.
- Recomendação: Twilio, remetente `Agorasim`, 4 das 5 mensagens automáticas por SMS (o
  agradecimento fica só por email), €3 a €16 por mês, a conta é do cliente, cerca de 4,25 dias
  de construção.

## Diferença em relação ao contrato da lane

- O contrato da lane `knowledge` diz "Write no plan". O ticket pede um plano de construção
  nesta página, e o ticket é o requisito. A página diz no topo que é uma recomendação e não
  uma decisão.
- O brief da sessão pedia um comentário no JAM-476. O `CLAUDE.md` diz que uma sessão neste
  repo não escreve no Linear. O rascunho do comentário está em `findings.md`.

## Como testar

Abra `.icm/docs/sms-channel.md` no pull request. Confirme que a decisão nomeia um fornecedor
com o preço por SMS para Portugal, a UE, os EUA, o Canadá e a Austrália. Confirme que a lista
diz quais das cinco mensagens vão por SMS e que o plano tem tamanho e titular da conta.

## Bloqueios

- nenhum

## Não tocar

- nenhum
