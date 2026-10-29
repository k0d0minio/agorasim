import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { listCatalogue } from "@/lib/experience-catalogue";
import { AdminShell } from "@/components/admin/admin-shell";
import { EMPTY_EXPERIENCE, ExperienceForm } from "@/components/admin/experience-form";

// The form posts to a server action; nothing here is worth prerendering.
export const dynamic = "force-dynamic";

/** Add an experience or add-on to the catalogue. */
export default async function NewExperiencePage() {
  await requireAdmin();

  const tours = (await listCatalogue())
    .filter((entry) => entry.kind === "signature")
    .map((entry) => ({ slug: entry.slug, title: t(entry.title, "pt") }));

  return (
    <AdminShell>
      <ExperienceForm values={EMPTY_EXPERIENCE} tours={tours} />
    </AdminShell>
  );
}
