import type { Localized } from "@/i18n/config";

export const site = {
  name: "Agorasim",
  domain: "https://agorasim.pt",
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
 * The four classics, with the real details Diogo & Rita gave (Aug 2026):
 * model, year, guest seats, the name each car answers to, and its story.
 * One source for the home strip, the weddings fleet and anywhere else a car
 * is introduced — the stories are theirs, lightly edited for the page.
 */
export type ClassicCar = {
  /** "Citroën 2CV" — the model, as the badge says it. */
  model: string;
  /** What the family actually calls her. */
  name: string;
  year: number;
  /** Guest seats — the driver is ours. */
  seats: number;
  story: Localized;
};

export const fleet: ClassicCar[] = [
  {
    model: "Citroën 2CV",
    name: "Josefina",
    year: 1986,
    seats: 3,
    story: {
      pt: "Um carro de família muito estimado, esquecido vinte anos na garagem do Diogo. A Josefina voltou à estrada com todo o carinho — como se sempre tivesse estado destinada a viajar de novo.",
      en: "A cherished family car, forgotten for twenty years in Diogo's garage. Josefina has been lovingly brought back to the road — as though she had always been destined to travel again.",
    },
  },
  {
    model: "Renault 4L",
    name: "Catrel",
    year: 1989,
    seats: 3,
    story: {
      pt: "Em tempos carro de família trabalhador, e ao serviço de uma oficina de baterias, este 4L ganhou uma vida nova: continua pronto para o trabalho, mas igualmente feliz a levar-nos a passear sem pressa.",
      en: "Once a hardworking family car, later serving a battery workshop, this 4L has been given a new lease of life — still ready for work, but equally happy taking us out for a leisurely drive.",
    },
  },
  {
    model: "Fiat 600",
    name: "Cerejinha",
    year: 1970,
    seats: 3,
    story: {
      pt: "Resgatado da sucata e restaurado ao mais ínfimo detalhe, é o carro mais antigo e mais requintado da coleção — uma pequena joia de elegância intemporal.",
      en: "Rescued from the scrap yard and restored down to the finest detail, this is the oldest and most refined car in the collection — a little jewel of timeless elegance.",
    },
  },
  {
    model: "Volkswagen T3",
    name: "Caravela",
    year: 1988,
    seats: 8,
    story: {
      pt: "Resgatada de uma escola de surf, marcada por anos de sal e ferrugem, a Caravela foi totalmente restaurada e navega agora as estradas como a nossa querida carrinha.",
      en: "Rescued from a surf school, weathered by years of salt and rust, Caravela has been completely restored and now sails the roads as our beloved little bus.",
    },
  },
];

/** Classic cars used for the tours — shown as a trust/atmosphere strip. */
export const classicCars = fleet.map(
  (car) => `${car.model} · ${car.year}`,
) as readonly string[];
