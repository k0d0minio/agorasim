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
 * morning and afternoon too, but Diogo & Rita have not put a number on them
 * (open-questions pack item 8, unanswered) — so its labels invent no time and
 * say instead where the real one comes from. The label is the string every
 * surface renders a departure through: the booking chips, the guest's
 * confirmation and the team's notification. Saying it here says it everywhere,
 * and nobody can pay for a departure whose time was never stated.
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
    morning: {
      pt: "Partida da manhã — hora exata confirmada por email",
      en: "Morning departure — exact time confirmed by email",
    },
    afternoon: {
      pt: "Partida da tarde — hora exata confirmada por email",
      en: "Afternoon departure — exact time confirmed by email",
    },
  },
};

/**
 * Tours whose departures still have no clock time.
 *
 * The one thing a guest cannot be sent away from a paid checkout without is
 * when to turn up. Where the labels above name an hour, the confirmation says
 * it and is done; where they do not, this set makes the confirmation email
 * promise the time in writing instead of referring to one it never states.
 *
 * The day Diogo & Rita answer with hours: put them in `departureLabels` above
 * and delete the slug from here. Nothing else in the codebase has to move.
 */
const toursAwaitingDepartureTimes = new Set(["obidos-medieval-villages"]);

/** Does this tour still owe the guest a clock time after they have paid? */
export function departureTimeFollowsByEmail(experienceSlug: string): boolean {
  return toursAwaitingDepartureTimes.has(experienceSlug);
}

/** The label for one departure, with a safe generic fallback per slot. */
export function departureLabel(experienceSlug: string, slot: string): Localized {
  const key: "morning" | "afternoon" | null =
    slot === "morning" ? "morning" : slot === "afternoon" ? "afternoon" : null;
  const forTour = departureLabels[experienceSlug];
  if (forTour && key) return forTour[key];
  return key === "afternoon"
    ? { pt: "Tarde", en: "Afternoon" }
    : { pt: "Manhã", en: "Morning" };
}
