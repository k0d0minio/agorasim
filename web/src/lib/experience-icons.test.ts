import { describe, expect, it } from "vitest";

import {
  ENQUIRY_KIND_ICONS,
  EXPERIENCE_ICONS,
  EXPERIENCE_ICON_KEYS,
  FALLBACK_EXPERIENCE_ICON,
  experienceIcon,
  isExperienceIconKey,
} from "@/lib/experience-icons";
import { enquiryKindEnum } from "@/db/schema";
import { experiences } from "@/content/experiences";

/**
 * The icon vocabulary is stored as plain text in a database column that
 * operators edit, so the two things worth asserting are that a stored key
 * always resolves to *something* drawable, and that the shipped catalogue only
 * uses keys that exist.
 */
describe("experienceIcon", () => {
  it("resolves every key in the picker", () => {
    for (const key of EXPERIENCE_ICON_KEYS) {
      expect(experienceIcon(key).icon).toBe(EXPERIENCE_ICONS[key].icon);
    }
  });

  it("falls back rather than throwing on a key that is not one", () => {
    // A typo made in the editor, or a key removed from the map after rows were
    // saved with it. Neither is worth a blank page.
    expect(experienceIcon("carr")).toBe(EXPERIENCE_ICONS[FALLBACK_EXPERIENCE_ICON]);
    expect(experienceIcon(null)).toBe(EXPERIENCE_ICONS[FALLBACK_EXPERIENCE_ICON]);
    expect(experienceIcon(undefined)).toBe(EXPERIENCE_ICONS[FALLBACK_EXPERIENCE_ICON]);
  });

  it("gives every icon a label — the label is what a screen reader gets", () => {
    for (const key of EXPERIENCE_ICON_KEYS) {
      expect(EXPERIENCE_ICONS[key].label.length).toBeGreaterThan(0);
    }
  });
});

describe("isExperienceIconKey", () => {
  it("accepts the keys in the map and nothing else", () => {
    expect(isExperienceIconKey("wine")).toBe(true);
    expect(isExperienceIconKey("Wine")).toBe(false);
    expect(isExperienceIconKey("")).toBe(false);
  });
});

describe("the shipped catalogue", () => {
  it("only names icons the picker offers", () => {
    for (const experience of experiences) {
      expect(isExperienceIconKey(experience.icon)).toBe(true);
    }
  });
});

describe("enquiry kinds", () => {
  it("has an icon for every kind the database allows", () => {
    // The `Record` type already forces this at compile time; the test is here
    // because the enum is the thing that grows, and a missing icon should fail
    // as a test rather than as a blank chip in a list.
    for (const kind of enquiryKindEnum.enumValues) {
      expect(ENQUIRY_KIND_ICONS[kind]).toBeDefined();
    }
  });
});
