import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, experienceCatalogue } from "@/db";
import { priceInputValue } from "@/lib/money";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { FALLBACK_EXPERIENCE_ICON, isExperienceIconKey } from "@/lib/experience-icons";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteExperienceDialog } from "@/components/admin/experience-row-actions";
import {
  ExperienceForm,
  type ExperienceFormValues,
} from "@/components/admin/experience-form";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** Edit one catalogue entry. */
export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireAdmin();
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [row] = await db
    .select()
    .from(experienceCatalogue)
    .where(eq(experienceCatalogue.id, id))
    .limit(1);

  if (!row) notFound();

  const values: ExperienceFormValues = {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    icon: isExperienceIconKey(row.icon) ? row.icon : FALLBACK_EXPERIENCE_ICON,
    image: row.image,
    price: priceInputValue(row.priceCents),
    active: row.active,
    sortOrder: row.sortOrder,
    title: row.title,
    tagline: row.tagline,
    summary: row.summary,
    duration: row.duration,
    imageAlt: row.imageAlt,
    // Back to how the textareas take them: paragraphs separated by a blank
    // line, highlights one per line.
    description: {
      pt: row.description.pt.join("\n\n"),
      en: row.description.en.join("\n\n"),
    },
    highlights: {
      pt: row.highlights.pt.join("\n"),
      en: row.highlights.en.join("\n"),
    },
    faqs: row.faqs,
  };

  return (
    <AdminShell>
      {/* The way back to the catalogue is the app bar's up arrow — derived
          from the route by the shell, not drawn per page. */}
      <ExperienceForm values={values} />

      {/* Deleting is owner-only and almost never the right move — hiding keeps
          old enquiries readable. The action refuses anyone else regardless. */}
      {viewer.role === "owner" ? (
        <div className="mt-8 border-t pt-6">
          <p className="mb-2 text-sm text-muted-foreground">
            Removing this entry for good leaves enquiries that chose it pointing at a name
            nothing explains. Hiding it from the website is reversible; this is not.
          </p>
          <DeleteExperienceDialog id={row.id} name={t(row.title, "en")} />
        </div>
      ) : null}
    </AdminShell>
  );
}
