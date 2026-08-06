import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { auditActionLabel, formatDateTime, formatRelativeTime } from "@/lib/admin-format";
import { listAuditForEntity } from "@/lib/audit";
import { mailtoHref, whatsAppHref, type ContactContext } from "@/lib/contact-templates";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { toTelHref, toWhatsAppNumber } from "@/lib/phone";
import { requestStatusMeta } from "@/lib/admin-format";
import { enquiryRef, recordFromRequest } from "@/lib/sales";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteSubmissionDialog } from "@/components/admin/delete-submission-dialog";
import {
  EnquiryKindIcon,
  ExperienceIconRow,
  ExperienceNames,
} from "@/components/admin/experience-icons";
import { LeadEditForm, type CatalogueOption } from "@/components/admin/lead-edit-form";
import { ArchiveLeadButton, LogContactButton } from "@/components/admin/lead-quick-actions";
import { MarketingConsent, Received } from "@/components/admin/record-meta";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * One lead, in full.
 *
 * The list can only ever show a summary, and everything an operator actually
 * wants to *do* with a lead — reply to it, correct it, note what was agreed,
 * archive it, erase it on request — used to have nowhere to live but a table
 * row. This page is that place: the enquiry as it arrived, the ways to reach the
 * person, the editable record, and the history of who did what to it.
 */
export default async function AdminLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireAdmin();
  const isOwner = viewer.role === "owner";

  const { id } = await params;

  // A hand-typed or stale URL is a 404, not a 500 from the uuid cast.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [lead] = await db.select().from(tourRequests).where(eq(tourRequests.id, id)).limit(1);
  if (!lead) notFound();

  const [catalogue, history] = await Promise.all([
    listCatalogue(),
    listAuditForEntity("tour_request", lead.id),
  ]);

  const index = catalogueIndex(catalogue);
  const record = recordFromRequest(lead);
  const now = new Date();

  const experienceName = lead.experienceSlug
    ? (index.get(lead.experienceSlug) && t(index.get(lead.experienceSlug)!.title, "en")) ??
      lead.experienceSlug
    : null;

  const context: ContactContext = {
    name: lead.name,
    locale: lead.locale,
    experience: experienceName,
  };

  const tel = toTelHref(lead.phone);
  const whatsAppNumber = toWhatsAppNumber(lead.phone);

  const options: CatalogueOption[] = catalogue.map((entry) => ({
    slug: entry.slug,
    label: t(entry.title, "en"),
    icon: entry.icon,
    kind: entry.kind,
    active: entry.active,
  }));

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* The way back to the board is the app bar's up arrow — the shell
            derives it from the route, so the page no longer draws its own. */}

        {/* Who, what, and where in the pipeline — the header answers all three. */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <EnquiryKindIcon kind={lead.kind} />
                  <CardTitle className="text-2xl">{lead.name}</CardTitle>
                </div>
                <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono">{enquiryRef(lead.id)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    Received <Received at={lead.createdAt} /> ({formatDateTime(lead.createdAt)})
                  </span>
                  <span aria-hidden>·</span>
                  <span className="uppercase">{lead.locale}</span>
                  <span aria-hidden>·</span>
                  <span>via {lead.source}</span>
                </CardDescription>
              </div>
              <RequestStatusSelect id={lead.id} status={lead.status} name={lead.name} />
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {/*
              Reaching the person. Each link opens their own mail app or WhatsApp
              with an opening message already written in the language they wrote
              to us in — the admin cannot send mail itself, and pretending
              otherwise with a dead "Send" button would be worse than this.
            */}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={mailtoHref(lead.email, context)}>
                  <Mail className="size-4" />
                  Email
                </a>
              </Button>
              {tel ? (
                <Button asChild variant="outline">
                  <a href={tel}>
                    <Phone className="size-4" />
                    Call
                  </a>
                </Button>
              ) : null}
              {whatsAppNumber ? (
                <Button asChild variant="outline">
                  <a
                    href={whatsAppHref(whatsAppNumber, context)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              <LogContactButton
                id={lead.id}
                lastContactedAt={lead.lastContactedAt?.toISOString() ?? null}
              />
              <ArchiveLeadButton id={lead.id} archived={lead.status === "archived"} />
              {isOwner ? (
                <DeleteSubmissionDialog
                  id={lead.id}
                  name={lead.name}
                  redirectTo="/admin/sales"
                />
              ) : null}
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{lead.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <ExperienceIconRow
                    experienceSlug={lead.experienceSlug}
                    addOns={lead.addOns}
                    catalogue={index}
                  />
                  <ExperienceNames
                    experienceSlug={lead.experienceSlug}
                    addOns={lead.addOns}
                    catalogue={index}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Party</dt>
                <dd>{lead.partySize ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Preferred date</dt>
                <dd>{lead.preferredDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stage</dt>
                <dd>
                  <Badge variant={requestStatusMeta[record.status].variant}>
                    {requestStatusMeta[record.status].label}
                  </Badge>
                </dd>
              </div>
            </dl>

            {/*
              The consent record, read-only on purpose: it evidences what this
              person agreed to and when (GDPR Art. 7(1)), and a record that can
              be edited afterwards evidences nothing.
            */}
            {lead.marketingConsent ? (
              <MarketingConsent
                at={lead.marketingConsentAt}
                version={lead.marketingConsentVersion}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No marketing opt-in — this address is for answering the enquiry only.
              </p>
            )}

            {lead.anonymisedAt ? (
              <p className="text-xs text-muted-foreground">
                Anonymised by the retention job on {formatDateTime(lead.anonymisedAt)}.
              </p>
            ) : null}

            {lead.message ? (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">In their words</p>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">
                  {lead.message}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <LeadEditForm
          lead={{
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            kind: lead.kind,
            experienceSlug: lead.experienceSlug,
            addOns: lead.addOns,
            partySize: lead.partySize,
            preferredDate: lead.preferredDate,
            message: lead.message,
            internalNotes: lead.internalNotes,
          }}
          options={options}
        />

        {/* Who did what to this record. The audit log already held it; there was
            simply nowhere on a lead to read it. */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Every change made to this lead, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet — this lead has not been touched since it arrived.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
                    <span>
                      <span className="font-medium">{entry.actorName ?? "Scheduled job"}</span>{" "}
                      {auditActionLabel(entry.action)}
                    </span>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      title={formatDateTime(entry.createdAt)}
                      className="text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(entry.createdAt, now)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
