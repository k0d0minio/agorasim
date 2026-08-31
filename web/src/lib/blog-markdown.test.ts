import { describe, expect, it } from "vitest";

import { parseBlogPost } from "@/lib/blog-markdown";

/**
 * The pipeline handoff format.
 *
 * These tests are the specification the `workspaces/geo-content` blog batch is
 * written against, so they read as examples of the file rather than as unit
 * tests of the splitter: a change here is a change to what an author may write.
 *
 * The refusals matter as much as the happy path. A post that reaches the
 * database missing its English half renders blank for half the site's visitors
 * — `t()` has no fallback — and one carrying `**markdown**` ships the asterisks
 * to readers, because the article renders as plain paragraphs.
 */

const FILE = `---
slug: um-dia-perfeito-na-ericeira
date: 2026-07-14
tags: Ericeira, Roteiros
image: /images/rural-saloia/guests-under-olive-tree-hero.webp
imageAlt.pt: Fim de tarde sobre a costa da Ericeira
imageAlt.en: Late afternoon over the Ericeira coastline
title.pt: Um dia perfeito na Ericeira, longe das multidões
title.en: A perfect day in Ericeira, away from the crowds
excerpt.pt: Da primeira bica da manhã ao pôr do sol sobre o Atlântico.
excerpt.en: From the first morning espresso to sunset over the Atlantic.
---

## pt

A Ericeira acorda devagar.

Ao meio da manhã, o segredo é caminhar
para sul pelos passadiços.

## en

Ericeira wakes up slowly.

Mid-morning, the secret is to walk south.
`;

/** The parse, or a failure loud enough to read in the assertion message. */
function post(source: string, slug = "from-the-filename") {
  const result = parseBlogPost(source, slug);
  if (!result.ok) throw new Error(`expected a parse, got: ${result.errors.join("; ")}`);
  return result.post;
}

function errors(source: string, slug = "from-the-filename"): string[] {
  const result = parseBlogPost(source, slug);
  if (result.ok) throw new Error("expected the file to be refused");
  return result.errors;
}

describe("parseBlogPost", () => {
  it("reads a complete post into the shape the table takes", () => {
    expect(post(FILE)).toEqual({
      slug: "um-dia-perfeito-na-ericeira",
      title: {
        pt: "Um dia perfeito na Ericeira, longe das multidões",
        en: "A perfect day in Ericeira, away from the crowds",
      },
      excerpt: {
        pt: "Da primeira bica da manhã ao pôr do sol sobre o Atlântico.",
        en: "From the first morning espresso to sunset over the Atlantic.",
      },
      body: {
        // A paragraph wrapped across source lines is one paragraph — authors
        // wrap at 80 columns and readers must not see the wrap.
        pt: [
          "A Ericeira acorda devagar.",
          "Ao meio da manhã, o segredo é caminhar para sul pelos passadiços.",
        ],
        en: ["Ericeira wakes up slowly.", "Mid-morning, the secret is to walk south."],
      },
      tags: ["Ericeira", "Roteiros"],
      heroImage: "/images/rural-saloia/guests-under-olive-tree-hero.webp",
      heroImageAlt: {
        pt: "Fim de tarde sobre a costa da Ericeira",
        en: "Late afternoon over the Ericeira coastline",
      },
      dateModified: "2026-07-14",
    });
  });

  it("takes the slug from the filename when the file does not name one", () => {
    const withoutSlug = FILE.replace("slug: um-dia-perfeito-na-ericeira\n", "");
    expect(post(withoutSlug, "das-vinhas-a-mafra").slug).toBe("das-vinhas-a-mafra");
  });

  it("allows a post with no photograph, and no alt text either", () => {
    const withoutImage = FILE.split("\n")
      .filter((line) => !line.startsWith("image"))
      .join("\n");
    const parsed = post(withoutImage);
    expect(parsed.heroImage).toBeNull();
    expect(parsed.heroImageAlt).toBeNull();
  });

  it("refuses a photograph nobody described", () => {
    const undescribed = FILE.split("\n")
      .filter((line) => !line.startsWith("imageAlt"))
      .join("\n");
    expect(errors(undescribed)).toEqual([
      expect.stringContaining("imageAlt.pt and imageAlt.en are missing"),
    ]);
  });

  it("refuses a post that is only half translated", () => {
    const halfTranslated = FILE.split("\n")
      .filter((line) => !line.startsWith("title.en"))
      .join("\n");
    expect(errors(halfTranslated)).toEqual([expect.stringContaining("title.en is missing")]);
  });

  it("refuses a body with a language section missing", () => {
    const [portugueseHalf] = FILE.split("## en");
    expect(errors(portugueseHalf)).toEqual([
      expect.stringContaining('no "## en" section'),
    ]);
  });

  it("refuses markdown that would reach the reader verbatim", () => {
    const marked = FILE.replace("Ericeira wakes up slowly.", "Ericeira wakes up **slowly**.");
    expect(errors(marked)).toEqual([
      expect.stringContaining("inline emphasis or code"),
    ]);

    const headed = FILE.replace("Ericeira wakes up slowly.", "### Morning");
    expect(errors(headed)).toEqual([expect.stringContaining("a heading")]);

    const listed = FILE.replace("Ericeira wakes up slowly.", "- a bullet");
    expect(errors(listed)).toEqual([expect.stringContaining("a list")]);
  });

  it("refuses a date that is not a day", () => {
    expect(errors(FILE.replace("2026-07-14", "2026-02-31"))).toEqual([
      expect.stringContaining("is not a day that exists"),
    ]);
    expect(errors(FILE.replace("2026-07-14", "14 July 2026"))).toEqual([
      expect.stringContaining("is not a date"),
    ]);
  });

  it("refuses an image that is not a file in this repo", () => {
    const remote = FILE.replace(
      "/images/rural-saloia/guests-under-olive-tree-hero.webp",
      "https://images.example.com/ericeira.jpg",
    );
    expect(errors(remote)).toEqual([
      expect.stringContaining("is not a file in this repo"),
    ]);
  });

  it("refuses a file with no front matter at all", () => {
    expect(errors("# Um dia perfeito\n\nTexto.")).toEqual([
      expect.stringContaining("no front matter"),
    ]);
  });

  it("names prose that landed before any language heading", () => {
    const stray = FILE.replace("\n## pt\n", "\nTexto sem língua.\n\n## pt\n");
    expect(errors(stray)).toEqual([
      expect.stringContaining("starts before any"),
    ]);
  });

  it("reports every problem at once, rather than one per run", () => {
    const broken = `---
slug: nao serve
title.pt: Só português
excerpt.pt: Só português
---

## pt

Texto.
`;
    // Four separate fixes, all findable from one load: the address, both
    // missing halves, and the absent English section.
    expect(errors(broken)).toHaveLength(4);
  });
});
