import type { Localized } from "@/i18n/config";

/**
 * Real guest reviews, supplied by Diogo & Rita with the guests' OK to publish
 * (info PDF §2.5), and the photos they sent with them.
 *
 * The English is the guests' own words, excerpted — the full reviews run to
 * paragraphs — with spelling tidied and nothing added. The Portuguese is our
 * faithful translation, and the locale itself says so: a PT reader sees a PT
 * quote from a Canadian couple and understands.
 *
 * These render as copy and nothing else. No `Review`/`AggregateRating` JSON-LD
 * is emitted for them anywhere: structured ratings pull in display duties we
 * cannot honour off three quotes, and three quotes are not an average.
 */
export type Testimonial = {
  /** First names only, as agreed with the guests. */
  names: string;
  /** Where they came from, in the reader's language. */
  origin: Localized;
  quote: Localized;
  /** Their own photo from the tour, published with permission. */
  photo: string;
  /** What the photo shows — written from the photo, not from the quote. */
  photoAlt: Localized;
  /**
   * Catalogue slugs this quote can honestly stand under, beyond the home page.
   * A quote only lists an experience the guests actually had: the Óbidos tour
   * is neither a classic-car day nor a Saloia one, so nothing here speaks for
   * it, and an add-on is listed only where the quote or its photo is plainly
   * at that partner.
   */
  experiences: readonly string[];
};

export const testimonials: readonly Testimonial[] = [
  {
    names: "Jacob & Danita",
    origin: { pt: "Canadá", en: "Canada" },
    quote: {
      pt: "Estamos casados há 41 anos e já visitámos 88 países — e mesmo assim ficámos radiantes como miúdos numa loja de doces. Parecia saído de um filme. Tornou a nossa viagem a Portugal verdadeiramente especial: uma experiência 10/10.",
      en: "We have been married 41 years and have visited 88 countries — and yet we were giddy like kids in a candy store. It felt as if it was out of a movie. This has made our trip to Portugal most special: a 10/10 experience.",
    },
    photo: "/images/testimonials/jacob-and-danita.jpg",
    photoAlt: {
      pt: "Jacob e Danita à noite, à porta da Tasco Galapito, com o Diogo, a Rita e o dono da tasca de avental vermelho, em frente à grelha a lenha.",
      en: "Jacob and Danita at night outside Tasco Galapito with Diogo, Rita and the tasco's owner in his red apron, in front of the wood-fired grill.",
    },
    // The photo was taken at the Tasco, which is why the quote also stands on
    // that add-on's page.
    experiences: ["rural-saloia", "tasco-galapito"],
  },
  {
    names: "Madeline & Elliot",
    origin: { pt: "Austrália", en: "Australia" },
    quote: {
      pt: "Que experiência única na vida! Os lugares que visitámos estavam fora dos roteiros e nunca os teríamos encontrado sozinhos. Acabámos com um piquenique, com os produtos mais incríveis, iguarias caseiras e o cenário mais bonito. Conversa deliciosa, paisagens de morrer e comida tão saborosa que nos deixou sem palavras.",
      en: "What a once in a lifetime experience! The places we visited were off the beaten path and we would never have found them on our own. We finished with a picnic together, with the most incredible produce, home made delicacies and the most picturesque backdrop. We had delightful conversation with scenery to die for and food so tasty it was beyond words.",
    },
    photo: "/images/testimonials/madeline-and-elliot.jpg",
    photoAlt: {
      pt: "Madeline e Elliot muito juntos numa selfie ao fim do dia com o Diogo e a Rita, os quatro a rir, com o cão da casa ao colo da Rita.",
      en: "Madeline and Elliot pressed together for an end-of-day selfie with Diogo and Rita, all four laughing, the house Jack Russell in Rita's arms.",
    },
    experiences: ["rural-saloia"],
  },
  {
    names: "Brian & Elizabeth",
    origin: { pt: "EUA", en: "USA" },
    quote: {
      pt: "Verdadeiramente único e inigualável. Explorámos os caminhos menos percorridos do campo de Sintra e vimos Portugal a uma luz diferente, fiel às suas tradições. Começámos a viagem como estranhos e acabámos como amigos.",
      en: "It was truly unique and one of a kind. We explored the unbeaten path of the Sintra countryside and saw Portugal in a different light, one that honoured its traditions. We started out this trip as strangers but ended as friends.",
    },
    photo: "/images/testimonials/brian-and-elizabeth.jpg",
    photoAlt: {
      pt: "Brian e Elizabeth sentados num banco de pedra com o Diogo e a Rita, uma garrafa de ginja caseira na mão e as colinas verdes saloias atrás.",
      en: "Brian and Elizabeth sitting on a stone bench with Diogo and Rita, a bottle of homemade ginja in hand and the green Saloia hills rolling away behind them.",
    },
    experiences: ["rural-saloia"],
  },
];

/** The section heading, shared wherever the quotes render. */
export const testimonialsHeading = {
  eyebrow: { pt: "Quem já foi", en: "From our guests" } as Localized,
  title: {
    pt: "Palavras de quem viajou connosco",
    en: "In the words of those who travelled with us",
  } as Localized,
};

/**
 * The quotes that belong on one experience's page — usually none, which is the
 * point: an experience page shows social proof only from guests who were on
 * that experience.
 */
export function testimonialsFor(slug: string): readonly Testimonial[] {
  return testimonials.filter((entry) => entry.experiences.includes(slug));
}
