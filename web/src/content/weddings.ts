import type { Localized } from "@/i18n/config";

/**
 * Copy for the wedding-car-hire landing page (`/[locale]/casamentos`) —
 * proposal Feature 4 (instant wedding-car-hire booking). The quote flow is a
 * design preview until the deposit engine ships; weddings are handled by
 * phone/email in the meantime.
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
    pt: "O pedido de orçamento online com sinal para garantir a data está a ser construído — este é o desenho final.",
    en: "Online quoting with a deposit to lock your date is being built — this is the final design.",
  } as Localized,

  intro: {
    pt: [
      "Há entradas que ninguém esquece. Um Citroën 2CV a chegar devagar à igreja, um Fiat 600 com flores no tejadilho, fotografias que parecem de outra década — é isso que levamos ao seu casamento.",
      "Tratamos de tudo: o carro impecável, o condutor, a decoração a condizer com o vosso dia, e tempo reservado para as fotografias que vão querer guardar para sempre.",
    ],
    en: [
      "Some entrances are never forgotten. A Citroën 2CV arriving slowly at the church, a Fiat 600 with flowers on the roof, photographs that look like another decade — that is what we bring to your wedding.",
      "We take care of everything: the immaculate car, the driver, decoration matched to your day, and time set aside for the photographs you will keep forever.",
    ],
  } as Localized<string[]>,

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
          pt: "Enviamos uma proposta personalizada em 24–48h, sem compromisso.",
          en: "We send a personalised proposal within 24–48h, no obligation.",
        } as Localized,
      },
      {
        title: { pt: "Garanta a data com sinal", en: "Lock the date with a deposit" } as Localized,
        body: {
          pt: "Um sinal online reserva o carro em exclusivo para o vosso dia.",
          en: "An online deposit reserves the car exclusively for your day.",
        } as Localized,
      },
    ],
  },

  fleet: {
    title: { pt: "Escolha o vosso clássico", en: "Choose your classic" } as Localized,
    intro: {
      pt: "Cada carro tem a sua personalidade — todos chegam impecáveis e decorados a rigor.",
      en: "Each car has its own personality — all arrive immaculate and beautifully decorated.",
    } as Localized,
    /** `image: null` renders a "photos coming soon" tile — never a wrong car. */
    cars: [
      {
        name: "Citroën 2CV",
        image: "/images/weddings/2cv-rear-floral-garland-square.webp",
        note: {
          pt: "O charme francês, perfeito para fotografias no campo.",
          en: "French charm, perfect for countryside photographs.",
        } as Localized,
      },
      {
        name: "Fiat 600",
        image: "/images/weddings/fiat-600-front-with-bride-square.webp",
        note: {
          pt: "Pequeno, vermelho e irresistível — a estrela das entradas.",
          en: "Small, red and irresistible — the star of every entrance.",
        } as Localized,
      },
      {
        name: "Renault 4L",
        image: "/images/weddings/renault-4-mafra-palace.jpg",
        note: {
          pt: "Descontraído e elegante, como os casamentos ao fim da tarde.",
          en: "Relaxed and elegant, like a late-afternoon wedding.",
        } as Localized,
      },
      {
        name: "Volkswagen T3",
        image: null,
        note: {
          pt: "Espaço para o cortejo todo — e para a festa começar cedo.",
          en: "Room for the whole party — and for the celebration to start early.",
        } as Localized,
      },
    ] as { name: string; image: string | null; note: Localized }[],
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
        pt: "Para casamentos entre maio e setembro, recomendamos 6 a 12 meses de antecedência. Fora da época alta há mais flexibilidade — pergunte-nos sempre.",
        en: "For weddings between May and September we recommend 6 to 12 months ahead. Outside high season there is more flexibility — always ask us.",
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
