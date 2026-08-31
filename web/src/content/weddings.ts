import type { Localized } from "@/i18n/config";

/**
 * Copy for the wedding-car-hire landing page (`/[locale]/casamentos`).
 *
 * The offer is Diogo & Rita's own (info PDF §2.3, Aug 2026): transport of the
 * couple, photo sessions with the cars, floral decoration and personalised
 * wooden boards; quoted per event depending on location; no distance limits;
 * couples book 3 to 4 months ahead.
 *
 * The quote form below is still a **disabled preview** and the page is
 * `noindex` — sending it writes an enquiry, which is
 * `quote-flow/enable-wedding-event-forms`. Until then the banner points
 * couples at the phone, which is how weddings are booked today.
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

  inDev: {
    pt: "O pedido de orçamento online está a ser construído — este é o desenho final. Até lá, o orçamento é pedido por telefone ou email.",
    en: "Online quote requests are being built — this is the final design. Until then, quotes are arranged by phone or email.",
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

  /** What the service includes — their list, as they gave it. */
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
     * Only the wedding photograph lives here: `id` joins each tile to
     * `classicCars` in `content/site.ts`, where the car's name, year and story
     * are written once. `image: null` renders a "photographs on their way"
     * tile — never a wrong car (`content-truth/wedding-fleet-photos`).
     */
    cars: [
      { id: "citroen-2cv", image: "/images/weddings/2cv-rear-floral-garland-square.webp" },
      { id: "fiat-600", image: "/images/weddings/fiat-600-front-with-bride-square.webp" },
      { id: "renault-4l", image: "/images/weddings/renault-4-mafra-palace.jpg" },
      { id: "vw-t3", image: null },
    ] as { id: string; image: string | null }[],
    photosSoon: {
      pt: "Fotografias a caminho",
      en: "Photographs on their way",
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
      soon: {
        pt: "O envio online fica ativo brevemente — até lá, contactem-nos diretamente.",
        en: "Online sending will be live soon — until then, contact us directly.",
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
        pt: "Também fazemos sessões fotográficas com os carros, sem o serviço completo do dia. Diga-nos o que imaginam e preparamos uma proposta à medida.",
        en: "We also do photo sessions with the cars, without the full wedding-day service. Tell us what you have in mind and we will prepare a tailored proposal.",
      } as Localized,
    },
  ],
} as const;
