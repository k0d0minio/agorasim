/**
 * Reading the experience catalogue.
 *
 * The offer — Rural Saloia and its add-ons — used to be a TypeScript array, so
 * "we've added a new tasting" meant a pull request. It is now a database table
 * Diogo & Rita edit at `/admin/experiences`, and everything that renders an
 * experience reads it through here.
 *
 * **The fallback is the point.** Every read is wrapped: if the database is
 * unreachable, or the table has not been seeded yet, the site renders the array
 * in `content/experiences.ts` instead of failing. That is what lets the public
 * pages stay statically rendered without a live `DATABASE_URL` during `next
 * build` — the build gets the shipped catalogue, and the deployed site
 * revalidates onto the live one (see the `revalidate` export on the pages that
 * call this).
 *
 * Server-only: it imports `@/db`.
 */
import "server-only";

import { asc, eq } from "drizzle-orm";

import { db, experienceCatalogue, type ExperienceRow } from "@/db";
import {
  experiences as shippedExperiences,
  type Experience,
  type Faq,
} from "@/content/experiences";
import { FALLBACK_EXPERIENCE_ICON, isExperienceIconKey } from "@/lib/experience-icons";
import { captureError } from "@/lib/observability";
import { parseExperiencePricing, type ExperiencePricing } from "@/lib/pricing";

/** A catalogue entry with the columns only the admin and the checkout care about. */
export type CatalogueEntry = Experience & {
  /** Archived entries keep their slug resolvable but leave the website. */
  active: boolean;
  sortOrder: number;
  /** Always present here, unlike on the shipped array where it is optional. */
  priceCents: number | null;
  /**
   * Always present here too, and always readable: a stored price list is
   * validated on the way out of the database, and anything malformed arrives
   * as `null` — unpriced, which the checkout already stands down for.
   */
  pricing: ExperiencePricing | null;
};

/**
 * Slugs whose stored price list could not be read — said once each, for the
 * same reason {@link warnFallbackOnce} says its piece once.
 *
 * Worth saying at all: an unreadable price list is indistinguishable from an
 * unpriced one on the website (both offer the enquiry form), and silently
 * losing the ability to take money is exactly the failure this resolver is
 * supposed to make loud.
 */
const warnedAboutPricing = new Set<string>();

function pricingOf(row: ExperienceRow): ExperiencePricing | null {
  const pricing = parseExperiencePricing(row.pricing);
  if (pricing === null && row.pricing !== null && !warnedAboutPricing.has(row.slug)) {
    warnedAboutPricing.add(row.slug);
    console.warn(
      `[catalogue] "${row.slug}" has a price list this build cannot read; ` +
        "treating it as unpriced — the enquiry form takes over.",
    );
  }
  return pricing;
}

/** Map a database row onto the shape the site already renders. */
function toEntry(row: ExperienceRow): CatalogueEntry {
  return {
    slug: row.slug,
    kind: row.kind,
    // The column is plain text; an unknown key gets the fallback rather than
    // taking a page down over a typo made in the editor.
    icon: isExperienceIconKey(row.icon) ? row.icon : FALLBACK_EXPERIENCE_ICON,
    title: row.title,
    tagline: row.tagline,
    summary: row.summary,
    description: row.description,
    duration: row.duration,
    highlights: row.highlights,
    image: row.image,
    imageAlt: row.imageAlt,
    faqs: row.faqs as Faq[],
    priceCents: row.priceCents,
    // The column is `jsonb`: Drizzle types it, nothing enforces it. Validate,
    // and let a malformed list read as unpriced rather than reaching the
    // checkout arithmetic — without it, no database-backed entry is sellable
    // at all, which is the bug this line exists to prevent recurring.
    pricing: pricingOf(row),
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

/**
 * Say a read fell back — once per process in the log, and every time to the
 * error tracker when it is an outage rather than the design.
 *
 * A build without `DATABASE_URL` renders every locale of every page through
 * this, and a stack trace per render buries whatever else the build had to say.
 * The condition is the same one every time, so saying it once is saying it.
 *
 * The capture is gated on `DATABASE_URL` being set, because the two reasons to
 * land here are opposites. No variable is a build or a test with no database:
 * the fallback is exactly what this module promises, and there is nobody to
 * alert. A variable that could not be reached is Neon being down under a live
 * deployment, and the result — an hour of the site quietly selling last
 * deploy's price list, or refusing to sell at all — is the outage the ticket
 * that added this capture was about. (The SDK also stands down during `next
 * build` on its own, so the gate is a statement of intent more than a guard.)
 */
let warnedAboutFallback = false;

function reportFallback(read: "list" | "entry", detail: string, err: unknown): void {
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      `[catalogue] falling back to the shipped experiences (${detail}): ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (process.env.DATABASE_URL) {
    captureError(err, {
      area: "catalogue",
      tags: { read, fallback: "shipped-experiences" },
      extra: { detail },
    });
  }
}

/**
 * The shipped array, in the same shape — signature first, then the add-ons.
 *
 * It carries the real `pricing`, deliberately (see `content/experiences.ts`):
 * an unreachable database should cost the site its *newest* price list, not
 * the ability to price at all. The superseded `priceCents` stays `null`
 * throughout — nothing prices a sale from one flat number any more.
 */
function shippedCatalogue(): CatalogueEntry[] {
  return shippedExperiences.map((experience, index) => ({
    ...experience,
    priceCents: experience.priceCents ?? null,
    pricing: experience.pricing ?? null,
    active: true,
    sortOrder: index,
  }));
}

/**
 * Every catalogue entry, archived ones included, in display order.
 *
 * Falls back to the shipped array when the table is empty (a database that has
 * had the migration but not the seed) or unreachable.
 */
export async function listCatalogue(): Promise<CatalogueEntry[]> {
  try {
    const rows = await db
      .select()
      .from(experienceCatalogue)
      .orderBy(asc(experienceCatalogue.sortOrder), asc(experienceCatalogue.slug));

    if (rows.length === 0) return shippedCatalogue();
    return rows.map(toEntry);
  } catch (err) {
    reportFallback("list", "listing the catalogue", err);
    return shippedCatalogue();
  }
}

/** The entries the website shows: active only, in display order. */
export async function listExperiences(): Promise<Experience[]> {
  return (await listCatalogue()).filter((entry) => entry.active);
}

/**
 * One entry by slug, archived included — a lead that references a retired
 * add-on must still be able to name it.
 */
export async function getCatalogueEntry(slug: string): Promise<CatalogueEntry | undefined> {
  try {
    const [row] = await db
      .select()
      .from(experienceCatalogue)
      .where(eq(experienceCatalogue.slug, slug))
      .limit(1);

    if (row) return toEntry(row);
    // No row: either the table is unseeded or the slug is genuinely unknown.
    // Ask the shipped array before giving up, for the unseeded case.
    return shippedCatalogue().find((entry) => entry.slug === slug);
  } catch (err) {
    reportFallback("entry", `reading "${slug}"`, err);
    return shippedCatalogue().find((entry) => entry.slug === slug);
  }
}

/** The main tour. There is one; if the catalogue has none, the first entry stands in. */
export function signatureOf<T extends Experience>(entries: T[]): T | undefined {
  return entries.find((entry) => entry.kind === "signature") ?? entries[0];
}

/** The add-ons, in catalogue order. */
export function complementsOf<T extends Experience>(entries: T[]): T[] {
  return entries.filter((entry) => entry.kind === "complement");
}

/**
 * The admin's slug → entry lookup, for lists that name an experience a lead
 * chose. Built once per render and passed down, rather than resolved per row.
 */
export function catalogueIndex(entries: CatalogueEntry[]): Map<string, CatalogueEntry> {
  return new Map(entries.map((entry) => [entry.slug, entry]));
}
