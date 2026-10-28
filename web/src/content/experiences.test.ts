import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getExperience } from "@/content/experiences";
import { faqJsonLd } from "@/lib/jsonld";
import { FLEET, MAX_PARTY_ONLINE } from "@/lib/fleet";

/**
 * "Quantas pessoas podem participar?" states each car's seats (feedback round
 * 1, Diogo, 2026-10-12). The figures are the booking engine's, so a car that
 * changes in `FLEET` and not here fails this file rather than the guest.
 *
 * The live row is written by `drizzle/0037_faq_seats_per_car.sql`, and the
 * fallback below is what renders when the table cannot be read. Both carry one
 * answer, so the migration is read here too.
 */

// The fleet ids as the answer names them. "VW T3" in the admin legend is the
// Volkswagen T3 to a guest. The touring vehicle is Óbidos's and is out of it.
const NAMED = {
  "citroen-2cv": "Citroën 2CV",
  "renault-4l": "Renault 4L",
  "fiat-600": "Fiat 600",
  "vw-t3": "Volkswagen T3",
} as const;

const answer = getExperience("rural-saloia")?.faqs.find(
  (faq) => faq.question.pt === "Quantas pessoas podem participar?",
)?.answer;

describe("the seats FAQ", () => {
  it("exists on Rural Saloia, the tour the home page shows", () => {
    expect(answer).toBeDefined();
  });

  it("names every classic car with the seats FLEET gives it, in both languages", () => {
    const classics = FLEET.filter((car) => car.class !== "touring");
    expect(classics.map((car) => car.id).sort()).toEqual(Object.keys(NAMED).sort());
    for (const car of classics) {
      const name = NAMED[car.id as keyof typeof NAMED];
      // The name, then the first number after it, is that car's seat count.
      expect(answer?.pt).toMatch(new RegExp(`${name}\\D*${car.seats}\\b`));
      expect(answer?.en).toMatch(new RegExp(`${name}\\D*${car.seats}\\b`));
    }
  });

  it("sends groups above the online maximum to the team", () => {
    expect(answer?.pt).toContain(`mais de ${MAX_PARTY_ONLINE} pessoas, fale connosco`);
    expect(answer?.en).toContain(`more than ${MAX_PARTY_ONLINE}, contact us`);
  });

  it("is the answer the FAQPage JSON-LD publishes", () => {
    const faqs = getExperience("rural-saloia")!.faqs;
    expect(JSON.stringify(faqJsonLd(faqs, "pt"))).toContain(answer!.pt);
    expect(JSON.stringify(faqJsonLd(faqs, "en"))).toContain(answer!.en);
  });

  it("is the answer the migration writes into the live row", () => {
    const sql = readFileSync(
      fileURLToPath(new URL("../../drizzle/0037_faq_seats_per_car.sql", import.meta.url)),
      "utf8",
    );
    expect(sql).toContain(JSON.stringify({ pt: answer!.pt, en: answer!.en }));
  });
});
