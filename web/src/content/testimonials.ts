import type { Localized } from "@/i18n/config";

/**
 * Real guest reviews, supplied by Diogo & Rita with the guests' OK to publish
 * (info PDF §2.5).
 *
 * The English is the guests' own words, excerpted — the full reviews run to
 * paragraphs — with spelling tidied and nothing added. The Portuguese is our
 * faithful translation, and the locale itself says so: a PT reader sees a PT
 * quote from a Canadian couple and understands.
 *
 * Photos exist for all three (`public/images/testimonials/`) and are not wired
 * here: they are wide group shots, not portraits, so they need a layout of
 * their own — that is `content-truth/testimonials-section`, which also takes
 * these quotes onto the experience pages.
 */
export type Testimonial = {
  /** First names only, as agreed with the guests. */
  names: string;
  /** Where they came from, in the reader's language. */
  origin: Localized;
  quote: Localized;
};

export const testimonials: readonly Testimonial[] = [
  {
    names: "Jacob & Danita",
    origin: { pt: "Canadá", en: "Canada" },
    quote: {
      pt: "Estamos casados há 41 anos e já visitámos 88 países — e mesmo assim ficámos radiantes como miúdos numa loja de doces. Parecia saído de um filme. Tornou a nossa viagem a Portugal verdadeiramente especial: uma experiência 10/10.",
      en: "We have been married 41 years and have visited 88 countries — and yet we were giddy like kids in a candy store. It felt as if it was out of a movie. This has made our trip to Portugal most special: a 10/10 experience.",
    },
  },
  {
    names: "Madeline & Elliot",
    origin: { pt: "Austrália", en: "Australia" },
    quote: {
      pt: "Que experiência única na vida! Os lugares que visitámos estavam fora dos roteiros — nunca os teríamos encontrado sozinhos. Acabámos com um piquenique, com os produtos mais incríveis e o cenário mais bonito. Foi o melhor dia que podíamos ter sonhado.",
      en: "What a once in a lifetime experience! The places we visited were off the beaten path and we would never have found them on our own. We finished with a picnic together, with the most incredible produce and the most picturesque backdrop. This was the best day we could have dreamed of.",
    },
  },
  {
    names: "Brian & Elizabeth",
    origin: { pt: "EUA", en: "USA" },
    quote: {
      pt: "Verdadeiramente único e inigualável. Explorámos os caminhos menos percorridos do campo de Sintra e vimos Portugal a uma luz diferente, fiel às suas tradições. Começámos a viagem como estranhos e acabámos como amigos.",
      en: "It was truly unique and one of a kind. We explored the unbeaten path of the Sintra countryside and saw Portugal in a different light, one that honoured its traditions. We started out this trip as strangers but ended as friends.",
    },
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
