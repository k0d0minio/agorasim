# Stub: Livro de Reclamações + ADR notice in the footer

- feature-slug: footer-compliance
- epic: launch-cutover
- priority: P1
- size: S
- depends-on: none
- sequence: 4 of 14
- sources: legal lens: DL 156/2005 (Livro de Reclamações Eletrónico link mandatory for PT consumer-facing traders) + Lei 144/2015 (ADR/RAL entity identification); footer has neither (`web/src/components/site-footer.tsx:92-106`)

## Problem

Portuguese consumer law requires the site to link livroreclamacoes.pt and identify
the competent alternative-dispute-resolution entity. Neither appears. The client
also has to register on the platform — the site can only link.

## Proposed change

Footer bottom bar gains the standard Livro de Reclamações Eletrónico link (official
logo optional, text link sufficient) and an ADR line naming the competent entity for
tourism in the Lisbon region (verify current: likely Centro de Arbitragem de
Conflitos de Consumo de Lisboa; also the EU ODR platform link) — on both locales.
Add "register on livroreclamacoes.pt" to the client checklist in the runbook /
question pack.

## Acceptance criteria (rough)

- [ ] Footer links livroreclamacoes.pt + names the ADR entity, PT/EN
- [ ] Client registration step recorded in the runbook
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add the compliance footer per
`.icm/intake/launch-cutover/footer-compliance.md`: Livro de Reclamações Eletrónico
link and ADR (RAL) entity line in `web/src/components/site-footer.tsx` (both
locales via `web/src/i18n/dictionaries.ts`), verifying the currently competent
consumer-arbitration entity for a Mafra/Lisbon-region tourism operator before naming
it. Add the operator-registration step to `.icm/docs/launch-runbook.md` if present.
PR on a `claude/` branch; no local checks — CI is the source of truth.
