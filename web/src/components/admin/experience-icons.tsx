import { t } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { CatalogueEntry } from "@/lib/experience-catalogue";
import {
  ENQUIRY_KIND_ICONS,
  experienceIcon,
  type IconComponent,
} from "@/lib/experience-icons";
import type { EnquiryKind } from "@/db/schema";
import type { SalesRecord } from "@/lib/sales";

/**
 * Drawing what a lead booked, instead of spelling it out.
 *
 * Every chip here is a real label wearing an icon: the text is always present
 * for assistive tech and as a hover title, it is just not spending a column of
 * table width. That distinction is the whole design — an icon that *replaces*
 * the name is a puzzle, an icon that *stands in for* it is a glance.
 */

/** One icon with its name attached — visible on hover, always there for a reader. */
export function IconChip({
  icon: Icon,
  label,
  tone = "muted",
  className,
}: {
  icon: IconComponent;
  label: string;
  tone?: "muted" | "primary" | "accent";
  className?: string;
}) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "muted" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Tour / wedding / event — the first thing to know about a lead. */
export function EnquiryKindIcon({
  kind,
  className,
}: {
  kind: EnquiryKind;
  className?: string;
}) {
  const meta = ENQUIRY_KIND_ICONS[kind];
  return <IconChip icon={meta.icon} label={meta.label} tone="primary" className={className} />;
}

/** The name a slug goes by, for the chip's label. Unknown slugs speak for themselves. */
function labelFor(slug: string, catalogue: Map<string, CatalogueEntry>): string {
  const entry = catalogue.get(slug);
  return entry ? t(entry.title, "en") : slug;
}

/**
 * The experience and its add-ons, as a row of icons.
 *
 * This is the cell that used to read "Rural Saloia + Tasco Galapito, Manzwine"
 * and push the table past 900px. Order is deliberate: the experience first, the
 * add-ons after it, so a column of rows lines up by what was actually bought.
 */
export function ExperienceIconRow({
  experienceSlug,
  addOns,
  catalogue,
  className,
}: {
  experienceSlug: string | null;
  addOns: string[];
  catalogue: Map<string, CatalogueEntry>;
  className?: string;
}) {
  if (!experienceSlug && addOns.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {experienceSlug ? (
        <IconChip
          icon={experienceIcon(catalogue.get(experienceSlug)?.icon).icon}
          label={labelFor(experienceSlug, catalogue)}
        />
      ) : null}
      {addOns.map((slug) => (
        <IconChip
          key={slug}
          icon={experienceIcon(catalogue.get(slug)?.icon).icon}
          label={labelFor(slug, catalogue)}
        />
      ))}
    </span>
  );
}

/**
 * The same thing in words, for the places that have room for them — a detail
 * page, or a card where the extra line costs nothing.
 */
export function ExperienceNames({
  experienceSlug,
  addOns,
  catalogue,
  className,
}: {
  experienceSlug: string | null;
  addOns: string[];
  catalogue: Map<string, CatalogueEntry>;
  className?: string;
}) {
  const names = [
    ...(experienceSlug ? [labelFor(experienceSlug, catalogue)] : []),
    ...addOns.map((slug) => labelFor(slug, catalogue)),
  ];
  if (names.length === 0) return <span className={className}>—</span>;
  return <span className={className}>{names.join(" · ")}</span>;
}

/**
 * The whole "what is this?" of a record in one strip: what kind of job it is,
 * and which experiences it involves.
 */
export function RecordIcons({
  record,
  catalogue,
  className,
}: {
  record: SalesRecord;
  catalogue: Map<string, CatalogueEntry>;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <EnquiryKindIcon kind={record.kind} />
      <ExperienceIconRow
        experienceSlug={record.experienceSlug}
        addOns={record.addOns}
        catalogue={catalogue}
      />
    </span>
  );
}
