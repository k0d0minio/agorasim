/**
 * The experience catalogue **as it shipped** — the seed for the `experiences`
 * table and the fallback the site renders when the database cannot be reached.
 *
 * It is no longer the source of truth. Diogo & Rita edit the live catalogue at
 * `/admin/experiences`, and every page reads it through
 * `lib/experience-catalogue.ts`, which falls back to this array. Keeping the
 * fallback means a database outage costs the site its *newest* copy of the
 * catalogue, not the whole page.
 *
 * Edit this file only to change what a fresh install starts with.
 */
import type { Localized } from "@/i18n/config";
import type { ExperienceIconKey } from "@/lib/experience-icons";
import type { ExperiencePricing } from "@/lib/pricing";

export type Faq = { question: Localized; answer: Localized };

export type Experience = {
  slug: string;
  kind: "signature" | "complement";
  /** Which icon the admin lists draw for this entry — see `lib/experience-icons.ts`. */
  icon: ExperienceIconKey;
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
  /**
   * Price per person in euro cents, or `null`/absent when none is set.
   *
   * Superseded by {@link pricing} (AGORA-002): the real offer is tiered and
   * moded in ways one number cannot say. Kept because the column still exists
   * and old admin screens read it; nothing prices a sale from it any more.
   */
  priceCents?: number | null;
  /**
   * The real price list (AGORA-002) — public/private tiers, child rates,
   * partner minimums. See `lib/pricing.ts` for the shape and the arithmetic.
   *
   * These are Diogo & Rita's actual figures (prices PDF, Aug 2026), so the
   * shipped fallback can sell: a database outage costs the site its newest
   * price list, not the ability to price at all. `null` still means
   * unsellable, and the enquiry form takes over.
   */
  pricing?: ExperiencePricing | null;
};

export const experiences: Experience[] = [
  {
    slug: "rural-saloia",
    kind: "signature",
    icon: "car",
    title: { pt: "Rural Saloia", en: "Rural Saloia" },
    tagline: {
      pt: "Um dia clássico pelo campo Saloio, de Sintra à Ericeira",
      en: "A classic day through the Saloia countryside, from Sintra to Ericeira",
    },
    summary: {
      pt: "Rural Saloia é uma experiência guiada de 4h30 num carro clássico pela região Saloia, entre Sintra e Mafra até à Ericeira. Visita monumentos naturais, vinhas, aldeias, o Palácio Nacional de Mafra e a costa atlântica, com paragens gastronómicas pelo caminho.",
      en: "Rural Saloia is a guided 4.5-hour experience in a classic car through the Saloia region, from Sintra and Mafra to Ericeira. You visit natural monuments, vineyards, villages, the National Palace of Mafra and the Atlantic coast, with gastronomic stops along the way.",
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
    duration: { pt: "Aprox. 4h30", en: "Approx. 4.5h" },
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
          pt: "Onde começa a experiência Rural Saloia?",
          en: "Where does the Rural Saloia experience start?",
        },
        answer: {
          pt: "O ponto de encontro é na Av. Mário Firmino Miguel, em Sintra (Portela de Sintra). Há duas partidas por dia, às 10h00 e às 14h00 — escolhe a sua ao reservar, e a confirmação inclui o mapa exato.",
          en: "The meeting point is Av. Mário Firmino Miguel in Sintra (Portela de Sintra). There are two departures a day, at 10:00 and 14:00 — you pick yours when booking, and your confirmation includes the exact map link.",
        },
      },
      {
        question: {
          pt: "Qual é a política de cancelamento?",
          en: "What is the cancellation policy?",
        },
        answer: {
          pt: "Cancelamento gratuito até 48 horas antes da experiência, com reembolso total. Em caso de mau tempo tentamos sempre reagendar por email; em condições extremas, reembolsamos.",
          en: "Free cancellation up to 48 hours before the experience, with a full refund. In bad weather we always try to reschedule by email; in extreme conditions, we refund.",
        },
      },
      {
        question: {
          pt: "As crianças pagam?",
          en: "Do children pay?",
        },
        answer: {
          pt: "Crianças dos 4 aos 12 anos têm preço reduzido; bebés com menos de 4 anos não pagam. Todos contam para os lugares do carro — indique o grupo completo ao reservar.",
          en: "Children aged 4–12 pay a reduced rate; infants under 4 go free. Everyone counts towards the seats in the car, so tell us your full group when booking.",
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
    pricing: {
      type: "tour",
      public: {
        // Per adult, cheaper once the group fills a second car.
        tiers: [
          { minAdults: 1, maxAdults: 3, perAdultCents: 6200 },
          { minAdults: 4, maxAdults: 12, perAdultCents: 5800 },
        ],
        childCents: 3500,
      },
      private: {
        // The whole departure, priced by adult count.
        tiers: [
          { minAdults: 1, maxAdults: 3, groupCents: 22000 },
          { minAdults: 4, maxAdults: 4, groupCents: 29000 },
          { minAdults: 5, maxAdults: 5, groupCents: 35000 },
          { minAdults: 6, maxAdults: 6, groupCents: 40000 },
          { minAdults: 7, maxAdults: 7, groupCents: 45000 },
          { minAdults: 8, maxAdults: 8, groupCents: 50000 },
          { minAdults: 9, maxAdults: 9, groupCents: 55000 },
          { minAdults: 10, maxAdults: 10, groupCents: 60000 },
          { minAdults: 11, maxAdults: 11, groupCents: 65000 },
          { minAdults: 12, maxAdults: 12, groupCents: 70000 },
        ],
        childCents: 3000,
        allowsAddOns: true,
      },
    },
  },
  {
    slug: "obidos-medieval-villages",
    kind: "signature",
    icon: "heritage",
    title: {
      pt: "Óbidos e Aldeias Medievais",
      en: "Óbidos & Medieval Villages",
    },
    tagline: {
      pt: "Uma rota gastronómica por Óbidos e aldeias com séculos de história",
      en: "A food tour through Óbidos and villages with centuries of history",
    },
    summary: {
      pt: "Óbidos e Aldeias Medievais é uma rota guiada de cerca de 5 horas com partida de Lisboa, por Óbidos e aldeias medievais menos conhecidas, com uma pausa de comida e vinho tradicionais pelo caminho.",
      en: "Óbidos & Medieval Villages is a guided tour of about 5 hours departing from Lisbon, through Óbidos and lesser-known medieval villages, with a traditional food and wine break along the way.",
    },
    description: {
      pt: [
        "Uma viagem alternativa a lugares menos conhecidos: a vila amuralhada de Óbidos e aldeias medievais que guardam a história como poucas, longe das multidões.",
        "Pelo caminho há uma pausa de sabores tradicionais — comida e vinho da região — e histórias contadas por quem cresceu por perto.",
        "A partida é no centro de Lisboa. Ao contrário das experiências Saloias, esta rota não é feita nos carros clássicos.",
      ],
      en: [
        "An alternative road trip to lesser-known places: the walled town of Óbidos and medieval villages that hold their history like few others, away from the crowds.",
        "Along the way there is a stop for traditional flavours — regional food and wine — and stories told by hosts who grew up nearby.",
        "Departure is from central Lisbon. Unlike the Saloia experiences, this route is not driven in the classic cars.",
      ],
    },
    duration: { pt: "Aprox. 5h", en: "Approx. 5h" },
    highlights: {
      pt: [
        "Vila medieval de Óbidos",
        "Aldeias históricas fora das rotas habituais",
        "Pausa de comida e vinho tradicionais",
        "Partida do centro de Lisboa",
      ],
      en: [
        "The medieval town of Óbidos",
        "Historic villages off the usual routes",
        "Traditional food and wine break",
        "Departs from central Lisbon",
      ],
    },
    image: "/images/hero.webp",
    imageAlt: {
      pt: "Paisagem rural a caminho de Óbidos e das aldeias medievais",
      en: "Countryside landscape on the way to Óbidos and the medieval villages",
    },
    faqs: [
      {
        question: {
          pt: "Onde começa a experiência Óbidos e Aldeias Medievais?",
          en: "Where does the Óbidos & Medieval Villages experience start?",
        },
        answer: {
          pt: "O ponto de encontro é na Alameda Cardeal Cerejeira, em Lisboa. A confirmação da reserva inclui o mapa exato do ponto de encontro.",
          en: "The meeting point is Alameda Cardeal Cerejeira in Lisbon. Your booking confirmation includes the exact map link for the meeting point.",
        },
      },
      {
        question: {
          pt: "Esta experiência é feita em carros clássicos?",
          en: "Is this experience in the classic cars?",
        },
        answer: {
          pt: "Não — os carros clássicos ficam reservados para as experiências na região Saloia. Esta rota é feita em viatura confortável, pensada para a distância até Óbidos.",
          en: "No — the classic cars are reserved for the Saloia-region experiences. This route uses a comfortable vehicle suited to the distance to Óbidos.",
        },
      },
      {
        question: {
          pt: "Qual é a política de cancelamento?",
          en: "What is the cancellation policy?",
        },
        answer: {
          pt: "Cancelamento gratuito até 48 horas antes da experiência, com reembolso total. Em caso de mau tempo tentamos sempre reagendar por email; em condições extremas, reembolsamos.",
          en: "Free cancellation up to 48 hours before the experience, with a full refund. In bad weather we always try to reschedule by email; in extreme conditions, we refund.",
        },
      },
    ],
    pricing: {
      type: "tour",
      public: {
        // Public departures need at least two adults.
        tiers: [{ minAdults: 2, maxAdults: 12, perAdultCents: 10000 }],
        childCents: 4000,
        minAdults: 2,
      },
      private: {
        tiers: [
          { minAdults: 1, maxAdults: 3, groupCents: 36000 },
          { minAdults: 4, maxAdults: 12, perAdultCents: 11000 },
        ],
        childCents: 4000,
      },
    },
  },
  {
    slug: "tasco-galapito",
    kind: "complement",
    icon: "meal",
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
    // Only with a private countryside tour; the table seats two or more.
    pricing: {
      type: "addon",
      perAdultCents: 6000,
      childCents: 2500,
      minGuests: 2,
    },
  },
  {
    slug: "manzwine",
    kind: "complement",
    icon: "wine",
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
    faqs: [
      {
        question: {
          pt: "A prova Manzwine está disponível todos os dias?",
          en: "Is the Manzwine tasting available every day?",
        },
        answer: {
          pt: "A Manzwine encerra à segunda-feira. Nos restantes dias, a prova junta-se à experiência privada Rural Saloia com um mínimo de 2 adultos.",
          en: "Manzwine closes on Mondays. On other days, the tasting joins the private Rural Saloia experience with a minimum of 2 adults.",
        },
      },
    ],
    // Only with a private countryside tour; per adult, minimum two; shut Mondays.
    pricing: {
      type: "addon",
      perAdultCents: 3500,
      childCents: null,
      minAdults: 2,
      closedWeekdays: [0],
    },
  },
  {
    slug: "ramilo-wines",
    kind: "complement",
    icon: "vineyard",
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
    image: "/images/front-of-car.webp",
    imageAlt: {
      pt: "Vinhas biológicas perto da costa atlântica",
      en: "Organic vineyards near the Atlantic coast",
    },
    faqs: [
      {
        question: {
          pt: "Qual é o mínimo de pessoas para a visita Ramilo Wines?",
          en: "What is the minimum group for the Ramilo Wines visit?",
        },
        answer: {
          pt: "A visita realiza-se com um mínimo de 3 adultos, como complemento da experiência privada Rural Saloia.",
          en: "The visit runs with a minimum of 3 adults, as an add-on to the private Rural Saloia experience.",
        },
      },
    ],
    // Only with a private countryside tour; per adult, minimum three.
    pricing: {
      type: "addon",
      perAdultCents: 4500,
      childCents: null,
      minAdults: 3,
    },
  },
];

export const signatureExperience = experiences.find((e) => e.kind === "signature")!;
export const complementExperiences = experiences.filter((e) => e.kind === "complement");
/** The bookable tours — there are two now, so "the signature" is no longer "the offer". */
export const tourExperiences = experiences.filter((e) => e.kind === "signature");

export function getExperience(slug: string): Experience | undefined {
  return experiences.find((e) => e.slug === slug);
}
