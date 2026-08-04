import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { EMPTY_EXPERIENCE, ExperienceForm } from "@/components/admin/experience-form";

// The form posts to a server action; nothing here is worth prerendering.
export const dynamic = "force-dynamic";

/** Add an experience or add-on to the catalogue. */
export default async function NewExperiencePage() {
  await requireAdmin();

  return (
    <AdminShell>
      <ExperienceForm values={EMPTY_EXPERIENCE} />
    </AdminShell>
  );
}
