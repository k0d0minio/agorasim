import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { classicCars } from "./site";
import { about } from "./pages";
import { weddingsContent } from "./weddings";
import { locales } from "@/i18n/config";
import { FLEET } from "@/lib/fleet";

/**
 * The car biographies in `site.ts` and the capacity fleet in `lib/fleet.ts` are
 * joined by `id`, and `/casamentos` joins its photo tiles to the biographies the
 * same way — a tile whose `id` matches nothing renders as nothing, silently. So
 * the join is asserted here rather than discovered by a car disappearing off the
 * weddings page.
 */
describe("the classic cars", () => {
  it("names a vehicle the booking engine knows", () => {
    const fleetIds = FLEET.map((vehicle) => vehicle.id);
    for (const car of classicCars) {
      expect(fleetIds).toContain(car.id);
    }
  });

  it("has one biography per wedding fleet tile", () => {
    const carIds = classicCars.map((car) => car.id);
    for (const tile of weddingsContent.fleet.cars) {
      expect(carIds).toContain(tile.id);
    }
    expect(weddingsContent.fleet.cars).toHaveLength(classicCars.length);
  });

  it("has one biography and one photo per About page tile", () => {
    const publicDir = fileURLToPath(new URL("../../public", import.meta.url));
    const carIds = classicCars.map((car) => car.id);
    for (const tile of about.fleet.cars) {
      expect(carIds).toContain(tile.id);
      expect(tile.image.startsWith("/images/fleet/")).toBe(true);
      expect(existsSync(`${publicDir}${tile.image}`)).toBe(true);
      for (const locale of locales) {
        expect(tile.alt[locale].trim().length).toBeGreaterThan(0);
      }
    }
    expect(about.fleet.cars).toHaveLength(classicCars.length);
  });
});
