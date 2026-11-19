# Findings jam-321

## 1. O agente `review-shots` não consegue fotografar a preview nem a produção

- A preview do pull request #257 envia um visitante anónimo para "Log in to Vercel"
  (deployment protection do projeto Vercel `agorasim`). O agente não faz login, por isso não
  há imagens "depois".
- `https://prod.agorasim.pt` responde `404 DEPLOYMENT_NOT_FOUND`. Não há imagens "antes" até
  à primeira promoção.
- Resultado: o cartão do gate do #257 tem 0 imagens e 4 linhas "not captured".
- Decisão do operador: tornar as previews públicas, ou permitir o UAT
  (`https://uat.agorasim.pt`) como fonte do "antes", ou aceitar o teste manual.

## 2. Um pack sem dono nos dados do BAXTER

- A primeira chamada `pack` do agente `review-shots` correu numa pasta do BAXTER e resolveu
  o repo como `k0d0minio/baxter_workspace`. O BAXTER guardou um pack para
  `k0d0minio/baxter_workspace #257` (head 89c7ee9, 0 imagens). Esse pull request não existe.
- Ninguém o removeu, porque uma sessão não muda os dados do BAXTER à mão. O operador decide
  se o apaga.
