import type { Localized } from "@/i18n/config";

/** Home page copy. */
export const home = {
  heroEyebrow: {
    pt: "Sintra · Mafra · Ericeira",
    en: "Sintra · Mafra · Ericeira",
  } as Localized,
  heroTitle: {
    pt: "Descubra a região Saloia num carro clássico",
    en: "Discover the Saloia region in a classic car",
  } as Localized,
  heroSubtitle: {
    pt: "Passeios guiados sem pressa por vinhas, aldeias, monumentos naturais e a costa atlântica — com paragens de gastronomia e muita história.",
    en: "Unhurried guided tours through vineyards, villages, natural monuments and the Atlantic coast — with food stops and plenty of history.",
  } as Localized,

  introTitle: {
    pt: "Turismo rural, à maneira antiga",
    en: "Rural tourism, the old-fashioned way",
  } as Localized,
  intro: {
    pt: [
      "A Agorasim leva-o a conhecer a região Saloia — o campo entre Sintra, Mafra e a Ericeira — a bordo de carros clássicos como o Citroën 2CV, o Renault 4L, o Fiat 600 e a Volkswagen T3.",
      "Cada saída combina paisagem, gastronomia e cultura local num ambiente calmo, pensado para pequenos grupos que procuram uma experiência autêntica e sem multidões.",
    ],
    en: [
      "Agorasim takes you through the Saloia region — the countryside between Sintra, Mafra and Ericeira — aboard classic cars such as the Citroën 2CV, Renault 4L, Fiat 600 and Volkswagen T3.",
      "Every departure blends landscape, food and local culture in a calm atmosphere, designed for small groups looking for an authentic, crowd-free experience.",
    ],
  } as Localized<string[]>,

  experiencesEyebrow: { pt: "Experiências", en: "Experiences" } as Localized,
  experiencesTitle: {
    pt: "A viagem e o que a torna especial",
    en: "The journey and what makes it special",
  } as Localized,
  experiencesIntro: {
    pt: "Comece pelo passeio Rural Saloia e complemente-o com uma refeição de família, provas de vinho ou um workshop de cerâmica.",
    en: "Start with the Rural Saloia tour and complement it with a family meal, wine tastings or a ceramics workshop.",
  } as Localized,
} as const;

/** About page copy. */
export const about = {
  title: { pt: "Sobre a Agorasim", en: "About Agorasim" } as Localized,
  lead: {
    pt: "A Agorasim nasceu da vontade de mostrar a região Saloia como ela é: genuína, tranquila e cheia de histórias. Fazemo-lo ao ritmo de carros clássicos, com anfitriões locais que conhecem cada estrada, cada vinha e cada sabor.",
    en: "Agorasim was born from a desire to show the Saloia region as it truly is: genuine, calm and full of stories. We do it at the pace of classic cars, with local hosts who know every road, every vineyard and every flavour.",
  } as Localized,
  body: {
    pt: [
      "Acreditamos que viajar devagar é a melhor forma de conhecer um lugar. Por isso os nossos passeios evitam as rotas mais turísticas e privilegiam o contacto com pessoas, produtores e paisagens da região.",
      "Trabalhamos com parceiros locais — produtores de vinho, artesãos e famílias — para que cada experiência apoie a comunidade e revele o melhor do território entre Sintra, Mafra e a Ericeira.",
    ],
    en: [
      "We believe travelling slowly is the best way to get to know a place. That is why our tours avoid the busiest routes and favour real contact with the people, producers and landscapes of the region.",
      "We work with local partners — winemakers, artisans and families — so that each experience supports the community and reveals the best of the land between Sintra, Mafra and Ericeira.",
    ],
  } as Localized<string[]>,
  values: {
    pt: [
      { title: "Autêntico", text: "Experiências reais com pessoas da região." },
      { title: "Sem pressa", text: "O tempo certo para apreciar cada paragem." },
      { title: "Local", text: "Apoiamos produtores e artesãos Saloios." },
    ],
    en: [
      { title: "Authentic", text: "Real experiences with local people." },
      { title: "Unhurried", text: "The right pace to enjoy every stop." },
      { title: "Local", text: "We support Saloia producers and artisans." },
    ],
  } as Localized<{ title: string; text: string }[]>,
};

/** Events page copy. */
export const events = {
  title: { pt: "Eventos", en: "Events" } as Localized,
  lead: {
    pt: "Organizamos experiências à medida para grupos, empresas e ocasiões especiais — casamentos, celebrações e team buildings com o toque clássico da Agorasim.",
    en: "We organise tailor-made experiences for groups, companies and special occasions — weddings, celebrations and team buildings with the classic Agorasim touch.",
  } as Localized,
  body: {
    pt: [
      "Quer receber os seus convidados com um cortejo de carros clássicos, montar uma prova de vinhos privada ou desenhar um roteiro exclusivo pela região? Falamos consigo para criar um evento memorável.",
      "Diga-nos o que imagina e tratamos da logística, dos parceiros locais e de cada detalhe.",
    ],
    en: [
      "Want to welcome your guests with a procession of classic cars, host a private wine tasting or design an exclusive route through the region? We work with you to create a memorable event.",
      "Tell us what you have in mind and we handle the logistics, the local partners and every detail.",
    ],
  } as Localized<string[]>,
};

/** Contact page copy. */
export const contact = {
  title: { pt: "Contactos", en: "Contact" } as Localized,
  lead: {
    pt: "Fale connosco para reservar uma experiência, planear um evento ou tirar qualquer dúvida. Respondemos com gosto.",
    en: "Get in touch to book an experience, plan an event or ask any question. We are happy to help.",
  } as Localized,
};
