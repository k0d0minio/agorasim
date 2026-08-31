import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlogPostDraft } from "@/db/schema";
import { blogIsLive, getPublishedPost, listPublishedPosts } from "@/lib/blog-posts";

/**
 * The resolver between `blog_post_drafts` and the public blog.
 *
 * Two things it must never do, and both are here as tests rather than as
 * comments: take the site down when the database is unreachable (an empty blog
 * is the honest answer, and `next build` runs with no `DATABASE_URL` at all),
 * and render a photograph nobody wrote alt text for.
 *
 * The database is mocked at the `@/db` boundary — the query builder is a stub,
 * the schema is the real one, so `eq()`/`desc()` get real columns.
 */

const { table } = vi.hoisted(() => ({
  table: { rows: [] as unknown[], error: null as Error | null },
}));

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");

  const rows = () =>
    table.error ? Promise.reject(table.error) : Promise.resolve(table.rows);

  type Query = {
    from: () => Query;
    where: () => Query;
    orderBy: () => Promise<unknown[]>;
    limit: () => Promise<unknown[]>;
  };
  const query: Query = {
    from: () => query,
    where: () => query,
    orderBy: rows,
    limit: rows,
  };

  return { ...schema, db: { select: () => query } };
});

/** A published row, as the driver hands it back. */
function row(overrides: Partial<BlogPostDraft> = {}): BlogPostDraft {
  return {
    id: "0f2b1c62-1b3f-4f7a-9d5e-2c1a0b3d4e5f",
    slug: "um-dia-perfeito-na-ericeira",
    title: { pt: "Um dia perfeito na Ericeira", en: "A perfect day in Ericeira" },
    excerpt: { pt: "Da bica ao pôr do sol.", en: "From espresso to sunset." },
    body: {
      pt: ["Parágrafo um.", "Parágrafo dois."],
      en: ["Paragraph one.", "Paragraph two."],
    },
    tags: ["Ericeira"],
    heroImage: "/images/rural-saloia/guests-under-olive-tree-hero.webp",
    heroImageAlt: { pt: "A costa", en: "The coastline" },
    status: "published",
    publishedAt: new Date("2026-07-14T09:00:00Z"),
    dateModified: "2026-08-02",
    createdAt: new Date("2026-07-01T09:00:00Z"),
    updatedAt: new Date("2026-08-02T09:00:00Z"),
    ...overrides,
  } as BlogPostDraft;
}

beforeEach(() => {
  table.rows = [];
  table.error = null;
});

describe("listPublishedPosts", () => {
  it("maps a row onto what the pages render", async () => {
    table.rows = [row()];
    const [post] = await listPublishedPosts();

    expect(post).toMatchObject({
      slug: "um-dia-perfeito-na-ericeira",
      publishedOn: "2026-07-14",
      updatedOn: "2026-08-02",
      // Four words of Portuguese body rounds up to the floor of one minute.
      readingMinutes: 1,
    });
  });

  it("dates a post by when it went live, not by its last edit", async () => {
    // A typo fixed in March must not move a January article to the top of the
    // index, nor re-date it for a crawler.
    const post = (await withRows([row({ updatedAt: new Date("2027-03-01T00:00:00Z") })]))[0];
    expect(post.publishedOn).toBe("2026-07-14");
  });

  it("falls back to the publication date when the file carried none", async () => {
    const post = (await withRows([row({ dateModified: null })]))[0];
    expect(post.updatedOn).toBe("2026-07-14");
  });

  it("drops a photograph nobody described", async () => {
    // WCAG 2.2 AA (D14): the alternative to an undescribed hero image is no
    // hero image, not an unlabelled one.
    const post = (await withRows([row({ heroImageAlt: null })]))[0];
    expect(post.heroImage).toBeNull();
    expect(post.heroImageAlt).toBeNull();
  });

  it("renders no articles rather than failing when the database is unreachable", async () => {
    // This is what `next build` does: no DATABASE_URL, and the blog is empty.
    table.error = new Error("DATABASE_URL is not set");
    await expect(listPublishedPosts()).resolves.toEqual([]);
    await expect(getPublishedPost("um-dia-perfeito-na-ericeira")).resolves.toBeUndefined();
    await expect(blogIsLive()).resolves.toBe(false);
  });
});

describe("blogIsLive", () => {
  it("is false until something is published, and true after", async () => {
    table.rows = [];
    await expect(blogIsLive()).resolves.toBe(false);

    table.rows = [row()];
    await expect(blogIsLive()).resolves.toBe(true);
  });
});

async function withRows(rows: BlogPostDraft[]) {
  table.rows = rows;
  return listPublishedPosts();
}
