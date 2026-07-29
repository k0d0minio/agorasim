import type { Localized } from "@/i18n/config";

/**
 * Copy for the refer-a-friend page (`/[locale]/recomendar`) — proposal
 * Feature 6 (referral / word-of-mouth system). Design preview: personal links
 * and reward tracking activate when the feature ships.
 */
export const referralContent = {
  title: {
    pt: "Recomende um amigo, ganhem os dois",
    en: "Refer a friend, you both win",
  } as Localized,
  lead: {
    pt: "Gostou do seu dia connosco? Partilhe-o. Quando um amigo reservar através de si, agradecemos aos dois.",
    en: "Loved your day with us? Share it. When a friend books through you, we thank you both.",
  } as Localized,

  inDev: {
    pt: "O sistema de recomendações está a ser construído — este é o desenho final. Em breve, cada cliente terá o seu link pessoal.",
    en: "The referral system is being built — this is the final design. Soon, every guest will have their own personal link.",
  } as Localized,

  how: {
    title: { pt: "Como funciona", en: "How it works" } as Localized,
    steps: [
      {
        title: { pt: "Receba o seu link", en: "Get your link" } as Localized,
        body: {
          pt: "Depois do seu passeio, enviamos-lhe um link de recomendação pessoal.",
          en: "After your tour, we send you a personal referral link.",
        } as Localized,
      },
      {
        title: { pt: "Partilhe com amigos", en: "Share with friends" } as Localized,
        body: {
          pt: "WhatsApp, email ou em conversa — como preferir.",
          en: "WhatsApp, email or over coffee — whatever suits you.",
        } as Localized,
      },
      {
        title: { pt: "Ganham os dois", en: "You both win" } as Localized,
        body: {
          pt: "Quando reservarem com o seu link, há um agradecimento para si e um desconto para eles.",
          en: "When they book with your link, there is a thank-you for you and a discount for them.",
        } as Localized,
      },
    ],
  },

  rewards: {
    title: { pt: "O que ganham", en: "What you get" } as Localized,
    friend: {
      label: { pt: "Para o seu amigo", en: "For your friend" } as Localized,
      value: { pt: "10% de desconto", en: "10% off" } as Localized,
      note: {
        pt: "na primeira experiência que reservar consigo a recomendar.",
        en: "their first experience booked through your recommendation.",
      } as Localized,
    },
    you: {
      label: { pt: "Para si", en: "For you" } as Localized,
      value: { pt: "Uma prova regional", en: "A regional tasting" } as Localized,
      note: {
        pt: "oferecida no seu próximo passeio — ou um desconto equivalente.",
        en: "on us during your next tour — or an equivalent discount.",
      } as Localized,
    },
    exampleNote: {
      pt: "Recompensas de exemplo — os valores finais são definidos no lançamento.",
      en: "Example rewards — final values are set at launch.",
    } as Localized,
  },

  linkCard: {
    title: { pt: "O seu link pessoal", en: "Your personal link" } as Localized,
    example: "agorasim.pt/r/maria-2CV",
    copy: { pt: "Copiar link", en: "Copy link" } as Localized,
    soon: {
      pt: "Os links pessoais ficam disponíveis quando o sistema for lançado.",
      en: "Personal links become available when the system launches.",
    } as Localized,
  },

  cta: {
    title: {
      pt: "Ainda não fez um passeio connosco?",
      en: "Haven't toured with us yet?",
    } as Localized,
    body: {
      pt: "Comece pela experiência Rural Saloia — depois terá muitas histórias para recomendar.",
      en: "Start with the Rural Saloia experience — you will have plenty of stories to recommend.",
    } as Localized,
  },
} as const;
