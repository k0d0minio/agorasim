"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, blogPostDrafts } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  blogPostSchema,
  formValues,
  setBlogPostPublishedSchema,
  type BlogPostField,
} from "@/lib/form-schemas";

/**
 * The Blog studio's two writes: correct the shop window, and decide what the
 * website says.
 *
 * Same three habits as the rest of the admin (see the note at the top of
 * `app/admin/experiences/actions.ts`): authorize with `requireAdmin()` first,
 * audit through the single writer in `lib/audit.ts`, and report failures to the
 * operator rather than swallowing them. And the same fourth one the catalogue
 * needs: **revalidate the public site**, because these pages are cached and an
 * article that only appeared in the admin would be a publish button that
 * publishes nothing.
 *
 * What is *not* here is any way to write the body. The prose comes from the
 * reviewed markdown in `src/content/generated/blog/` via `pnpm blog:load`; the
 * studio decides whether and how it is presented, not what it says.
 */

/**
 * The blog changes the index, every article, and the sitemap — and the nav
 * lifts out of "em construção" on the first publish, which is the layout.
 */
function revalidatePublicSite(): void {
  revalidatePath("/", "layout");
}

export type BlogPostFormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<BlogPostField, string>>;
};

/** Correct the title and excerpt of one article. */
export async function saveBlogPost(
  _prevState: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  const actor = await requireAdmin();

  const parsed = blogPostSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const first = (key: BlogPostField) =>
      (fieldErrors as Record<string, string[] | undefined>)[key]?.[0];
    return {
      fieldErrors: {
        titlePt: first("titlePt"),
        titleEn: first("titleEn"),
        excerptPt: first("excerptPt"),
        excerptEn: first("excerptEn"),
      },
    };
  }

  const { id, titlePt, titleEn, excerptPt, excerptEn } = parsed.data;

  try {
    const [updated] = await db
      .update(blogPostDrafts)
      .set({
        title: { pt: titlePt, en: titleEn },
        excerpt: { pt: excerptPt, en: excerptEn },
        updatedAt: new Date(),
      })
      .where(eq(blogPostDrafts.id, id))
      .returning({ slug: blogPostDrafts.slug, status: blogPostDrafts.status });

    if (!updated) return { error: "Esse artigo já não existe." };

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: "blog_post.updated",
      entityType: "blog_post",
      entityId: id,
      // Public copy, not personal data — named in full, so the log answers
      // "who changed that headline?" without a second lookup.
      after: { slug: updated.slug, title: { pt: titlePt, en: titleEn } },
    });

    // Only a live article is on a cached page; a draft has nothing to bust.
    if (updated.status === "published") revalidatePublicSite();

    return {
      ok: true,
      message:
        updated.status === "published"
          ? "Artigo atualizado — já está assim no site."
          : "Artigo atualizado.",
    };
  } catch (err) {
    console.error("[admin] failed to save blog post", err);
    return { error: "Não foi possível guardar — a alteração não ficou registada." };
  }
}

export type BlogPostActionState = { ok?: boolean; error?: string; message?: string };

/**
 * Put an article on the site, or take it off again.
 *
 * `published_at` is written here and cleared on the way out, rather than left
 * to stand as a memory of the first outing: it is the article's date on the
 * card and its `datePublished` in the structured data, and a post withdrawn for
 * a month and corrected is honestly dated by the day it came back.
 *
 * Unpublishing returns the row to `draft` — the loader's own resting state — so
 * a withdrawn article sits in the review queue where it can be seen, rather
 * than in a fourth state nothing lists.
 */
export async function setBlogPostPublished(
  _prevState: BlogPostActionState,
  formData: FormData,
): Promise<BlogPostActionState> {
  const actor = await requireAdmin();

  const parsed = setBlogPostPublishedSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Não foi possível encontrar esse artigo." };

  const { id, published } = parsed.data;

  try {
    const [updated] = await db
      .update(blogPostDrafts)
      .set({
        status: published ? "published" : "draft",
        publishedAt: published ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(blogPostDrafts.id, id))
      .returning({ slug: blogPostDrafts.slug });

    if (!updated) return { error: "Esse artigo já não existe." };

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: published ? "blog_post.published" : "blog_post.unpublished",
      entityType: "blog_post",
      entityId: id,
      after: { slug: updated.slug, published },
    });

    revalidatePublicSite();

    return {
      ok: true,
      message: published
        ? `${updated.slug} está no site, em português e em inglês.`
        : `${updated.slug} saiu do site e voltou aos rascunhos.`,
    };
  } catch (err) {
    console.error("[admin] failed to change blog post visibility", err);
    return { error: "Não foi possível guardar — a alteração não ficou registada." };
  }
}
