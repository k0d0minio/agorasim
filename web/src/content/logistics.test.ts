import { describe, expect, it } from "vitest";

import { experiences } from "@/content/experiences";
import {
  departureLabel,
  departureTimeFollowsByEmail,
  departureLabels,
  meetingPoints,
} from "@/content/logistics";
import { locales } from "@/i18n/config";

/**
 * Departures are the one fact a guest cannot be sold without.
 *
 * A slot label is read on the booking chips, in the confirmation email and in
 * the team's notification, so a wrong one is wrong in three places at once —
 * and the failure that matters is not a typo but an invented hour. Óbidos has
 * none: Diogo & Rita have not given the times, and until they do the label has
 * to say where the real one comes from rather than borrow the countryside
 * tour's.
 */
describe("departure labels", () => {
  it("names the countryside tour's confirmed hours", () => {
    expect(departureLabel("rural-saloia", "morning").pt).toContain("10h00");
    expect(departureLabel("rural-saloia", "afternoon").en).toContain("14:00");
    expect(departureTimeFollowsByEmail("rural-saloia")).toBe(false);
  });

  it("invents no hour for Óbidos, and says where the real one comes from", () => {
    for (const slot of ["morning", "afternoon"] as const) {
      const label = departureLabel("obidos-medieval-villages", slot);
      expect(label.pt).toContain("hora exata confirmada por email");
      expect(label.en).toContain("exact time confirmed by email");
      // The countryside tour's hours are not this tour's hours.
      for (const locale of locales) {
        expect(label[locale]).not.toMatch(/\d{1,2}[h:]\d{2}/);
      }
    }
    expect(departureTimeFollowsByEmail("obidos-medieval-villages")).toBe(true);
  });

  it("falls back to a generic label rather than another tour's time", () => {
    const label = departureLabel("a-tour-nobody-has-mapped", "morning");
    expect(label).toEqual({ pt: "Manhã", en: "Morning" });
    expect(departureTimeFollowsByEmail("a-tour-nobody-has-mapped")).toBe(false);
  });

  it("only describes tours that exist", () => {
    const slugs = experiences.map((entry) => entry.slug);
    for (const slug of [...Object.keys(departureLabels), ...Object.keys(meetingPoints)]) {
      expect(slugs).toContain(slug);
    }
  });
});
