# Findings jam-558

The operator files these later. One entry for each finding.

## O texto das experiências tem duas casas

- where: `web/src/content/experiences.ts` e a tabela `experiences` (UAT e produção)
- what: O site lê a tabela. `experiences.ts` só serve quando a tabela não responde. Uma
  correção de texto só em `experiences.ts` não muda o site. Os findings dos runs anteriores
  citavam só o ficheiro.
- proposed: knowledge. Uma linha em `web/AGENTS.md` ou nos docs: uma correção de texto de uma
  experiência é uma migração de dados com guarda, como `0014` e `0045`.
