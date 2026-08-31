/**
 * The admin's visual shorthand for what a lead actually booked.
 *
 * The Sales screens used to spell everything out — "Rural Saloia + Tasco
 * Galapito, Manzwine" in a cell, per row, on a phone. At a glance that reads as
 * a wall of text, and the one thing an operator wants from a list ("is this the
 * wine one or the pottery one?") is the hardest thing to get out of it. Each
 * catalogue entry therefore carries an icon key, and the lists draw icons with
 * the names as their accessible labels.
 *
 * Two vocabularies live here, both closed on purpose:
 *
 * - {@link EXPERIENCE_ICONS} — what an experience *is*. Chosen per catalogue row
 *   from `/admin/experiences`, which is why the set is a fixed picker rather
 *   than a free-text lucide name: an operator typing `CarFrront` should not be
 *   able to produce a row that renders nothing.
 * - {@link ENQUIRY_KIND_ICONS} — what kind of job the enquiry is (tour, wedding,
 *   event), which is the split the board leads with.
 *
 * Client-safe: no database, no `server-only`. The icon picker in the catalogue
 * editor is a client component and imports the same map the tables render from.
 */
import type { ComponentType } from "react";
import {
  Amphora,
  Camera,
  CarFront,
  Coffee,
  Croissant,
  Gift,
  Hammer,
  Heart,
  Landmark,
  MapPin,
  Music,
  PartyPopper,
  Route,
  Sailboat,
  Sandwich,
  Sparkles,
  Sunset,
  TreePine,
  UtensilsCrossed,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";

export type IconComponent = ComponentType<{ className?: string }>;

export type IconChoice = {
  /** What this icon means, used as the icon's accessible label in pickers. */
  label: string;
  icon: LucideIcon;
};

/**
 * The icons a catalogue entry can wear. Keys are stored in
 * `experiences.icon`; keep them lowercase and descriptive of the *thing*, not
 * of the drawing ("wine", not "glass").
 *
 * Adding one is a one-line change here and it appears in the picker.
 */
export const EXPERIENCE_ICONS = {
  car: { label: "Carro clássico", icon: CarFront },
  route: { label: "Rota e itinerário", icon: Route },
  meal: { label: "Refeição à mesa", icon: UtensilsCrossed },
  picnic: { label: "Piquenique e petiscos", icon: Sandwich },
  bakery: { label: "Padaria e doces", icon: Croissant },
  coffee: { label: "Paragem para café", icon: Coffee },
  wine: { label: "Prova de vinhos", icon: Wine },
  vineyard: { label: "Visita a uma vinha", icon: Wheat },
  pottery: { label: "Olaria e artesanato", icon: Amphora },
  workshop: { label: "Oficina prática", icon: Hammer },
  heritage: { label: "Palácio e património", icon: Landmark },
  coast: { label: "Costa e mar", icon: Sailboat },
  nature: { label: "Natureza e campo", icon: TreePine },
  viewpoint: { label: "Miradouro", icon: MapPin },
  sunset: { label: "Pôr do sol", icon: Sunset },
  photo: { label: "Paragem para fotografias", icon: Camera },
  music: { label: "Música e folclore", icon: Music },
  wedding: { label: "Casamento", icon: Heart },
  gift: { label: "Experiência para oferecer", icon: Gift },
  sparkles: { label: "Algo especial", icon: Sparkles },
} as const satisfies Record<string, IconChoice>;

export type ExperienceIconKey = keyof typeof EXPERIENCE_ICONS;

/** Icon keys in picker order — read off the map, so it cannot fall behind. */
export const EXPERIENCE_ICON_KEYS = Object.keys(EXPERIENCE_ICONS) as ExperienceIconKey[];

/** The default for a catalogue row whose icon was never chosen. */
export const FALLBACK_EXPERIENCE_ICON: ExperienceIconKey = "sparkles";

export function isExperienceIconKey(value: string): value is ExperienceIconKey {
  return value in EXPERIENCE_ICONS;
}

/**
 * The icon for a stored key. Unknown keys fall back rather than throwing — the
 * column is plain text, and a catalogue row is not worth a blank page.
 */
export function experienceIcon(key: string | null | undefined): IconChoice {
  return key && isExperienceIconKey(key)
    ? EXPERIENCE_ICONS[key]
    : EXPERIENCE_ICONS[FALLBACK_EXPERIENCE_ICON];
}

/**
 * What kind of job a lead is about. Mirrors `enquiryKindEnum` — a `Record` keyed
 * on the union, so adding a kind to the database without giving it an icon stops
 * the build.
 */
export const ENQUIRY_KIND_ICONS: Record<
  "tour" | "wedding" | "event",
  { label: string; icon: LucideIcon }
> = {
  tour: { label: "Passeio", icon: CarFront },
  wedding: { label: "Casamento", icon: Heart },
  event: { label: "Evento", icon: PartyPopper },
};
