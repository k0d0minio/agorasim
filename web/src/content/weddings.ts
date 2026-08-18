import type { Localized } from "@/i18n/config";

/**
 * Copy for the wedding-car-hire landing page (`/[locale]/casamentos`).
 *
 * Live since AGORA-005, with Diogo & Rita's real offer (info PDF §2.3, Aug
 * 2026): transport of the couple, photo sessions with the cars, floral
 * decoration and personalised wooden boards; priced as a quote per event
 * depending on location; no distance limits; couples book 3–4 months ahead.
 * The enquiry form writes to the Sales board — quoting stays a human reply.
 */
export const weddingsContent = {
  title: {
    pt: "Chegue ao seu casamento num clássico",
    en: "Arrive at your wedding in a classic",
  } as Localized,
  lead: {
    pt: "Os nossos carros clássicos, engalanados para o seu grande dia — com condutor, flores e todo o charme da região Saloia.",
    en: "Our classic cars, dressed up for your big day — with a driver, flowers and all the charm of the Saloia countryside.",
  } as Localized,

  intro: {
    pt: [
      "Há entradas que ninguém esquece. Um Citroën 2CV a chegar devagar à igreja, um Fiat 600 com flores no tejadilho, fotografias que parecem de outra década — é isso que levamos ao seu casamento.",
      "Tratamos do transporte dos noivos, da sessão fotográfica com os carros, da decoração floral e das tábuas de madeira personalizadas para o vosso dia. O carro chega impecável, com condutor, onde quer que seja — sem limites de distância.",
    ],
    en: [
      "Some entrances are never forgotten. A Citroën 2CV arriving slowly at the church, a Fiat 600 with flowers on the roof, photographs that look like another decade — that is what we bring to your wedding.",
      "We take care of the couple's transport, the photo session with the cars, the floral decoration and the personalised wooden boards for your day. The car arrives immaculate, with a driver, wherever you are — no distance limits.",
    ],
  } as Localized<string[]>,

  /** What the service includes — their own list, verbatim facts. */
  offer: {
    title: { pt: "O que está incluído", en: "What's included" } as Localized,
    items: [
      {
        pt: "Transporte dos noivos no clássico que escolherem",
        en: "Transport of the couple in the classic of your choice",
      },
      {
        pt: "Sessão fotográfica com os carros",
        en: "A photo session with the cars",
      },
      {
        pt: "Decoração floral a condizer com o vosso dia",
        en: "Floral decoration matched to your day",
      },
      {
        pt: "Tábuas de madeira personalizadas",
        en: "Personalised wooden boards",
      },
    ] as Localized[],
  },

  howItWorks: {
    title: { pt: "Como funciona", en: "How it works" } as Localized,
    steps: [
      {
        title: { pt: "Conte-nos o vosso dia", en: "Tell us about your day" } as Localized,
        body: {
          pt: "Data, local da cerimónia, horas de serviço e o carro dos vossos sonhos.",
          en: "Date, ceremony venue, hours of service and the car of your dreams.",
        } as Localized,
      },
      {
        title: { pt: "Receba o orçamento", en: "Receive your quote" } as Localized,
        body: {
          pt: "Cada casamento é orçamentado à medida, conforme o local e o serviço. Respondemos em 24–48h, sem compromisso.",
          en: "Every wedding is quoted individually, by location and service. We reply within 24–48h, no obligation.",
        } as Localized,
      },
      {
        title: { pt: "Garanta a data", en: "Lock in your date" } as Localized,
        body: {
          pt: "Confirmam connosco e o carro fica reservado em exclusivo para o vosso dia. O ideal é reservar com 3 a 4 meses de antecedência.",
          en: "Confirm with us and the car is reserved exclusively for your day. Ideally, book 3 to 4 months ahead.",
        } as Localized,
      },
    ],
  },

  fleet: {
    title: { pt: "Escolha o vosso clássico", en: "Choose your classic" } as Localized,
    intro: {
      pt: "Cada carro tem nome, história e personalidade — todos chegam impecáveis e decorados a rigor.",
      en: "Each car has a name, a history and a personality — all arrive immaculate and beautifully decorated.",
    } as Localized,
    /**
     * `model` matches `fleet` in `content/site.ts`, where the name, year and
     * story live — the page joins the two, so a car's biography exists once.
     * `image: null` renders a "photos coming soon" tile — never a wrong car.
     */
    cars: [
      { model: "Citroën 2CV", image: "/images/back-of-car.webp" },
      { model: "Fiat 600", image: "/images/red-car.webp" },
      { model: "Renault 4L", image: null },
      { model: "Volkswagen T3", image: null },
    ] as { model: string; image: string | null }[],
    photosSoon: {
      pt: "Fotografias a caminho",
      en: "Photographs on their way",
    } as Localized,
  },

  /** The Wedding Awards badges in `public/images/wedding-awards/` — five years running. */
  awards: {
    title: {
      pt: "Wedding Awards — cinco anos consecutivos",
      en: "Wedding Awards — five years running",
    } as Localized,
    years: [2022, 2023, 2024, 2025, 2026],
    alt: {
      pt: "Selo Wedding Awards",
      en: "Wedding Awards badge",
    } as Localized,
  },

  quote: {
    title: { pt: "Peça o vosso orçamento", en: "Request your quote" } as Localized,
    lead: {
      pt: "Sem compromisso — respondemos em 24–48h com uma proposta à vossa medida.",
      en: "No obligation — we reply within 24–48h with a proposal made for you.",
    } as Localized,
    labels: {
      names: { pt: "Os vossos nomes", en: "Your names" } as Localized,
      email: { pt: "Email", en: "Email" } as Localized,
      phone: { pt: "Telefone", en: "Phone" } as Localized,
      date: { pt: "Data do casamento", en: "Wedding date" } as Localized,
      venue: { pt: "Local da cerimónia", en: "Ceremony venue" } as Localized,
      venuePlaceholder: {
        pt: "Ex.: Igreja de São Pedro, Mafra",
        en: "e.g. São Pedro Church, Mafra",
      } as Localized,
      hours: { pt: "Horas de serviço", en: "Hours of service" } as Localized,
      hoursOptions: {
        pt: ["Meio dia (até 4h)", "Dia inteiro (até 8h)", "Ainda não sabemos"],
        en: ["Half day (up to 4h)", "Full day (up to 8h)", "We don't know yet"],
      } as Localized<string[]>,
      car: { pt: "Carro preferido", en: "Preferred car" } as Localized,
      carNone: { pt: "Aconselhem-nos", en: "Advise us" } as Localized,
      message: { pt: "Contem-nos mais", en: "Tell us more" } as Localized,
      messagePlaceholder: {
        pt: "O que imaginam para o vosso dia…",
        en: "What you imagine for your day…",
      } as Localized,
      submit: { pt: "Pedir orçamento", en: "Request quote" } as Localized,
      sending: { pt: "A enviar…", en: "Sending…" } as Localized,
    },
    success: {
      title: { pt: "Pedido enviado", en: "Request sent" } as Localized,
      body: {
        pt: "Obrigado! Respondemos em 24–48h com uma proposta à vossa medida. Se preferirem falar já, liguem-nos.",
        en: "Thank you! We'll reply within 24–48h with a proposal made for you. If you'd rather talk now, give us a call.",
      } as Localized,
    },
    errors: {
      names: { pt: "Digam-nos os vossos nomes.", en: "Please tell us your names." } as Localized,
      email: {
        pt: "Indiquem um email válido.",
        en: "Please enter a valid email address.",
      } as Localized,
      rateLimited: {
        pt: "Recebemos vários pedidos seus. Aguardem uns minutos antes de tentar novamente.",
        en: "We've had several requests from you. Please wait a few minutes before trying again.",
      } as Localized,
      generic: {
        pt: "Não foi possível enviar o pedido. Tentem novamente ou liguem-nos.",
        en: "We couldn't send your request. Please try again or give us a call.",
      } as Localized,
    },
  },

  faqTitle: { pt: "Perguntas frequentes", en: "Frequently asked questions" } as Localized,
  faqs: [
    {
      question: {
        pt: "Com quanta antecedência devemos reservar?",
        en: "How far in advance should we book?",
      } as Localized,
      answer: {
        pt: "O ideal é reservar com 3 a 4 meses de antecedência, para garantir o carro que querem no dia que querem. Datas mais próximas? Perguntem-nos sempre — se pudermos, fazemos.",
        en: "Ideally book 3 to 4 months ahead, to be sure of the car you want on the day you want. Shorter notice? Always ask — if we can make it work, we will.",
      } as Localized,
    },
    {
      question: {
        pt: "Como funciona o preço? E há limites de distância?",
        en: "How is it priced? Are there distance limits?",
      } as Localized,
      answer: {
        pt: "Cada casamento é orçamentado à medida, conforme o local e o serviço — não há pacotes fixos nem limites de distância. Contem-nos o que imaginam e enviamos uma proposta sem compromisso.",
        en: "Every wedding is quoted individually, by location and service — there are no fixed packages and no distance limits. Tell us what you imagine and we'll send a proposal, no obligation.",
      } as Localized,
    },
    {
      question: {
        pt: "O serviço inclui condutor e decoração?",
        en: "Does the service include a driver and decoration?",
      } as Localized,
      answer: {
        pt: "Sim. Todos os serviços de casamento incluem condutor e decoração floral a combinar convosco. O carro chega impecável ao local que definirem.",
        en: "Yes. Every wedding service includes a driver and floral decoration arranged with you. The car arrives immaculate at the location you choose.",
      } as Localized,
    },
    {
      question: {
        pt: "E se quisermos o carro para as fotografias apenas?",
        en: "What if we only want the car for the photographs?",
      } as Localized,
      answer: {
        pt: "Também fazemos sessões mais curtas só para fotografias, dentro da região Saloia. Diga-nos o que imaginam e preparamos uma proposta à medida.",
        en: "We also do shorter photo-only sessions within the Saloia region. Tell us what you have in mind and we will prepare a tailored proposal.",
      } as Localized,
    },
  ],
} as const;
