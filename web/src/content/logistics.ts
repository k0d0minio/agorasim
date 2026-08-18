import type { Localized } from "@/i18n/config";

/**
 * Where each tour meets and when it leaves — Diogo & Rita's own answers
 * (agorasim-info PDF, Aug 2026, §2.6).
 *
 * Kept as content rather than catalogue columns on purpose: the meeting point
 * appears in FAQs, on the booking page and in the confirmation email, and it
 * is a fact about the *route*, which is not something the catalogue editor
 * needs to be able to change from a phone. A tour this map does not name gets
 * no meeting-point line anywhere — never a wrong one.
 */
export type MeetingPoint = {
  /** Street address as the team gives it out. */
  address: string;
  /** The pin they send guests — a maps.app.goo.gl link. */
  mapsUrl: string;
};

export const meetingPoints: Record<string, MeetingPoint> = {
  "rural-saloia": {
    address: "Av. Mário Firmino Miguel, Sintra (Portela de Sintra)",
    mapsUrl: "https://maps.app.goo.gl/zufzHo8QpmspvzqC9",
  },
  "obidos-medieval-villages": {
    address: "Alameda Cardeal Cerejeira, Lisboa",
    mapsUrl: "https://maps.app.goo.gl/ucMojM5V7eGhcvn4A",
  },
};

/**
 * What each departure is called for a given tour.
 *
 * The countryside tour has confirmed clock times (10:00 / 14:00). Óbidos runs
 * morning and afternoon too, but Diogo & Rita have not put a number on them —
 * so the labels say "morning departure" rather than inventing one, and the
 * exact time travels in the confirmation conversation.
 */
export const departureLabels: Record<
  string,
  Record<"morning" | "afternoon", Localized>
> = {
  "rural-saloia": {
    morning: { pt: "Manhã · 10h00", en: "Morning · 10:00" },
    afternoon: { pt: "Tarde · 14h00", en: "Afternoon · 14:00" },
  },
  "obidos-medieval-villages": {
    morning: { pt: "Partida da manhã", en: "Morning departure" },
    afternoon: { pt: "Partida da tarde", en: "Afternoon departure" },
  },
};

/** The label for one departure, with a safe generic fallback per slot. */
export function departureLabel(
  experienceSlug: string,
  slot: "morning" | "afternoon" | (string & {}),
): Localized {
  const forTour = departureLabels[experienceSlug];
  if (forTour && (slot === "morning" || slot === "afternoon")) return forTour[slot];
  return slot === "afternoon"
    ? { pt: "Tarde", en: "Afternoon" }
    : { pt: "Manhã", en: "Morning" };
}
