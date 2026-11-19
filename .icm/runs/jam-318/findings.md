# Findings jam-318

- 2026-11-19 · O agente `review-shots` não consegue fotografar uma página da consola de
  administração. A preview mostra "Log in to Vercel" (a proteção de deployments da Vercel), e
  o contrato do agente proíbe o início de sessão. Um critério `(verify: agent)` de uma página
  `/admin/*` não tem assim verificação na preview.
- 2026-11-19 · `https://prod.agorasim.pt` responde `404 DEPLOYMENT_NOT_FOUND`.
  `.icm/environments.md` dá esse endereço como produção. Visto pelo agente `review-shots`, não
  confirmado por esta sessão.
- 2026-11-19 · O agente `review-shots` guardou por engano um pacote vazio em
  `~/baxter_live/data/review/k0d0minio-baxter_workspace-260.json`. O operador decide se o remove.
  O pacote certo é `k0d0minio-agorasim-260.json`.
- 2026-11-19 · O `shot_scraper` do agente só tem os dispositivos `phone` (390 px) e `desktop`
  (1440 px). Não faz 375, 768 nem 1024 px.
- 2026-11-19 · O hook `route-request` imprimiu a rota de JAM-317 para uma mensagem cujo comando
  era `pick up JAM-318`. A mensagem nomeava os dois tickets. Falha possível do blueprint.
