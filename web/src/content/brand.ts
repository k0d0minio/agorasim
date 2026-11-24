import type { Localized } from "@/i18n/config";

/**
 * The illustrated scenes of the brand (`.icm/docs/brand.md`, "Illustrations").
 *
 * Each file is a 4:3 landscape crop of one of the designer's portrait scenes,
 * under 300 KB. The raw files are not in this repository (decision D47). When
 * the designer sends landscape versions, replace the files and keep the names:
 * no page changes.
 *
 * A scene complements the photos. It never replaces one, and it never goes on a
 * selling page: `components/brand/brand-imports.test.ts` checks that.
 */
export type SceneName = "sunset" | "night" | "day";

export type BrandScene = {
  src: string;
  width: number;
  height: number;
  alt: Localized;
  /** CSS object-position of the subject, used when a frame crops the file. */
  focal: string;
};

export const scenes: Record<SceneName, BrandScene> = {
  sunset: {
    src: "/images/brand/scene-sunset-2cv.webp",
    width: 2400,
    height: 1800,
    alt: {
      pt: "Ilustração de um Citroën 2CV clássico numa colina, à frente do sol ao fim do dia",
      en: "Illustration of a classic Citroën 2CV on a hill, in front of the setting sun",
    },
    focal: "55% 60%",
  },
  night: {
    src: "/images/brand/scene-night-van.webp",
    width: 1091,
    height: 818,
    alt: {
      pt: "Ilustração de uma carrinha Volkswagen T3 verde com um cão no tejadilho, entre colinas à noite",
      en: "Illustration of a green Volkswagen T3 van with a dog on its roof, among the hills at night",
    },
    focal: "40% 50%",
  },
  day: {
    src: "/images/brand/scene-day-hills.webp",
    width: 1091,
    height: 818,
    alt: {
      pt: "Ilustração de colinas em camadas, em tons de areia e barro, sob um céu turquesa",
      en: "Illustration of layered hills in sand and clay tones under a turquoise sky",
    },
    focal: "50% 50%",
  },
};
