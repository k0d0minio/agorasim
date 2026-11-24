# Handoff jam-484

## Next action

O Jamie testa no preview, marca **Ready to merge** no pull request #290 e diz
`release JAM-484`.

## How to test

Abra um endereço que não existe no preview, por exemplo `/pt/experiencias/nao-existe`: a
carrinha com o cão aparece acima do texto em PT e EN. Faça uma reserva de teste no telemóvel:
o desenho fica acima de "Reserva confirmada" e os detalhes veem-se sem deslizar. Abra o email
de confirmação no Gmail, no Apple Mail e no Outlook: a faixa de colinas fica no topo do cartão.

## Criteria

- 404 em `/pt` e `/en` com o desenho e o texto bilingue: feito. Imagens do agente `review-shots`.
- Confirmação com o desenho acima do agradecimento, detalhes visíveis a 375 × 667: feito no
  código (topo de 32 px no telemóvel, desenho de 112 px). Não fotografado: o estado
  confirmado precisa de uma sessão Stripe paga. Verifica o Jamie na reserva de teste.
- Desenho com 240 px no máximo, decorativo (`alt=""`) sem legenda: feito.
- Faixa no Gmail, Apple Mail e Outlook: verifica o Jamie.
- Faixa com URL absoluto e `alt=""`, legível sem imagens: feito, com teste.
- Testes e lint: CI verde em 88ef583.

## Choices to check

- Q1: o recorte foi feito pelo agente a partir do original. A cauda fina e escura do cão
  perdeu-se contra a colina escura. Se o Jamie quiser a cauda, a designer pode enviar o recorte.
- Q2: colinas de dia. O céu passou a ter a cor da página do email.
- A faixa fica em todos os emails que usam o layout, não só nos da reserva. A faixa colorida
  da equipa perdeu os cantos redondos do topo, porque agora fica por baixo das colinas.

## Blockers

- none

## Do not touch

- `web/public/images/brand/source/`: os originais ficam fora do git.
