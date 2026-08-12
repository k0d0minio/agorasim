import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db, experienceCatalogue } from "@/db";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { experienceKindMeta } from "@/lib/admin-format";
import { formatPrice } from "@/lib/money";
import { experienceIcon } from "@/lib/experience-icons";
import { listCatalogue } from "@/lib/experience-catalogue";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  MoveExperienceButtons,
  ToggleExperienceButton,
} from "@/components/admin/experience-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The catalogue — the experiences and add-ons the business sells.
 *
 * This is the screen that makes the offer the team's to change. Before it, a new
 * add-on or a corrected duration was a code change: Rita would ask, and the
 * website would say something out of date until someone shipped. Every field the
 * site renders is editable here, in both languages, and the icons chosen here
 * are what the Sales board and table draw.
 *
 * The rows come from the database. When the table has not been seeded — a fresh
 * environment — the list falls back to the catalogue that shipped with the code
 * and says so, rather than claiming the business sells nothing.
 */
export default async function AdminExperiencesPage() {
  await requireAdmin();

  const catalogue = await listCatalogue();

  // The fallback has no database rows behind it, so nothing on it is editable.
  // Ask the table directly rather than inferring it from the resolver.
  const stored = await db
    .select({ id: experienceCatalogue.id, slug: experienceCatalogue.slug })
    .from(experienceCatalogue)
    .orderBy(asc(experienceCatalogue.sortOrder), asc(experienceCatalogue.slug))
    .catch(() => []);

  const idBySlug = new Map(stored.map((row) => [row.slug, row.id]));
  const seeded = stored.length > 0;

  return (
    <AdminShell
      // The page's one primary action rides in the app bar (spec §6 N3), so it
      // never scrolls away and the list below starts with the list.
      action={
        <Button asChild>
          <Link href="/admin/experiences/new">
            <Plus className="size-4" />
            Add
          </Link>
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {catalogue.length} {catalogue.length === 1 ? "experience" : "experiences"} ·{" "}
        {catalogue.filter((entry) => entry.active).length} shown on the website
      </p>

      {!seeded ? (
        <div className="mb-4 rounded-xl border border-accent-foreground/20 bg-accent/50 p-4 text-sm">
          <p className="font-semibold text-accent-foreground">Showing the shipped catalogue</p>
          <p className="text-accent-foreground/80">
            The database has no experiences yet, so the website is rendering the copy that
            came with the code. Run the catalogue migration
            (<code>drizzle/0008_seed_experience_catalogue.sql</code>) and these become editable.
          </p>
        </div>
      ) : null}

      <Card className="divide-y p-0">
        {catalogue.map((entry, index) => {
          const id = idBySlug.get(entry.slug);
          const name = t(entry.title, "en");
          const Icon = experienceIcon(entry.icon).icon;
          const kind = experienceKindMeta[entry.kind];

          return (
            <div
              key={entry.slug}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {id ? (
                    <Link
                      href={`/admin/experiences/${id}`}
                      // The row's way in — full-height touch target, not a
                      // text-sized sliver (spec §2 T1).
                      className="inline-flex min-h-11 items-center font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center font-medium">{name}</span>
                  )}
                  <Badge variant={kind.variant}>{kind.label}</Badge>
                  {entry.active ? null : <Badge variant="outline">Hidden</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t(entry.tagline, "en")}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  /{entry.slug} · {t(entry.duration, "en")}
                </p>
                <p className="mt-1 text-xs">
                  {entry.priceCents ? (
                    <span className="text-muted-foreground">
                      {formatPrice(entry.priceCents, "en")} per person
                    </span>
                  ) : (
                    /* Not a nag — an unpriced entry genuinely cannot be sold,
                       and the list is where that is discovered. */
                    <span className="text-destructive">
                      No price — can&apos;t be booked online
                    </span>
                  )}
                </p>
              </div>

              {id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <MoveExperienceButtons
                    id={id}
                    name={name}
                    isFirst={index === 0}
                    isLast={index === catalogue.length - 1}
                  />
                  <ToggleExperienceButton id={id} active={entry.active} name={name} />
                  <Button asChild variant="outline">
                    <Link href={`/admin/experiences/${id}`}>Edit</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Changes go live on the website as soon as they are saved. Hiding an experience takes it
        off the site but keeps it readable on the enquiries that chose it.
      </p>
    </AdminShell>
  );
}
