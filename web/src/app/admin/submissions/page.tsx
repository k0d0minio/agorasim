import { redirect } from "next/navigation";
import { Inbox, MailCheck } from "lucide-react";
import { count, desc } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity, type AuditLogRow } from "@/lib/audit";
import { countPendingRetention, retentionDays } from "@/lib/retention";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPagination } from "@/components/admin/pagination";
import { ContactLinks } from "@/components/admin/contact-links";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import {
  BulkSubmissionActions,
  SubmissionCheckbox,
} from "@/components/admin/bulk-submission-actions";
import { DeleteSubmissionDialog } from "@/components/admin/delete-submission-dialog";
import { SubjectExportForm } from "@/components/admin/subject-export-form";
import { lastPage, pageSlice, readPageParam } from "@/lib/admin-pagination";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auditActionLabel, formatDateTime, formatRelativeTime } from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** Map experience slugs to a readable (English) label for the admin table. */
const experienceLabel = new Map(experiences.map((e) => [e.slug, t(e.title, "en")]));

function labelFor(slug: string | null): string {
  if (!slug) return "—";
  return experienceLabel.get(slug) ?? slug;
}

/** "3h ago", with the exact timestamp behind it. */
function Received({ at }: { at: Date | string | null }) {
  const date = at instanceof Date ? at : at ? new Date(at) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  return (
    <time dateTime={iso} title={formatDateTime(at)} className="whitespace-nowrap">
      {formatRelativeTime(at)}
    </time>
  );
}

/**
 * "Rita changed a submission's status, 3h ago" — who last touched this row.
 * With a shared password this line had nothing to say.
 */
function LastChangedBy({ audit, now }: { audit: AuditLogRow | undefined; now: Date }) {
  if (!audit) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {/* A null actor is the retention cron, not an unknown person. */}
      {audit.actorName ?? "Scheduled job"} {auditActionLabel(audit.action)},{" "}
      <time dateTime={audit.createdAt.toISOString()} title={formatDateTime(audit.createdAt)}>
        {formatRelativeTime(audit.createdAt, now)}
      </time>
    </p>
  );
}

/** Marketing opt-in, shown next to the address it applies to. */
function MarketingConsent({
  at,
  version,
}: {
  at: Date | string | null;
  version: string | null;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-primary"
      title={`Consented ${formatDateTime(at)} · text version ${version ?? "unknown"}`}
    >
      <MailCheck className="size-3.5 shrink-0" aria-hidden />
      Marketing opt-in
    </span>
  );
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Every operator can triage; only owners can erase or export guest data.
  const viewer = await requireAdmin();
  const isOwner = viewer.role === "owner";

  const page = readPageParam((await searchParams).page);
  const { limit, offset } = pageSlice(page);

  // Count and page in one round trip; the list used to fetch every row, forever.
  const [[total], rows] = await db.batch([
    db.select({ n: count() }).from(tourRequests),
    db
      .select()
      .from(tourRequests)
      .orderBy(desc(tourRequests.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const enquiries = total?.n ?? 0;
  // A hand-typed page past the end — send them to the last real one.
  if (enquiries > 0 && page > lastPage(enquiries)) {
    redirect(`/admin/submissions?page=${lastPage(enquiries)}`);
  }

  if (enquiries === 0) {
    return (
      <AdminShell>
        <PlaceholderPanel
          icon={Inbox}
          title="No submissions yet"
          description="Once customers submit the booking form, their enquiries appear here for the team to review and follow up."
        />
      </AdminShell>
    );
  }

  // One query for the whole page's "last changed by" lines, not one per row.
  const [lastChanged, pendingRetention] = await Promise.all([
    lastAuditByEntity(
      "tour_request",
      rows.map((r) => r.id),
    ),
    countPendingRetention(),
  ]);
  const now = new Date();
  const countLabel = `${enquiries} ${enquiries === 1 ? "enquiry" : "enquiries"}`;

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Inbox className="size-4" />
          {countLabel}
        </span>
        {/* The retention policy, made visible. A scheduled job that quietly
            erases data nobody knew was scheduled to go is how surprises happen. */}
        <span>
          Unconverted enquiries are anonymised after {retentionDays()} days
          {pendingRetention > 0 ? ` · ${pendingRetention} due at the next run` : ""}
        </span>
      </div>

      <BulkSubmissionActions canErase={isOwner}>
        {/*
          Below md this is a stack of cards, not a 900px-wide table in a sideways
          scroller: the message reads in full and the status control sits at the
          bottom of the card, where a thumb is. The select-for-bulk checkbox and
          the erase affordance are on the card too — putting either of them only
          in the desktop table would make triage-on-a-phone the weaker mode
          again.
        */}
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="gap-3">
                <div className="flex flex-col gap-3 px-(--card-spacing)">
                  <div className="flex items-start gap-3">
                    <SubmissionCheckbox
                      id={r.id}
                      label={`Select the enquiry from ${r.name}`}
                      className="mt-1.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-base font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground">
                        <Received at={r.createdAt} /> · {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                    {isOwner ? <DeleteSubmissionDialog id={r.id} name={r.name} /> : null}
                  </div>

                  <ContactLinks email={r.email} phone={r.phone} />

                  {r.marketingConsent ? (
                    <MarketingConsent
                      at={r.marketingConsentAt}
                      version={r.marketingConsentVersion}
                    />
                  ) : null}

                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Experience</dt>
                    <dd>
                      {labelFor(r.experienceSlug)}
                      <span className="ml-1.5 text-xs text-muted-foreground uppercase">
                        {r.locale}
                      </span>
                    </dd>

                    {r.addOns.length > 0 ? (
                      <>
                        <dt className="text-muted-foreground">Add-ons</dt>
                        <dd>{r.addOns.map(labelFor).join(", ")}</dd>
                      </>
                    ) : null}

                    <dt className="text-muted-foreground">Party</dt>
                    <dd>{r.partySize ?? "—"}</dd>

                    <dt className="text-muted-foreground">Preferred</dt>
                    <dd>{r.preferredDate ?? "—"}</dd>

                    {r.anonymisedAt ? (
                      <>
                        <dt className="text-muted-foreground">Anonymised</dt>
                        <dd>{formatDateTime(r.anonymisedAt)}</dd>
                      </>
                    ) : null}
                  </dl>

                  {r.message ? (
                    <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">
                      {r.message}
                    </p>
                  ) : null}

                  <RequestStatusSelect id={r.id} status={r.status} name={r.name} />
                  <LastChangedBy audit={lastChanged.get(r.id)} now={now} />
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="hidden p-0 md:block">
          {/* `relative` matters: without a containing block of its own, the
              table's overflow escapes this scroller and scrolls the whole page
              sideways at widths where the table doesn't fit. */}
          <div className="relative overflow-x-auto">
            <Table className="min-w-[940px]">
              <TableCaption>
                Tour enquiries from the website, newest first — {countLabel}.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Add-ons</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  {isOwner ? (
                    <TableHead className="text-right">
                      <span className="sr-only">Erase</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell>
                      <SubmissionCheckbox
                        id={r.id}
                        label={`Select the enquiry from ${r.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <ContactLinks email={r.email} phone={r.phone} />
                      {r.marketingConsent ? (
                        <MarketingConsent
                          at={r.marketingConsentAt}
                          version={r.marketingConsentVersion}
                        />
                      ) : null}
                      {r.message ? (
                        <p className="mt-1 max-w-sm text-xs whitespace-pre-wrap text-muted-foreground">
                          {r.message}
                        </p>
                      ) : null}
                      {r.anonymisedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Anonymised {formatDateTime(r.anonymisedAt)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {labelFor(r.experienceSlug)}
                      <div className="text-xs text-muted-foreground uppercase">{r.locale}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.addOns.length > 0 ? r.addOns.map(labelFor).join(", ") : "—"}
                    </TableCell>
                    <TableCell>{r.partySize ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.preferredDate ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <Received at={r.createdAt} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <RequestStatusSelect id={r.id} status={r.status} name={r.name} />
                        <LastChangedBy audit={lastChanged.get(r.id)} now={now} />
                      </div>
                    </TableCell>
                    {isOwner ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <DeleteSubmissionDialog id={r.id} name={r.name} />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </BulkSubmissionActions>

      <AdminPagination
        page={page}
        total={enquiries}
        label="Submissions pages"
        hrefFor={(n) => `/admin/submissions?page=${n}`}
      />

      {/* Owner-only, because a subject-access export is a bulk read of guest
          PII — exactly what a collaborator account is not for. */}
      {isOwner ? (
        <div className="mt-8">
          <SubjectExportForm />
        </div>
      ) : null}
    </AdminShell>
  );
}
