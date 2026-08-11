"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { asc, eq, ne, and } from "drizzle-orm";

import { db, experienceCatalogue } from "@/db";
import { requireAdmin, requireOwner } from "@/lib/admin-auth";
import { recordAudit, recordAuditOrWarn } from "@/lib/audit";
import { isExperienceBlobUrl } from "@/lib/experience-images";
import {
  deleteExperienceSchema,
  experienceSchema,
  formValues,
  moveExperienceSchema,
  setExperienceActiveSchema,
  type ExperienceField,
} from "@/lib/form-schemas";

/**
 * Editing the offer.
 *
 * These are the only writes to the `experiences` table. Three things they all
 * do, for the same reasons the rest of the admin does them (see the note at the
 * top of `app/admin/actions.ts`): authorize with `requireAdmin()`/
 * `requireOwner()` at the top, audit through the single writer in `lib/audit.ts`,
 * and report failures to the operator rather than swallowing them.
 *
 * One thing they do that no other action needs: **revalidate the public site.**
 * The admin pages are `force-dynamic` and have no cache to bust, but the
 * catalogue is what the *website* renders, and those pages are cached. An edit
 * that only showed up in the admin would be the worst of both worlds — Rita
 * would see her new add-on, guests would not.
 */

/** Every public route renders some part of the catalogue, directly or in a nav. */
function revalidatePublicSite(): void {
  revalidatePath("/", "layout");
}

/**
 * Best-effort removal of a blob an entry no longer points at — a replaced
 * photo, or the image of a deleted row. Storage that only ever grows is a
 * bill for photos nobody can see.
 *
 * Best-effort is the whole contract: the row change has already succeeded, and
 * failing the operator's save over an orphaned blob would trade a cent of
 * storage for a lost edit. Failures are logged and left for a future sweep.
 *
 * Legacy `/images/*` paths are committed files, not blobs — `del()` must never
 * see one, which is what the predicate is for.
 */
async function deleteImageBlob(image: string): Promise<void> {
  if (!isExperienceBlobUrl(image)) return;
  try {
    await del(image);
  } catch (err) {
    console.warn(`[admin] couldn't delete the replaced image blob ${image}`, err);
  }
}

export type ExperienceFormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** The saved row's slug, so the page can confirm which entry was written. */
  slug?: string;
  fieldErrors?: Partial<Record<ExperienceField, string>>;
};

/** First error per field, in the shape the form renders inline. */
function fieldErrorsOf(error: z.ZodError): ExperienceFormState["fieldErrors"] {
  const { fieldErrors } = z.flattenError(error);
  const first = (key: ExperienceField) =>
    (fieldErrors as Record<string, string[] | undefined>)[key]?.[0];

  return {
    slug: first("slug"),
    image: first("image"),
    titlePt: first("titlePt"),
    titleEn: first("titleEn"),
    taglinePt: first("taglinePt"),
    taglineEn: first("taglineEn"),
    summaryPt: first("summaryPt"),
    summaryEn: first("summaryEn"),
    durationPt: first("durationPt"),
    durationEn: first("durationEn"),
    imageAltPt: first("imageAltPt"),
    imageAltEn: first("imageAltEn"),
  };
}

/**
 * Create or update one catalogue entry — the whole editor in a single action.
 *
 * Create and update are one action rather than two because the form is one form:
 * splitting them would mean two schemas, two validators and two places for the
 * localized-pair rule to drift. Which it is comes from whether the row's `id`
 * came along.
 *
 * A duplicate slug is reported against the field rather than thrown: `slug` is
 * unique in the database (leads reference it), and "that one is taken" is
 * ordinary form feedback, not an error page.
 */
export async function saveExperience(
  _prevState: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const actor = await requireAdmin();

  const parsed = experienceSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { id, ...entry } = parsed.data;

  // Checked here so the operator gets an inline message; the unique index is
  // what actually guarantees it.
  const [clash] = await db
    .select({ id: experienceCatalogue.id })
    .from(experienceCatalogue)
    .where(
      id
        ? and(eq(experienceCatalogue.slug, entry.slug), ne(experienceCatalogue.id, id))
        : eq(experienceCatalogue.slug, entry.slug),
    )
    .limit(1);

  if (clash) {
    return { fieldErrors: { slug: "Another experience already uses that address." } };
  }

  // The image the row held before this save, so a replaced upload can be
  // cleaned up once the write lands — `returning()` only reports post-update
  // values, so it has to be read up front.
  let previousImage: string | null = null;
  if (id) {
    const [existing] = await db
      .select({ image: experienceCatalogue.image })
      .from(experienceCatalogue)
      .where(eq(experienceCatalogue.id, id))
      .limit(1);
    previousImage = existing?.image ?? null;
  }

  try {
    if (id) {
      const [updated] = await db
        .update(experienceCatalogue)
        .set({ ...entry, updatedAt: new Date() })
        .where(eq(experienceCatalogue.id, id))
        .returning({ id: experienceCatalogue.id });

      if (!updated) return { error: "That experience no longer exists." };
    } else {
      await db.insert(experienceCatalogue).values(entry);
    }
  } catch (err) {
    console.error("[admin] failed to save experience", err);
    return { error: "Couldn't save — the change was not stored." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: id ? "experience.updated" : "experience.created",
    entityType: "experience",
    entityId: id ?? null,
    // The catalogue is public copy, not personal data — the entry is named in
    // full so the log answers "who renamed Manzwine?" without a second lookup.
    after: {
      slug: entry.slug,
      kind: entry.kind,
      active: entry.active,
      // Money changed by whom, and to what — the one field on this table an
      // operator will be asked about after the fact.
      priceCents: entry.priceCents,
    },
  });

  revalidatePublicSite();

  // Only after the save succeeded: a replaced photo's blob has nothing
  // pointing at it any more.
  if (previousImage && previousImage !== entry.image) {
    await deleteImageBlob(previousImage);
  }

  return {
    ok: true,
    slug: entry.slug,
    message: id ? "Experience updated." : "Experience added.",
  };
}

export type ExperienceActionState = { ok?: boolean; error?: string; message?: string };

/**
 * Archive or restore an entry.
 *
 * Archiving is the delete an operator should reach for: leads reference
 * experiences by slug as plain text, so a removed row turns "Manzwine" on last
 * month's enquiry into a dangling slug. Archived entries leave the website and
 * stay resolvable everywhere else.
 */
export async function setExperienceActive(
  _prevState: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const actor = await requireAdmin();

  const parsed = setExperienceActiveSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't find that experience." };

  const { id, active } = parsed.data;

  try {
    const [updated] = await db
      .update(experienceCatalogue)
      .set({ active, updatedAt: new Date() })
      .where(eq(experienceCatalogue.id, id))
      .returning({ slug: experienceCatalogue.slug });

    if (!updated) return { error: "That experience no longer exists." };

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: active ? "experience.restored" : "experience.archived",
      entityType: "experience",
      entityId: id,
      after: { slug: updated.slug, active },
    });

    revalidatePublicSite();

    return {
      ok: true,
      message: active
        ? `${updated.slug} is back on the website.`
        : `${updated.slug} is archived and no longer shown to guests.`,
    };
  } catch (err) {
    console.error("[admin] failed to change experience visibility", err);
    return { error: "Couldn't save — the change was not stored." };
  }
}

/**
 * Move an entry one place up or down.
 *
 * The order is what guests see, so it needs to be editable without a
 * drag-and-drop surface that has no touch story. Two rows swap their
 * `sort_order`; nothing is renumbered, so no other entry moves.
 */
export async function moveExperience(
  _prevState: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const actor = await requireAdmin();

  const parsed = moveExperienceSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't move that experience." };

  const { id, direction } = parsed.data;

  try {
    const rows = await db
      .select({
        id: experienceCatalogue.id,
        slug: experienceCatalogue.slug,
        sortOrder: experienceCatalogue.sortOrder,
      })
      .from(experienceCatalogue)
      .orderBy(asc(experienceCatalogue.sortOrder), asc(experienceCatalogue.slug));

    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { error: "That experience no longer exists." };

    const neighbourIndex = direction === "up" ? index - 1 : index + 1;
    const neighbour = rows[neighbourIndex];
    // Already at the end. Not an error — the button is simply a no-op there.
    if (!neighbour) return { ok: true };

    const current = rows[index];
    /*
     * Two rows that were seeded with the same `sort_order` would swap to no
     * effect. Ordering breaks ties on slug, so give the moving row a value that
     * definitely lands on the correct side of its neighbour.
     */
    const currentTarget =
      neighbour.sortOrder === current.sortOrder
        ? current.sortOrder + (direction === "up" ? -1 : 1)
        : neighbour.sortOrder;

    await db.batch([
      db
        .update(experienceCatalogue)
        .set({ sortOrder: currentTarget, updatedAt: new Date() })
        .where(eq(experienceCatalogue.id, current.id)),
      db
        .update(experienceCatalogue)
        .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
        .where(eq(experienceCatalogue.id, neighbour.id)),
    ]);

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: "experience.reordered",
      entityType: "experience",
      entityId: current.id,
      after: { slug: current.slug, direction, swappedWith: neighbour.slug },
    });

    revalidatePublicSite();

    return { ok: true };
  } catch (err) {
    console.error("[admin] failed to reorder the catalogue", err);
    return { error: "Couldn't save the new order." };
  }
}

/**
 * Delete an entry outright. Owner-only, behind the same typed confirmation as
 * an erasure, because it is the one catalogue action that cannot be undone and
 * that leaves old leads pointing at a slug nothing explains.
 *
 * The audit entry is written first and with `recordAudit`, which throws: same
 * rule as erasing a guest record — if the trail cannot record it, it does not
 * happen.
 */
export async function deleteExperience(
  _prevState: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const actor = await requireOwner();

  const parsed = deleteExperienceSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Type DELETE to confirm." };

  const [entry] = await db
    .select({
      id: experienceCatalogue.id,
      slug: experienceCatalogue.slug,
      image: experienceCatalogue.image,
    })
    .from(experienceCatalogue)
    .where(eq(experienceCatalogue.id, parsed.data.id))
    .limit(1);

  if (!entry) return { error: "That experience no longer exists." };

  try {
    await recordAudit({
      actorUserId: actor.id,
      action: "experience.deleted",
      entityType: "experience",
      entityId: entry.id,
      before: { slug: entry.slug },
    });
  } catch (err) {
    console.error("[admin] refused to delete — could not write the audit entry", err);
    return { error: "Couldn't record the deletion, so nothing was deleted. Try again." };
  }

  try {
    await db.delete(experienceCatalogue).where(eq(experienceCatalogue.id, entry.id));
  } catch (err) {
    console.error("[admin] failed to delete experience", err);
    return { error: "Couldn't delete that experience." };
  }

  revalidatePublicSite();

  // The row is gone, so its uploaded photo is unreachable — clean it up.
  await deleteImageBlob(entry.image);

  return { ok: true, message: `${entry.slug} deleted.` };
}
