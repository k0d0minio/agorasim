/**
 * The two things Portuguese consumer law makes a trader's website say, kept
 * as facts here and worded in `i18n/dictionaries.ts` (footer) and
 * `content/terms.ts` (contract terms).
 *
 * - **Livro de Reclamações Eletrónico** (DL 156/2005 as amended by DL
 *   74/2017): every consumer-facing trader has to link the platform from its
 *   site. The site can only link — Diogo & Rita still have to *register* the
 *   business on livroreclamacoes.pt, which is a launch-checklist step for them.
 * - **Alternative dispute resolution** (Lei 144/2015, Art. 18): the trader
 *   names the RAL entity (or entities) competent for it. Agorasim Vintage
 *   operates from Mafra, Lisbon district, so the regional centre is the
 *   Centro de Arbitragem de Conflitos de Consumo de Lisboa (CACCL); CNIACC is
 *   the national centre that takes what no regional centre covers; the DGPJ
 *   page is the official list of authorised entities.
 *
 * The EU ODR platform is deliberately absent: it was discontinued in July 2025
 * (Regulation (EU) 2024/3228) and a link to it would be a dead one.
 *
 * URLs checked to resolve on 2026-09-10.
 */
export const consumerLaw = {
  complaintsBook: {
    name: "Livro de Reclamações Eletrónico",
    url: "https://www.livroreclamacoes.pt/",
  },
  adr: {
    /** Lei n.º 144/2015 — the RAL framework the footer line cites. */
    law: "Lei n.º 144/2015",
    regional: {
      name: "Centro de Arbitragem de Conflitos de Consumo de Lisboa",
      short: "CACCL",
      url: "https://www.centroarbitragemlisboa.pt/",
    },
    national: {
      name: "Centro Nacional de Informação e Arbitragem de Conflitos de Consumo",
      short: "CNIACC",
      url: "https://www.cniacc.pt/",
    },
    directory: {
      url: "https://dgpj.justica.gov.pt/resolucao-de-litigios/arbitragem/centros-de-arbitragem-autorizados",
    },
  },
} as const;
