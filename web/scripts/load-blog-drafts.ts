/**
 * Load reviewed blog markdown into `blog_post_drafts`.
 *
 *   cd web
 *   pnpm blog:load            # load every file
 *   pnpm blog:load --dry-run  # parse and report, write nothing
 *   pnpm blog:load um-dia-perfeito-na-ericeira   # just these slugs
 *
 * The ingestion half of the publish path (D11). Jamie runs it after reviewing a
 * `workspaces/geo-content` batch into `src/content/generated/blog/`; Diogo &
 * Rita then publish from `/admin/blog`. Nothing about it is automatic, and that
 * is the design: the pipeline writes files a human has read, this puts them in
 * front of the client, and the client decides what the website says.
 *
 * **Two invariants it holds.**
 *
 * 1. *It never publishes.* A new row arrives as `draft`; an existing row keeps
 *    whatever status it has. Re-loading a batch that contains a live post
 *    updates the prose in place — it does not take the post off the site, and
 *    it does not put a withdrawn one back on.
 * 2. *It never writes half a post.* A file that fails to parse is reported with
 *    every problem it has and skipped; the rest of the batch still loads. A
 *    post missing its English half would render blank for half the site's
 *    visitors, so it does not get in.
 *
 * Run via `tsx` (see the `blog:load` script) for the reasons `seed-owner.ts`
 * spells out: the `@/…` path aliases, and `--conditions=react-server` so the
 * `server-only` marker on `@/db` resolves to its empty build.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { config } from "dotenv";
import { eq } from "drizzle-orm";

import { db, blogPostDrafts, type BlogPostDraft } from "@/db";
import { parseBlogPost, type ParsedBlogPost } from "@/lib/blog-markdown";

config({ path: ".env.local" });
config({ path: ".env" });

/** Where the pipeline's Layer 4 handoff lands. */
const BLOG_DIR = path.join(process.cwd(), "src", "content", "generated", "blog");

/**
 * Markdown in this directory that is documentation rather than an article: the
 * README describing the format, and anything an author has parked behind a
 * leading underscore. Named rather than inferred from whether the file parses —
 * a real article that fails to parse must be *reported*, not quietly ignored,
 * which is exactly what a "skip whatever looks wrong" rule would do to it.
 */
function isNotAnArticle(name: string): boolean {
  return name === "README.md" || name.startsWith("_") || name.startsWith(".");
}

type Outcome = "created" | "updated" | "unchanged" | "checked" | "skipped";

/**
 * The columns the file owns. Everything else on the row — `status`,
 * `published_at` — belongs to the studio, and a load must never touch it.
 *
 * Typed as the fields rather than as `ParsedBlogPost` so a stored row satisfies
 * it too: the same projection is what the "has anything actually changed?"
 * comparison runs on both sides.
 */
type FileOwnedColumns = Pick<
  ParsedBlogPost,
  "title" | "excerpt" | "body" | "tags" | "heroImage" | "heroImageAlt" | "dateModified"
>;

function columnsOf(post: FileOwnedColumns): FileOwnedColumns {
  return {
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    tags: post.tags,
    heroImage: post.heroImage,
    heroImageAlt: post.heroImageAlt,
    dateModified: post.dateModified,
  };
}

/**
 * A value as JSON with every object's keys in a fixed order.
 *
 * Needed because the two sides are not written by the same hand: the parser
 * builds `{ pt, en }` in locale order, and Postgres hands `jsonb` back with its
 * own key order (`{ en, pt }` — shortest first, then bytewise). A plain
 * `JSON.stringify` comparison would call every row changed, every run, and the
 * "unchanged" count would never be anything but zero.
 */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Whether the stored row already says exactly what the file says. */
function matches(row: BlogPostDraft, post: ParsedBlogPost): boolean {
  return stableJson(columnsOf(row)) === stableJson(columnsOf(post));
}

async function loadOne(post: ParsedBlogPost, mode: Mode): Promise<Outcome> {
  // A dry run with no database is still worth having — it is how a batch is
  // checked before it is anywhere near one — so it parses and stops here
  // rather than failing on a connection it was never going to make.
  if (mode === "check") return "checked";

  const [existing] = await db
    .select()
    .from(blogPostDrafts)
    .where(eq(blogPostDrafts.slug, post.slug))
    .limit(1);

  if (existing && matches(existing, post)) return "unchanged";
  if (mode === "dry-run") return existing ? "updated" : "created";

  if (existing) {
    /*
     * `status` and `published_at` are deliberately absent from the update: they
     * are the client's, set by the tap in the studio, and a content refresh
     * must not reach through the pipeline and change what the website is
     * currently saying.
     */
    await db
      .update(blogPostDrafts)
      .set({ ...columnsOf(post), updatedAt: new Date() })
      .where(eq(blogPostDrafts.id, existing.id));
    return "updated";
  }

  await db.insert(blogPostDrafts).values({ slug: post.slug, ...columnsOf(post) });
  return "created";
}

/**
 * What the run is allowed to do.
 *
 * `check` is a dry run with no database in reach: it validates the batch and
 * says nothing about rows, because it cannot see any. `dry-run` is the same
 * intent with a connection, so it can also say which files would land as new.
 */
type Mode = "write" | "dry-run" | "check";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlySlugs = new Set(args.filter((arg) => !arg.startsWith("-")));

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — nothing to load into.");
  }

  const mode: Mode = !dryRun ? "write" : process.env.DATABASE_URL ? "dry-run" : "check";

  let files: string[];
  try {
    files = (await readdir(BLOG_DIR))
      .filter((name) => name.endsWith(".md") && !isNotAnArticle(name))
      .sort();
  } catch {
    throw new Error(
      `No ${path.relative(process.cwd(), BLOG_DIR)} directory — publish a batch from ` +
        "workspaces/geo-content first.",
    );
  }

  const chosen = files.filter(
    (name) => onlySlugs.size === 0 || onlySlugs.has(path.basename(name, ".md")),
  );

  if (chosen.length === 0) {
    console.info("[blog] nothing to load.");
    return;
  }

  const tally: Record<Outcome, number> = {
    created: 0,
    updated: 0,
    unchanged: 0,
    checked: 0,
    skipped: 0,
  };

  for (const name of chosen) {
    const source = await readFile(path.join(BLOG_DIR, name), "utf8");
    const parsed = parseBlogPost(source, path.basename(name, ".md"));

    if (!parsed.ok) {
      tally.skipped += 1;
      // Every problem at once: the point of a loader run is to come back with
      // one list of fixes, not to find the next one on the next run.
      console.error(`[blog] ${name} was not loaded:`);
      for (const problem of parsed.errors) console.error(`         · ${problem}`);
      continue;
    }

    const outcome = await loadOne(parsed.post, mode);
    tally[outcome] += 1;
    console.info(`[blog] ${name} → ${parsed.post.slug} (${outcome})`);
  }

  const counts =
    mode === "check"
      ? `${tally.checked} readable, ${tally.skipped} with problems`
      : `${tally.created} new, ${tally.updated} updated, ` +
        `${tally.unchanged} unchanged, ${tally.skipped} skipped`;

  console.info(
    `[blog] ${dryRun ? "checked" : "loaded"} ${chosen.length} file(s): ${counts}.`,
  );

  if (mode === "write" && tally.created + tally.updated > 0) {
    console.info("[blog] new posts are drafts. Publish them at /admin/blog.");
  } else if (dryRun) {
    console.info(
      mode === "check"
        ? "[blog] no DATABASE_URL — the files were read, nothing was compared or written."
        : "[blog] dry run — nothing was written.",
    );
  }

  // A batch with a broken file in it must not look like a clean run in CI or in
  // a terminal scrollback.
  if (tally.skipped > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
