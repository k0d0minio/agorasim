import type { Localized } from "@/i18n/config";
import { canonicalOrigin } from "@/lib/site-origin";

export const site = {
  name: "Agorasim",
  /**
   * The canonical address — what every `<link rel="canonical">`, hreflang,
   * sitemap URL, `robots.txt` host and JSON-LD `@id` says. Resolved once, at
   * module load, from `NEXT_PUBLIC_SITE_URL`, falling back to
   * `https://agorasim.pt`; see `lib/site-origin.ts` for why it never follows
   * the Vercel preview URL.
   */
  domain: canonicalOrigin(),
  email: "info@agorasim.pt",
  region: "Saloia (Sintra · Mafra · Ericeira), Portugal",
  geo: { latitude: 38.8029, longitude: -9.3817 }, // Mafra area
  contacts: [
    { name: "Diogo", phone: "+351926210707", phoneDisplay: "+351 926 210 707" },
    { name: "Rita", phone: "+351919272077", phoneDisplay: "+351 919 272 077" },
  ],
  social: {
    instagram: "https://www.instagram.com/agorasim.pt",
    facebook: "https://www.facebook.com/agorasim.pt",
  },
} as const;

export const taglines: Localized = {
  pt: "Experiências rurais Saloias em carros clássicos",
  en: "Rural Saloia experiences in classic cars",
};

/**
 * The four classics, as Diogo & Rita describe them (info PDF §2.2): the model
 * and year on the badge, the name each car answers to, and its story in their
 * own words, lightly edited for the page.
 *
 * This is the *biography* of the fleet, not its capacity. How many cars of
 * each class exist and how many guests each carries is the booking engine's
 * business and lives in `lib/fleet.ts`; `id` is the join between the two, so a
 * car is described once here and counted once there.
 */
export type ClassicCar = {
  /** Matches the vehicle `id` in `lib/fleet.ts`. */
  id: string;
  /** The model, as the badge says it. */
  model: string;
  /** What the family actually calls her. */
  name: string;
  year: number;
  story: Localized;
};

/**
 * Shown as a trust/atmosphere strip on the home page and as the fleet picker on
 * `/casamentos`, where the stories are read in full.
 */
export const classicCars: readonly ClassicCar[] = [
  {
    id: "citroen-2cv",
    model: "Citroën 2CV",
    name: "Josefina",
    year: 1986,
    story: {
      pt: "A Josefina foi trazida de volta à vida com todo o carinho e regressou à estrada, como se sempre tivesse estado destinada a viajar de novo.",
      en: "Josefina has been lovingly brought back to life and returned to the road, as though she had always been destined to travel again.",
    },
  },
  {
    id: "renault-4l",
    model: "Renault 4L",
    name: "Catrel",
    year: 1989,
    story: {
      pt: "Em tempos um carro de família trabalhador, mais tarde ao serviço de uma oficina de baterias, este 4L ganhou uma vida nova: continua pronto para o trabalho, mas igualmente feliz a levar-nos a passear sem pressa.",
      en: "Once a hardworking family car, later used by a battery workshop, this 4L has been given a new lease of life — still ready for work, but now equally happy taking us out for a leisurely drive.",
    },
  },
  {
    id: "fiat-600",
    model: "Fiat 600",
    name: "Cerejinha",
    year: 1970,
    story: {
      pt: "Resgatado da sucata e restaurado ao mais ínfimo detalhe, é o carro mais antigo e mais requintado da coleção — uma pequena joia de elegância intemporal.",
      en: "Rescued from the scrap yard and restored down to the finest detail, this is the oldest and most refined car in the collection — a little jewel of timeless elegance.",
    },
  },
  {
    id: "vw-t3",
    model: "Volkswagen T3",
    name: "Caravela",
    year: 1988,
    story: {
      pt: "Resgatada de uma escola de surf, marcada por anos de sal e ferrugem, a Caravela foi totalmente restaurada e navega agora as estradas como a nossa querida carrinha.",
      en: "Rescued from a surf school, weathered by years of salt and rust, Caravela has been completely restored and now sails the roads as our beloved little bus.",
    },
  },
];
