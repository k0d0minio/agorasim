import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { departureLabel } from "@/content/logistics";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import {
  auditActionLabel,
  bookingStatusMeta,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/admin-format";
import { listAuditForEntity } from "@/lib/audit";
import { mailtoHref, whatsAppHref, type ContactContext } from "@/lib/contact-templates";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { toTelHref, toWhatsAppNumber } from "@/lib/phone";
import { requestStatusMeta } from "@/lib/admin-format";
import { bookingRef } from "@/lib/bookings";
import { formatPrice } from "@/lib/money";
import { refundableCents } from "@/lib/booking-refund";
import { bookingsForLead, bookingSummaries, enquiryRef, recordFromRequest } from "@/lib/sales";
import { AdminShell } from "@/components/admin/admin-shell";
import { CancelBookingDialog } from "@/components/admin/cancel-booking-dialog";
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

  const [catalogue, history, leadBookings] = await Promise.all([
    listCatalogue(),
    listAuditForEntity("tour_request", lead.id),
    bookingsForLead(lead.id),
  ]);

  const index = catalogueIndex(catalogue);
  // The same join the board does, for one lead: without it this page shows
  // neither the money nor the reference the guest was actually given.
  const record = recordFromRequest(lead, (await bookingSummaries([lead.id])).get(lead.id));
  const now = new Date();

  const experienceName = lead.experienceSlug
    ? (index.get(lead.experienceSlug) && t(index.get(lead.experienceSlug)!.title, "pt")) ??
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
    label: t(entry.title, "pt"),
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
                  {record.bookingRef ? (
                    <>
                      <span aria-hidden>·</span>
                      {/* What the guest quotes — see SalesRecord.bookingRef. */}
                      <span className="font-mono">{record.bookingRef}</span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>
                    Recebido <Received at={lead.createdAt} /> ({formatDateTime(lead.createdAt)})
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
                    Telefonar
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
                <dt className="text-muted-foreground">Telefone</dt>
                <dd>{lead.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Experiência</dt>
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
                <dt className="text-muted-foreground">Pessoas</dt>
                <dd>{lead.partySize ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Data preferida</dt>
                <dd>{lead.preferredDate ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fase</dt>
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
                Sem autorização de marketing — este endereço serve apenas para responder ao
                pedido.
              </p>
            )}

            {lead.anonymisedAt ? (
              <p className="text-xs text-muted-foreground">
                Anonimizado pela limpeza automática a {formatDateTime(lead.anonymisedAt)}.
              </p>
            ) : null}

            {lead.message ? (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Nas palavras do cliente</p>
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

        {/*
          The money, and the one thing that can be done to it.

          A booking's own state used to be invisible here: the header carries
          the reference and the total for a *live* booking, and a cancelled or
          refunded one simply vanished from the card — which is precisely the
          one an operator goes looking for. Every booking behind the lead is
          listed instead, newest first.
        */}
        {leadBookings.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Reservas</CardTitle>
              <CardDescription>
                O que foi vendido a esta pessoa, e o que aconteceu ao pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {leadBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-3 border-l-2 pl-3 first:border-primary"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-mono">{bookingRef(booking.id)}</span>
                    <Badge variant={bookingStatusMeta[booking.status].variant}>
                      {bookingStatusMeta[booking.status].label}
                    </Badge>
                    <span aria-hidden>·</span>
                    <span>
                      {booking.date} ·{" "}
                      {t(departureLabel(booking.experienceSlug, booking.slot), "pt")}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{booking.partySize} pessoas</span>
                  </div>

                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Pago</dt>
                      <dd>{formatPrice(booking.amountCents, "pt", booking.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Reembolsado</dt>
                      <dd>
                        {booking.refundedAmountCents > 0
                          ? formatPrice(
                              booking.refundedAmountCents,
                              "pt",
                              booking.currency,
                            )
                          : "—"}
                        {booking.refundedAt ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {formatDateTime(booking.refundedAt)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  </dl>

                  {/*
                    Only a paid booking can be called off: everything else is
                    already over, and the action would refuse anyway (see
                    `lib/booking-refund.ts`). Rendering it regardless would be a
                    button whose only outcome is an error message.
                  */}
                  {booking.status === "confirmed" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CancelBookingDialog
                        booking={{
                          id: booking.id,
                          ref: bookingRef(booking.id),
                          amountCents: booking.amountCents,
                          refundedAmountCents: booking.refundedAmountCents,
                          currency: booking.currency,
                          date: booking.date,
                        }}
                        guestName={lead.name}
                      />
                      {refundableCents(booking) === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Já não há valor por devolver — o cancelamento liberta o carro.
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {booking.cancelledAt ? (
                    <p className="text-xs text-muted-foreground">
                      Cancelada a {formatDateTime(booking.cancelledAt)}
                      {booking.cancelledVia === "admin"
                        ? " pela equipa"
                        : booking.cancelledVia === "guest"
                          ? " pelo cliente"
                          : ""}
                      .
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Who did what to this record. The audit log already held it; there was
            simply nowhere on a lead to read it. */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>
              Todas as alterações a este pedido, da mais recente para a mais antiga.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda nada — ninguém mexeu neste pedido desde que chegou.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
                    <span>
                      <span className="font-medium">
                        {entry.actorName ?? "Tarefa automática"}
                      </span>{" "}
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
