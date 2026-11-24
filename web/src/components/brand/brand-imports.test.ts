import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scenes, spot } from "@/content/brand";

/**
 * "The photos sell" (`.icm/docs/brand.md`), held in CI and not only in a
 * document. An illustration never goes on a selling page: an experience page,
 * a booking step (the confirmation is not a selling step) or the admin console.
 */
const srcDir = fileURLToPath(new URL("../../", import.meta.url));
const publicDir = fileURLToPath(new URL("../../../public/", import.meta.url));

/** An import of the brand scene or spot, by alias or by a relative path. */
const BRAND_ILLUSTRATION_IMPORT = /from\s+["'][^"']*components\/brand\/(scene|spot)["']/;

function isSellingFile(path: string): boolean {
  const p = path.split(sep).join("/");
  if (p.startsWith("app/[locale]/experiencias/")) return true;
  if (p.startsWith("app/[locale]/reservar/")) return !p.startsWith("app/[locale]/reservar/confirmacao/");
  return p.startsWith("app/admin/");
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return filesUnder(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("brand illustrations stay off the selling pages", () => {
  it("finds an import of the scene or the spot", () => {
    expect(BRAND_ILLUSTRATION_IMPORT.test('import { Scene } from "@/components/brand/scene";')).toBe(true);
    expect(BRAND_ILLUSTRATION_IMPORT.test("import { Spot } from '../../components/brand/spot';")).toBe(true);
    expect(BRAND_ILLUSTRATION_IMPORT.test('import { Hills } from "@/components/brand/hills";')).toBe(false);
  });

  it("knows which files are selling pages", () => {
    expect(isSellingFile("app/[locale]/experiencias/[slug]/page.tsx")).toBe(true);
    expect(isSellingFile("app/[locale]/reservar/page.tsx")).toBe(true);
    expect(isSellingFile("app/[locale]/reservar/confirmacao/page.tsx")).toBe(false);
    expect(isSellingFile("app/admin/page.tsx")).toBe(true);
    expect(isSellingFile("app/[locale]/sobre/page.tsx")).toBe(false);
  });

  it("no selling page imports the scene or the spot", () => {
    const offenders = filesUnder(join(srcDir, "app"))
      .map((full) => relative(srcDir, full))
      .filter(isSellingFile)
      .filter((path) => BRAND_ILLUSTRATION_IMPORT.test(readFileSync(join(srcDir, path), "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("brand scenes", () => {
  for (const [name, scene] of Object.entries(scenes)) {
    it(`${name}: a landscape file under 300 KB, with alt text in pt and en`, () => {
      const bytes = statSync(join(publicDir, scene.src.replace(/^\//, ""))).size;
      expect(bytes).toBeLessThan(300 * 1024);
      expect(scene.width).toBeGreaterThan(scene.height);
      expect(scene.alt.pt.trim()).not.toBe("");
      expect(scene.alt.en.trim()).not.toBe("");
    });
  }
});

describe("brand spot", () => {
  it("a file under 100 KB, 480 px wide for 240 px at 2×, with alt text in pt and en", () => {
    const bytes = statSync(join(publicDir, spot.src.replace(/^\//, ""))).size;
    expect(bytes).toBeLessThan(100 * 1024);
    expect(spot.width).toBe(480);
    expect(spot.alt.pt.trim()).not.toBe("");
    expect(spot.alt.en.trim()).not.toBe("");
  });

  it("the email hills band is a 1200 × 120 PNG", () => {
    const file = readFileSync(join(publicDir, "images/brand/email-header-hills.png"));
    // The PNG signature, then the IHDR width and height as big-endian integers.
    expect(file.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(file.readUInt32BE(16)).toBe(1200);
    expect(file.readUInt32BE(20)).toBe(120);
  });
});
