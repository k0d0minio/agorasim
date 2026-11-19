# Findings jam-320

## O quadro Sales mostra a data do pedido como `2027-06-12`

- Onde: `web/src/app/admin/sales/[id]/page.tsx` (linha "Data preferida", `lead.preferredDate`) e
  `web/src/lib/sales.ts` (`when: booking?.date ?? row.preferredDate`).
- O quê: o cartão e a página de um pedido de casamento ou evento mostram a chave guardada, não a
  data por extenso. O ticket JAM-320 pede a correção só no formulário e no email da equipa.
- Proposta de ticket: "agorasim · The Sales board shows the date of an enquiry in words", lane
  `tweak`. Usar `formatDay` de `web/src/lib/date-keys.ts`, que devolve o texto livre sem mudança.

## O formulário de orçamento perde os dados quando o servidor devolve um erro

- Onde: `web/src/components/quote-request-form.tsx` e `web/src/app/[locale]/quote-actions.ts`.
- O quê: os campos não são controlados e a ação não devolve `values`. Quando o servidor devolve um
  erro de nome ou de email, o React repõe o formulário vazio. O formulário de `/reservar` devolve
  `values` para o evitar. Não verificado num browser: lido no código.

## Possível falha do blueprint: `ci-status.sh` disse GREEN sem o `code` correr no último commit

- Onde: `.icm/_system/scripts/ci-status.sh` e `ci.yml` (do blueprint), com o passo 6 de
  `.icm/_system/rules/lane.md` ("Commit and push. Change the pull request to ready").
- O quê: no pull request #261, o `git push` do commit `a29246e` e o `gh pr ready` foram feitos
  no mesmo segundo. O run `ci` 44496315671 em `a29246e` (evento do push, pull request ainda em
  rascunho) terminou `skipped`. O run `ci` 44496314784 (evento "ready") correu com sucesso, mas
  no commit anterior `a290348`, que só muda `.icm`. Os jobs `code`, `secrets` e `workflows` não
  correram no commit com a alteração de `web`.
- `ci-status.sh 261 --watch` imprimiu "#261 at a29246e", `code ok` e `RESULT: GREEN`. Um job
  `skipped` no último commit não devia contar como `ok`.
- Proposta: o blueprint conta `skipped` de um job exigido como PENDING ou RED, ou a regra da lane
  manda esperar pelo push antes de `gh pr ready`.
- Segunda leitura errada: `ci-status.sh 261 --watch`, corrido logo a seguir ao `git push` de
  `00a8aa9`, imprimiu de novo "#261 at a29246e" e `RESULT: GREEN`. O GitHub ainda não tinha o
  novo commit como cabeça do pull request. O script devia comparar a cabeça do pull request com
  o `HEAD` local e esperar quando são diferentes.
- Nesta run: o run `ci` 44496852448 correu em `00a8aa9` depois de "ready", com `code`, `secrets`
  e `workflows` a passar. Esse commit tem toda a alteração de `web`.
