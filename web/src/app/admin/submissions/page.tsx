import { redirect } from "next/navigation";
import { Inbox, MailCheck } from "lucide-react";
import { count, desc } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity } from "@/lib/audit";
import { countPendingRetention, retentionDays } from "@/lib/retention";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPagination } from "@/components/admin/pagination";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import {
  BulkSubmissionActions,
  SubmissionCheckbox,
} from "@/components/admin/bulk-submission-actions";
import { DeleteSubmissionDialog } from "@/components/admin/delete-submission-dialog";
import { SubjectExportForm } from "@/components/admin/subject-export-form";
import { lastPage, pageSlice, readPageParam } from "@/lib/admin-pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  auditActionLabel,
  formatDate,
  formatRelative,
  requestStatusMeta,
} from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** Map experience slugs to a readable (English) label for the admin table. */
const experienceLabel = new Map(experiences.map((e) => [e.slug, t(e.title, "en")]));

function labelFor(slug: string | null): string {
  if (!slug) return "—";
  return experienceLabel.get(slug) ?? slug;
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

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Inbox className="size-4" />
          {enquiries} {enquiries === 1 ? "enquiry" : "enquiries"}
        </span>
        {/* The retention policy, made visible. A scheduled job that quietly
            erases data nobody knew was scheduled to go is how surprises happen. */}
        <span>
          Unconverted enquiries are anonymised after {retentionDays()} days
          {pendingRetention > 0 ? ` · ${pendingRetention} due at the next run` : ""}
        </span>
      </div>

      <BulkSubmissionActions canErase={isOwner}>
        <Card className="overflow-x-auto p-0">
          <Table className="min-w-[980px]">
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
              {rows.map((r) => {
                const meta = requestStatusMeta[r.status];
                const audit = lastChanged.get(r.id);
                return (
                  <TableRow key={r.id} className="align-top">
                    <TableCell>
                      <SubmissionCheckbox id={r.id} label={`Select the enquiry from ${r.name}`} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <a
                        href={`mailto:${r.email}`}
                        className="text-muted-foreground hover:text-primary"
                      >
                        {r.email}
                      </a>
                      {r.phone ? (
                        <div className="text-xs text-muted-foreground">{r.phone}</div>
                      ) : null}
                      {r.message ? (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{r.message}</p>
                      ) : null}
                      {/* Consent is shown next to the address it applies to, so
                          nobody has to guess whether this one may be emailed. */}
                      {r.marketingConsent ? (
                        <span
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary"
                          title={`Consented ${formatDate(r.marketingConsentAt)} · text version ${r.marketingConsentVersion ?? "unknown"}`}
                        >
                          <MailCheck className="size-3" />
                          Marketing opt-in
                        </span>
                      ) : null}
                      {r.anonymisedAt ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Anonymised {formatDate(r.anonymisedAt)}
                        </div>
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
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <RequestStatusSelect id={r.id} status={r.status} />
                        {audit ? (
                          <p className="text-[11px] text-muted-foreground">
                            {audit.actorName ?? "Scheduled job"} {auditActionLabel(audit.action)},{" "}
                            {formatRelative(audit.createdAt, now)}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    {isOwner ? (
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <DeleteSubmissionDialog id={r.id} name={r.name} />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
