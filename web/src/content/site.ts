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

/** Classic cars used for the tours — shown as a trust/atmosphere strip. */
export const classicCars = [
  "Citroën 2CV",
  "Renault 4L",
  "Fiat 600",
  "Volkswagen T3",
] as const;
