# Handoff jam-478

## Página

`.icm/docs/geo-baseline.md` (página nova, verbo `add`). Diz a linha de base de 2026-11-23 no
site WordPress antigo: as dez consultas no Google, cinco perguntas ao ChatGPT e duas ao
Perplexity, o que o site novo já faz, as falhas no corte, as medidas sem cookie e a verificação
mensal (dono: Jamie, primeiro dia útil de cada mês).

## Diferenças do ticket

- O ticket diz "depois do go-live (S1)". O spike correu antes, por ordem do Jamie de
  2026-11-23. Assim a linha de base é o site antigo, o que é o ponto de partida certo.
- Critério 1 (Search Console e Bing verificados, sitemap lido): não cumprido. O spike não muda
  nenhuma definição do Search Console. É o ato F2 de `findings.md`, no dia do go-live.
- Bing: os resultados neste browser não eram utilizáveis. A linha de base do Bing não é
  conhecida.
- Perplexity pediu uma conta à terceira pergunta. O spike não criou nenhuma conta.

## Next action

O Jamie lê a página e o `findings.md`, e regista os tickets propostos F1 a F7. F1 (redirects) é
antes do corte de DNS.

## How to test

Abra `.icm/docs/geo-baseline.md` no pull request. A secção 3 tem as dez consultas e onde o
Agorasim aparece. A secção 6 diz quem repete a verificação e quando.

## Blockers

- none

## Do not touch

- none
