import type { Localized } from "@/i18n/config";

export type Faq = { question: Localized; answer: Localized };

export type Experience = {
  slug: string;
  kind: "signature" | "complement";
  /** FareHarbor item id for this experience, or null while not yet wired. */
  fareharborItem: string | null;
  title: Localized;
  tagline: Localized;
  /** Answer-first summary — the first ~40 words that directly describe the experience (GEO). */
  summary: Localized;
  description: Localized<string[]>;
  duration: Localized;
  highlights: Localized<string[]>;
  image: string;
  imageAlt: Localized;
  faqs: Faq[];
};

export const experiences: Experience[] = [
  {
    slug: "rural-saloia",
    kind: "signature",
    fareharborItem: null,
    title: { pt: "Rural Saloia", en: "Rural Saloia" },
    tagline: {
      pt: "Um dia clássico pelo campo Saloio, de Sintra à Ericeira",
      en: "A classic day through the Saloia countryside, from Sintra to Ericeira",
    },
    summary: {
      pt: "Rural Saloia é uma experiência guiada de um dia num carro clássico pela região Saloia, entre Sintra e Mafra até à Ericeira. Visita monumentos naturais, vinhas, aldeias, o Palácio Nacional de Mafra e a costa atlântica, com paragens gastronómicas pelo caminho.",
      en: "Rural Saloia is a guided full-day experience in a classic car through the Saloia region, from Sintra and Mafra to Ericeira. You visit natural monuments, vineyards, villages, the National Palace of Mafra and the Atlantic coast, with gastronomic stops along the way.",
    },
    description: {
      pt: [
        "Percorra a região Saloia ao ritmo de um carro clássico, longe das rotas turísticas habituais. O passeio liga os monumentos naturais entre Sintra e Mafra, atravessa vinhas e aldeias, e chega à vila piscatória da Ericeira — reserva mundial de surf reconhecida pela UNESCO.",
        "Pelo caminho conhece o Palácio Nacional de Mafra, prova doçaria regional e desfruta de vistas sobre o Atlântico, sempre num ambiente calmo que revela a essência da região.",
        "Cada saída é acompanhada por um anfitrião local que partilha histórias, tradições e sabores Saloios — uma imersão cultural e sensorial pensada para pequenos grupos.",
      ],
      en: [
        "Explore the Saloia region at the pace of a classic car, away from the usual tourist routes. The tour links the natural monuments between Sintra and Mafra, crosses vineyards and villages, and reaches the fishing village of Ericeira — a UNESCO World Surfing Reserve.",
        "Along the way you visit the National Palace of Mafra, taste regional sweets and take in Atlantic views, always in a calm atmosphere that reveals the essence of the region.",
        "Every departure is hosted by a local guide who shares Saloia stories, traditions and flavours — a cultural and sensory immersion designed for small groups.",
      ],
    },
    duration: { pt: "Dia completo (aprox. 6–7h)", en: "Full day (approx. 6–7h)" },
    highlights: {
      pt: [
        "Passeio em carro clássico (2CV, R4, Fiat 600 ou T3)",
        "Monumentos naturais entre Sintra e Mafra",
        "Palácio Nacional de Mafra",
        "Vila da Ericeira e costa atlântica",
        "Vinhas, aldeias e doçaria regional",
      ],
      en: [
        "Ride in a classic car (2CV, R4, Fiat 600 or T3)",
        "Natural monuments between Sintra and Mafra",
        "National Palace of Mafra",
        "Ericeira village and the Atlantic coast",
        "Vineyards, villages and regional sweets",
      ],
    },
    image: "/images/car.jpg",
    imageAlt: {
      pt: "Citroën 2CV da Agorasim numa quinta da região Saloia",
      en: "Agorasim Citroën 2CV at a countryside estate in the Saloia region",
    },
    faqs: [
      {
        question: {
          pt: "Onde começa e termina a experiência Rural Saloia?",
          en: "Where does the Rural Saloia experience start and end?",
        },
        answer: {
          pt: "O passeio decorre na região Saloia, entre Sintra, Mafra e a Ericeira. O ponto de encontro é combinado no momento da reserva; podemos incluir recolha em pontos próximos.",
          en: "The tour takes place in the Saloia region, between Sintra, Mafra and Ericeira. The meeting point is arranged at booking; pickup at nearby points can be included.",
        },
      },
      {
        question: {
          pt: "Quantas pessoas podem participar?",
          en: "How many people can join?",
        },
        answer: {
          pt: "As saídas são em pequenos grupos para manter o ambiente intimista. Fazemos também passeios privados para famílias e grupos — fale connosco para grupos maiores.",
          en: "Departures are in small groups to keep the atmosphere intimate. We also run private tours for families and groups — contact us for larger parties.",
        },
      },
      {
        question: {
          pt: "É preciso saber conduzir o carro clássico?",
          en: "Do I need to drive the classic car?",
        },
        answer: {
          pt: "Não. A experiência é guiada por um anfitrião local que conduz o carro clássico. Basta relaxar e desfrutar da paisagem.",
          en: "No. The experience is led by a local host who drives the classic car. You just relax and enjoy the scenery.",
        },
      },
    ],
  },
  {
    slug: "tasco-galapito",
    kind: "complement",
    fareharborItem: null,
    title: { pt: "Tasco Galapito", en: "Tasco Galapito" },
    tagline: {
      pt: "Uma refeição de família, à mesa Saloia",
      en: "A family meal at the Saloia table",
    },
    summary: {
      pt: "Tasco Galapito é uma refeição privada em ambiente de família, com pratos tradicionais Saloios servidos à mesa. Dura cerca de 2 horas e combina na perfeição com a experiência Rural Saloia.",
      en: "Tasco Galapito is a private family-style meal, with traditional Saloia dishes served at the table. It lasts about 2 hours and pairs perfectly with the Rural Saloia experience.",
    },
    description: {
      pt: [
        "Sente-se à mesa como em casa de família e prove a cozinha Saloia autêntica, preparada com produtos locais e receitas passadas de geração em geração.",
        "Uma paragem para partilhar histórias, sabores e o tempo sem pressa que define a região.",
      ],
      en: [
        "Sit at the table as you would in a family home and taste authentic Saloia cooking, made with local produce and recipes passed down through generations.",
        "A stop to share stories, flavours and the unhurried time that defines the region.",
      ],
    },
    duration: { pt: "Aprox. 2h", en: "Approx. 2h" },
    highlights: {
      pt: ["Refeição privada de família", "Cozinha Saloia tradicional", "Produtos locais"],
      en: ["Private family meal", "Traditional Saloia cuisine", "Local produce"],
    },
    image: "/images/picnic.jpeg",
    imageAlt: {
      pt: "Mesa posta com pratos tradicionais Saloios",
      en: "Table set with traditional Saloia dishes",
    },
    faqs: [
      {
        question: {
          pt: "É possível adaptar o menu a restrições alimentares?",
          en: "Can the menu be adapted to dietary requirements?",
        },
        answer: {
          pt: "Sim. Indique as suas preferências ou restrições no momento da reserva e adaptamos a refeição sempre que possível.",
          en: "Yes. Let us know your preferences or restrictions when booking and we adapt the meal whenever possible.",
        },
      },
    ],
  },
  {
    slug: "manzwine",
    kind: "complement",
    fareharborItem: null,
    title: { pt: "Manzwine", en: "Manzwine" },
    tagline: {
      pt: "Prova de vinhos com história",
      en: "A wine tasting with history",
    },
    summary: {
      pt: "Manzwine é uma prova de vinhos com contexto histórico na região de Mafra, com cerca de 1,5 horas de duração. Descubra castas locais e a história por detrás de cada vinho.",
      en: "Manzwine is a wine tasting with historical context in the Mafra region, lasting about 1.5 hours. Discover local grape varieties and the story behind each wine.",
    },
    description: {
      pt: [
        "Uma prova guiada que liga o vinho à história da região, com castas locais e a paisagem que as produz.",
      ],
      en: [
        "A guided tasting that connects wine to the history of the region, with local grape varieties and the landscape that produces them.",
      ],
    },
    duration: { pt: "Aprox. 1h30", en: "Approx. 1.5h" },
    highlights: {
      pt: ["Prova guiada", "Castas locais", "Contexto histórico"],
      en: ["Guided tasting", "Local grape varieties", "Historical context"],
    },
    image: "/images/picnic-2.jpeg",
    imageAlt: {
      pt: "Copos de vinho numa prova na região de Mafra",
      en: "Wine glasses at a tasting in the Mafra region",
    },
    faqs: [],
  },
  {
    slug: "ramilo-wines",
    kind: "complement",
    fareharborItem: null,
    title: { pt: "Ramilo Wines", en: "Ramilo Wines" },
    tagline: {
      pt: "Vinhas biológicas e provas junto ao mar",
      en: "Organic vineyards and tastings near the sea",
    },
    summary: {
      pt: "Ramilo Wines é uma visita a vinhas biológicas com prova de vinhos, com cerca de 1,5 horas. Conheça a viticultura de influência atlântica da região de Colares e arredores.",
      en: "Ramilo Wines is a visit to organic vineyards with a wine tasting, lasting about 1.5 hours. Discover the Atlantic-influenced winemaking of the Colares area and surroundings.",
    },
    description: {
      pt: [
        "Passeie pelas vinhas biológicas e prove vinhos marcados pela proximidade ao Atlântico, com explicação sobre o método e as castas.",
      ],
      en: [
        "Walk through organic vineyards and taste wines shaped by their proximity to the Atlantic, with an explanation of the method and grape varieties.",
      ],
    },
    duration: { pt: "Aprox. 1h30", en: "Approx. 1.5h" },
    highlights: {
      pt: ["Vinhas biológicas", "Prova de vinhos", "Influência atlântica"],
      en: ["Organic vineyards", "Wine tasting", "Atlantic influence"],
    },
    image: "/images/front-of-car.png",
    imageAlt: {
      pt: "Vinhas biológicas perto da costa atlântica",
      en: "Organic vineyards near the Atlantic coast",
    },
    faqs: [],
  },
  {
    slug: "olaria-mz",
    kind: "complement",
    fareharborItem: null,
    title: { pt: "Olaria MZ", en: "Olaria MZ" },
    tagline: {
      pt: "Uma tarde às mãos com o barro",
      en: "An afternoon working with clay",
    },
    summary: {
      pt: "Olaria MZ é um workshop de cerâmica de cerca de 1,5 horas, onde trabalha o barro com um artesão local e leva a sua própria peça. Uma experiência criativa e sensorial da tradição Saloia.",
      en: "Olaria MZ is a ceramics workshop of about 1.5 hours where you work the clay with a local artisan and take home your own piece. A creative, hands-on experience of Saloia tradition.",
    },
    description: {
      pt: [
        "Uma introdução prática à olaria tradicional, guiada por um artesão local. Molde a sua peça e descubra um ofício com raízes profundas na região.",
      ],
      en: [
        "A hands-on introduction to traditional pottery, guided by a local artisan. Shape your own piece and discover a craft with deep roots in the region.",
      ],
    },
    duration: { pt: "Aprox. 1h30", en: "Approx. 1.5h" },
    highlights: {
      pt: ["Workshop de cerâmica", "Artesão local", "Leva a sua peça"],
      en: ["Ceramics workshop", "Local artisan", "Take your piece home"],
    },
    image: "/images/back-of-car.png",
    imageAlt: {
      pt: "Mãos a moldar barro num workshop de cerâmica",
      en: "Hands shaping clay at a ceramics workshop",
    },
    faqs: [],
  },
];

export const signatureExperience = experiences.find((e) => e.kind === "signature")!;
export const complementExperiences = experiences.filter((e) => e.kind === "complement");

export function getExperience(slug: string): Experience | undefined {
  return experiences.find((e) => e.slug === slug);
}
