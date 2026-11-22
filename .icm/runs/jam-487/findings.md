# Findings jam-487

Estas observações não fazem parte do ticket. O operador decide o que fazer com cada uma.

1. **As fotografias da revisão não funcionam.** A pré-visualização tem a proteção de
   implementação da Vercel. O agente `review-shots` vê só a página de login. O pacote da
   revisão do PR #264 tem 0 fotografias.
2. **`https://prod.agorasim.pt` dá 404 `DEPLOYMENT_NOT_FOUND`.** É o endereço de produção em
   `.icm/environments.md`. O domínio não está numa implementação da Vercel, ou o endereço do
   ficheiro está errado. Por isso, não há fotografias "antes".
3. **Falha do blueprint: o contrato de `review-shots` e um hook não concordam.** O passo 6 do
   contrato manda apagar cada fotografia inútil. Um hook bloqueia `rm` em `~/baxter_live`. As 8
   fotografias inúteis ficam em `~/baxter_live/workspace/scratch/shots/` (login e páginas 404,
   sem dados pessoais).
4. **O mesmo erro pode existir no formulário de reserva de passeios.**
   `reservar/actions.ts` devolve só `values.preferredDate` numa recusa. Os outros campos do
   formulário de passeio não são controlados. Não verifiquei isto num browser.
