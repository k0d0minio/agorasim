/**
 * The handoff format between the content pipeline and the website: one
 * reviewed markdown file per blog post.
 *
 * `workspaces/geo-content` writes its approved articles into
 * `web/src/content/generated/blog/<slug>.md`, and `scripts/load-blog-drafts.ts`
 * turns them into `blog_post_drafts` rows. This module is the contract between
 * those two halves — the only place that knows what the file looks like — and
 * it is deliberately a plain function over a string: no filesystem, no
 * database, no `server-only`, so the format has real tests.
 *
 * **The shape.** Front matter for everything scalar, then one section per
 * locale for the prose:
 *
 * ```
 * ---
 * slug: um-dia-perfeito-na-ericeira
 * date: 2026-07-14
 * tags: Ericeira, Roteiros
 * image: /images/rural-saloia/guests-under-olive-tree-hero.webp
 * imageAlt.pt: Fim de tarde sobre a costa da Ericeira
 * imageAlt.en: Late afternoon over the Ericeira coastline
 * title.pt: Um dia perfeito na Ericeira, longe das multidões
 * title.en: A perfect day in Ericeira, away from the crowds
 * excerpt.pt: Da primeira bica da manhã ao pôr do sol sobre o Atlântico.
 * excerpt.en: From the first morning espresso to sunset over the Atlantic.
 * ---
 *
 * ## pt
 *
 * Parágrafo um.
 *
 * Parágrafo dois.
 *
 * ## en
 *
 * Paragraph one.
 * ```
 *
 * Hand-rolled rather than a YAML dependency: the whole grammar is `key: value`
 * on one line, and a parser small enough to read is worth more here than one
 * that also handles anchors and block scalars nobody will write.
 *
 * **Both languages, always.** `t(value, locale)` has no fallback anywhere on
 * this site, so a post missing its English half would render blank for half the
 * visitors. Every localized field is required, and a file that is missing one
 * is refused with the field named — the loader reports and skips it rather than
 * writing half a post.
 */
import { locales, type Locale, type Localized } from "@/i18n/config";
import { isLegacyImagePath } from "@/lib/experience-images";

/** One parsed post, in the shape `blog_post_drafts` takes. */
export type ParsedBlogPost = {
  slug: string;
  title: Localized;
  excerpt: Localized;
  body: Localized<string[]>;
  tags: string[];
  heroImage: string | null;
  heroImageAlt: Localized | null;
  /** The article's own date, `YYYY-MM-DD`, or `null` if the file gave none. */
  dateModified: string | null;
};

export type ParseResult =
  | { ok: true; post: ParsedBlogPost }
  | { ok: false; errors: string[] };

/** `rural-saloia` — the same slug shape the rest of the site enforces. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A calendar date, as a date and not merely as ten characters. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Markup that would reach a reader literally.
 *
 * The article body is rendered as `<p>{paragraph}</p>` — plain text, by design:
 * a rich renderer is a much larger decision than this ticket, and one taken
 * badly is how a blog acquires an HTML injection. So the honest thing is to
 * refuse the constructs that would otherwise ship as visible `**` and `## ` on
 * the public page, and say so with the line, rather than quietly stripping them
 * and publishing prose the author did not write.
 */
const LITERAL_MARKUP: { test: RegExp; what: string }[] = [
  { test: /^#{1,6}\s/, what: "a heading" },
  { test: /^\s*(?:[-*+]|\d+\.)\s/, what: "a list" },
  { test: /^\s*>/, what: "a blockquote" },
  { test: /^\s*(?:```|~~~)/, what: "a code fence" },
  { test: /\*\*|__|(?<!\w)\*\S|`/, what: "inline emphasis or code" },
];

/** Split the `---` front matter off the top of the file. */
function splitFrontMatter(
  source: string,
): { frontMatter: string; body: string } | null {
  // Tolerate a BOM and a leading blank line — both survive a copy-paste.
  const text = source.replace(/^﻿/, "").replace(/^\s*\n/, "");
  if (!text.startsWith("---")) return null;

  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;

  const afterFence = text.indexOf("\n", end + 1);
  return {
    frontMatter: text.slice(text.indexOf("\n", 0) + 1, end),
    body: afterFence === -1 ? "" : text.slice(afterFence + 1),
  };
}

/**
 * Front matter as a map. Blank lines and `#` comments are skipped; a line with
 * no colon is reported rather than ignored, because a wrapped value is the
 * likeliest cause and silently dropping it loses a title.
 */
function parseFrontMatter(
  frontMatter: string,
  errors: string[],
): Map<string, string> {
  const fields = new Map<string, string>();

  frontMatter.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      errors.push(
        `front matter line ${index + 1} has no "key: value" — every field is one line ` +
          `("${truncate(trimmed)}")`,
      );
      return;
    }

    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (fields.has(key)) {
      errors.push(`front matter names "${key}" twice`);
      return;
    }
    fields.set(key, value);
  });

  return fields;
}

/**
 * The body split into its per-locale sections, keyed by locale.
 *
 * The delimiter is `## <locale>` on its own line. Anything before the first one
 * is prose with no language, which is a mistake worth naming rather than
 * attaching to whichever section happens to come first.
 */
function parseLocaleSections(
  body: string,
  errors: string[],
): Map<string, string> {
  const sections = new Map<string, string>();
  let current: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current !== null) sections.set(current, buffer.join("\n"));
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const heading = /^##\s+([A-Za-z-]+)\s*$/.exec(line.trim());
    if (heading) {
      flush();
      current = heading[1].toLowerCase();
      if (sections.has(current)) errors.push(`the body has two "## ${current}" sections`);
      continue;
    }
    if (current === null) {
      if (line.trim()) {
        errors.push(
          `the body starts before any "## pt" / "## en" heading ("${truncate(line.trim())}")`,
        );
        // Said once; the rest of the stray prose is the same mistake.
        current = "";
      }
      continue;
    }
    buffer.push(line);
  }
  flush();
  sections.delete("");

  return sections;
}

/** Paragraphs of one locale section: split on blank lines, markup refused. */
function paragraphsOf(section: string, locale: Locale, errors: string[]): string[] {
  const paragraphs = section
    .split(/\n\s*\n/)
    .map((part) => part.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);

  if (paragraphs.length === 0) {
    errors.push(`the "## ${locale}" section is empty`);
  }

  for (const paragraph of paragraphs) {
    const offender = LITERAL_MARKUP.find((rule) => rule.test.test(paragraph));
    if (offender) {
      errors.push(
        `"## ${locale}" uses ${offender.what} — the article renders as plain ` +
          `paragraphs, so it would reach readers verbatim ("${truncate(paragraph)}")`,
      );
    }
  }

  return paragraphs;
}

function truncate(value: string, max = 48): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/**
 * Read a `field.pt` / `field.en` pair out of the front matter, requiring both
 * halves — or neither, when `optional`, which is what an absent photograph
 * looks like.
 */
function localizedField(
  fields: Map<string, string>,
  key: string,
  errors: string[],
  { optional = false } = {},
): Localized | null {
  const values = locales.map((locale) => fields.get(`${key}.${locale}`)?.trim() ?? "");

  if (optional && values.every((value) => !value)) return null;

  const missing = locales.filter((_, i) => !values[i]);
  if (missing.length > 0) {
    const named = missing.map((locale) => `${key}.${locale}`).join(" and ");
    errors.push(`${named} ${missing.length === 1 ? "is" : "are"} missing`);
    return null;
  }

  return Object.fromEntries(
    locales.map((locale, i) => [locale, values[i]]),
  ) as Localized;
}

/**
 * Parse one `<slug>.md` file.
 *
 * `fallbackSlug` is the file's own name without its extension: a post that
 * forgets its `slug:` field still has one obvious correct answer, and making
 * the loader guess it here keeps the two from ever disagreeing.
 */
export function parseBlogPost(source: string, fallbackSlug: string): ParseResult {
  const errors: string[] = [];

  const split = splitFrontMatter(source);
  if (!split) {
    return {
      ok: false,
      errors: ["no front matter — the file must open with a `---` block"],
    };
  }

  const fields = parseFrontMatter(split.frontMatter, errors);

  const slug = (fields.get("slug") ?? fallbackSlug).trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    errors.push(`"${slug}" is not a usable address — lowercase words joined by hyphens`);
  }

  const title = localizedField(fields, "title", errors);
  const excerpt = localizedField(fields, "excerpt", errors);

  const rawDate = fields.get("date")?.trim() ?? "";
  let dateModified: string | null = null;
  if (rawDate) {
    // `Date.parse` alone accepts "2026-13-45" in some runtimes and shifts it;
    // the round-trip is what makes this a calendar check rather than a shape one.
    const parsed = new Date(`${rawDate}T12:00:00Z`);
    if (!DATE_RE.test(rawDate) || Number.isNaN(parsed.getTime())) {
      errors.push(`"date: ${rawDate}" is not a date — write it as 2026-07-14`);
    } else if (parsed.toISOString().slice(0, 10) !== rawDate) {
      errors.push(`"date: ${rawDate}" is not a day that exists`);
    } else {
      dateModified = rawDate;
    }
  }

  const heroImage = fields.get("image")?.trim() || null;
  if (heroImage && !isLegacyImagePath(heroImage)) {
    errors.push(
      `"image: ${heroImage}" is not a file in this repo — use a path under ` +
        "/images/, committed to web/public/",
    );
  }
  // Only meaningful alongside a photograph, and mandatory alongside one: an
  // undescribed hero image is the accessibility failure this field exists for.
  const heroImageAlt = heroImage
    ? localizedField(fields, "imageAlt", errors)
    : localizedField(fields, "imageAlt", errors, { optional: true });

  const tags = (fields.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const sections = parseLocaleSections(split.body, errors);
  for (const key of sections.keys()) {
    if (!(locales as readonly string[]).includes(key)) {
      errors.push(`"## ${key}" is not a language this site has (${locales.join(", ")})`);
    }
  }

  const body = Object.fromEntries(
    locales.map((locale) => {
      const section = sections.get(locale);
      if (section === undefined) {
        errors.push(`the body has no "## ${locale}" section`);
        return [locale, []];
      }
      return [locale, paragraphsOf(section, locale, errors)];
    }),
  ) as Localized<string[]>;

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    post: {
      slug,
      title: title!,
      excerpt: excerpt!,
      body,
      tags,
      heroImage,
      heroImageAlt,
      dateModified,
    },
  };
}
