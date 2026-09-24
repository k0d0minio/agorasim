/**
 * The quote builder's work — what the Sales detail's Orçamento card does to a
 * wedding or event lead, one function per button.
 *
 * Arranged like `lib/booking-move.ts`: the server actions in
 * `app/admin/sales/actions.ts` decide who may ask and turn an outcome into a
 * sentence; everything that touches a row, the audit trail or the couple's
 * inbox is here, over the guarded writes in `lib/quotes.ts`. Each function
 * returns what happened rather than throwing, so an action can say "já foi
 * enviado" to the second of two taps instead of an error page.
 *
 * **The rules this file holds, and nothing else does:**
 *
 * - Only a `wedding` or `event` lead is quoted — a tour is sold, not quoted —
 *   and never an anonymised one: the retention job has already erased the
 *   person the quote would be for.
 * - A lead holds at most one draft and at most one live quote. Creating is
 *   refused while anything but a cancelled quote exists (`canStartQuote`); a
 *   sent quote is changed by copying it into a draft ("Nova versão"), and the
 *   send of that draft cancels the old one (`supersedeSentQuotes`).
 * - The total is the sum of the lines, at least one of them (D-3, decided with
 *   the operator at Define) — the builder never takes a typed total.
 * - A send mints a new link every time. The plaintext goes into the email and
 *   nowhere else; the quote keeps the digest.
 */
import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db, messageLog, tourRequests, type Quote, type QuoteLineItem, type TourRequest } from "@/db";
import { TERMS_VERSION } from "@/content/terms";
import { recordAuditOrWarn } from "@/lib/audit";
import { formatDay, type DateKey } from "@/lib/availability";
import { guestQuoteSentEmail } from "@/lib/booking-emails";
import { isEmailConfigured } from "@/lib/email";
import { sendLoggedEmail, type LoggedSend } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import {
  BALANCE_DUE_DAYS_BEFORE,
  QuoteDraftConflictError,
  QuoteError,
  balanceDueDate,
  canCopyAsNewVersion,
  canStartQuote,
  copyQuoteAsDraft,
  createQuote,
  discardDraft,
  getQuote,
  lineItemsTotal,
  listQuotesForLead,
  markQuoteSent,
  quoteRef,
  supersedeSentQuotes,
  updateQuoteDraft,
  type QuoteWithPayments,
} from "@/lib/quotes";
import { issueQuoteToken, isQuoteTokenConfigured, quotePath } from "@/lib/quote-token";
import { siteUrl } from "@/lib/site-origin";

/** What the builder's form carries, already parsed into cents. */
export type QuoteDraftInput = {
  eventDate: DateKey;
  venue: string | null;
  depositPercent: number;
  lineItems: QuoteLineItem[];
};

/** Why a quote could not be written, in the terms the action words. */
export type DraftOutcome =
  | { status: "saved"; quote: QuoteWithPayments }
  | { status: "not-found" }
  | { status: "not-quotable" }
  | { status: "already-quoted" }
  | { status: "not-editable" }
  | { status: "invalid"; problems: string[] };

/** What became of a send — the quote, and separately its email. */
export type SendOutcome =
  | { status: "sent"; quote: Quote; email: LoggedSend["status"]; superseded: number }
  | { status: "not-found" }
  | { status: "not-quotable" }
  | { status: "not-sendable" }
  /** The lead already has a quote with money on it — the refunds path's, not a new offer's. */
  | { status: "already-paid" }
  | { status: "unconfigured" };

/**
 * Whether this deployment can both mint a link and mail it. Asked before
 * anything is written: a send that marks the quote sent — or a re-send that
 * rotates the link — and then cannot mail it leaves the couple with no working
 * link at all, which is worse than a refusal Rita can read.
 */
function isSendConfigured(): boolean {
  return isQuoteTokenConfigured() && isEmailConfigured();
}

/** Only weddings and events are quoted; an anonymised person is not quoted. */
function isQuotable(lead: Pick<TourRequest, "kind" | "anonymisedAt">): boolean {
  return lead.kind !== "tour" && lead.anonymisedAt === null;
}

async function readLead(id: string): Promise<TourRequest | null> {
  const [lead] = await db.select().from(tourRequests).where(eq(tourRequests.id, id)).limit(1);
  return lead ?? null;
}

/**
 * The problems with a form's lines that `validateQuoteInput` does not ask
 * about, because a quote raised elsewhere may legally have none: the builder
 * requires at least one, and the sum is the total.
 */
function builderProblems(input: QuoteDraftInput): string[] {
  if (input.lineItems.length === 0) return ["no-lines"];
  if (lineItemsTotal(input.lineItems) <= 0) return ["zero-total"];
  return [];
}

/**
 * "Criar orçamento" — write the first draft for a lead.
 *
 * The language is the enquiry's, not a field: the couple wrote in it, and
 * the quote-sent email is written in whatever this row says.
 */
export async function createDraftForLead(options: {
  leadId: string;
  input: QuoteDraftInput;
  actorUserId: string;
}): Promise<DraftOutcome> {
  const { leadId, input, actorUserId } = options;

  const lead = await readLead(leadId);
  if (!lead) return { status: "not-found" };
  if (!isQuotable(lead)) return { status: "not-quotable" };

  const existing = await listQuotesForLead(lead.id);
  if (!canStartQuote(existing)) return { status: "already-quoted" };

  const problems = builderProblems(input);
  if (problems.length > 0) return { status: "invalid", problems };

  let quote: QuoteWithPayments;
  try {
    quote = await createQuote({
      tourRequestId: lead.id,
      createdByUserId: actorUserId,
      eventDate: input.eventDate,
      venue: input.venue,
      locale: lead.locale,
      totalCents: lineItemsTotal(input.lineItems),
      lineItems: input.lineItems,
      depositPercent: input.depositPercent,
    });
  } catch (err) {
    // The other phone's tap landed between the check above and this insert —
    // the database's own unique index is what actually caught it.
    if (err instanceof QuoteDraftConflictError) return { status: "already-quoted" };
    if (err instanceof QuoteError) return { status: "invalid", problems: [err.message] };
    throw err;
  }

  await recordAuditOrWarn({
    actorUserId,
    action: "quote.created",
    entityType: "tour_request",
    entityId: lead.id,
    after: { quoteRef: quoteRef(quote.id), totalCents: quote.totalCents },
  });

  return { status: "saved", quote };
}

/** "Guardar" on a draft — rewrite it, and its two instalments, from the form. */
export async function saveDraft(options: {
  quoteId: string;
  input: QuoteDraftInput;
  actorUserId: string;
}): Promise<DraftOutcome> {
  const { quoteId, input, actorUserId } = options;

  const problems = builderProblems(input);
  if (problems.length > 0) return { status: "invalid", problems };

  let quote: QuoteWithPayments | null;
  try {
    quote = await updateQuoteDraft(quoteId, {
      eventDate: input.eventDate,
      venue: input.venue,
      totalCents: lineItemsTotal(input.lineItems),
      lineItems: input.lineItems,
      depositPercent: input.depositPercent,
    });
  } catch (err) {
    if (err instanceof QuoteError) return { status: "invalid", problems: [err.message] };
    throw err;
  }
  // Missing, or sent from the other phone since this form was opened.
  if (!quote) return { status: "not-editable" };

  if (quote.tourRequestId) {
    await recordAuditOrWarn({
      actorUserId,
      action: "quote.updated",
      entityType: "tour_request",
      entityId: quote.tourRequestId,
      after: { quoteRef: quoteRef(quote.id), totalCents: quote.totalCents },
    });
  }

  return { status: "saved", quote };
}

/** "Descartar rascunho". `false` when there was no draft left to discard. */
export async function discardQuoteDraft(options: {
  quoteId: string;
  actorUserId: string;
}): Promise<boolean> {
  const quote = await discardDraft(options.quoteId);
  if (!quote) return false;

  if (quote.tourRequestId) {
    await recordAuditOrWarn({
      actorUserId: options.actorUserId,
      action: "quote.discarded",
      entityType: "tour_request",
      entityId: quote.tourRequestId,
      after: { quoteRef: quoteRef(quote.id), status: "cancelled" },
    });
  }
  return true;
}

/**
 * "Nova versão" — a draft copied from a sent quote. The sent one stays live
 * until the copy is sent.
 */
export async function startNewVersion(options: {
  quoteId: string;
  actorUserId: string;
}): Promise<DraftOutcome> {
  const source = await getQuote(options.quoteId);
  if (!source || !source.tourRequestId) return { status: "not-found" };

  const siblings = await listQuotesForLead(source.tourRequestId);
  if (!canCopyAsNewVersion(source, siblings)) return { status: "not-editable" };

  let copy: QuoteWithPayments | null;
  try {
    copy = await copyQuoteAsDraft(source.id, options.actorUserId);
  } catch (err) {
    // The other phone's "Criar orçamento" (or its own "Nova versão") landed
    // between the check above and this insert — same race, same outcome
    // `canCopyAsNewVersion` would have given it.
    if (err instanceof QuoteDraftConflictError) return { status: "not-editable" };
    throw err;
  }
  if (!copy) return { status: "not-editable" };

  await recordAuditOrWarn({
    actorUserId: options.actorUserId,
    action: "quote.created",
    entityType: "tour_request",
    entityId: source.tourRequestId,
    after: { quoteRef: quoteRef(copy.id), copiedFrom: quoteRef(source.id) },
  });

  return { status: "saved", quote: copy };
}

/**
 * "Enviar orçamento" — a draft goes to the couple.
 *
 * In this order, each step guarded: mint the link; mark the draft sent under
 * the current terms version and the new digest (drafts only, so a double tap
 * finds nothing to send); cancel the lead's previous sent quote, if this is a
 * new version of it; audit; email. The email is last and its failure does not
 * undo the send — the quote *is* the offer, and "Reenviar" is the path for a
 * mail that did not leave (see {@link resendQuote}).
 */
export async function sendQuote(options: {
  quoteId: string;
  actorUserId: string;
  now?: Date;
}): Promise<SendOutcome> {
  const { quoteId, actorUserId, now = new Date() } = options;

  const existing = await getQuote(quoteId);
  if (!existing || !existing.tourRequestId) return { status: "not-found" };
  const lead = await readLead(existing.tourRequestId);
  if (!lead) return { status: "not-found" };
  if (!isQuotable(lead)) return { status: "not-quotable" };
  if (!isSendConfigured()) return { status: "unconfigured" };

  // A new version replaces an offer nobody has paid on. If the couple paid a
  // deposit on the sent quote after this draft was copied from it, sending the
  // draft would put a second payable offer beside a live, part-paid one.
  const siblings = await listQuotesForLead(lead.id);
  if (siblings.some((sibling) => sibling.status === "deposit_paid" || sibling.status === "paid")) {
    return { status: "already-paid" };
  }

  const link = await issueQuoteToken();
  const quote = await markQuoteSent(quoteId, {
    termsVersion: TERMS_VERSION,
    tokenHash: link.digest,
    actorUserId,
    from: ["draft"],
    now,
  });
  if (!quote) return { status: "not-sendable" };

  const superseded = await supersedeSentQuotes(quote, { actorUserId, now });

  await recordAuditOrWarn({
    actorUserId,
    action: "quote.sent",
    entityType: "tour_request",
    entityId: lead.id,
    // The reference and the terms, never the link: the token is a credential.
    after: {
      quoteRef: quoteRef(quote.id),
      termsVersion: quote.termsVersion,
      totalCents: quote.totalCents,
    },
  });

  const email = await emailQuote(quote, lead, link.token);
  return { status: "sent", quote, email, superseded: superseded.length };
}

/**
 * "Reenviar" — the same quote behind a fresh link, emailed again.
 *
 * For a mail that failed, and for one that went to a mistyped address once the
 * lead's email is corrected: the old link dies with the rotation either way.
 * `sentAt` is the stamp the operator's screen showed; a quote re-sent since
 * (the other phone, the second tap) has a newer one and is left alone.
 */
export async function resendQuote(options: {
  quoteId: string;
  sentAt: Date;
  actorUserId: string;
  now?: Date;
}): Promise<SendOutcome> {
  const { quoteId, sentAt, actorUserId, now = new Date() } = options;

  const existing = await getQuote(quoteId);
  if (!existing || !existing.tourRequestId) return { status: "not-found" };
  const lead = await readLead(existing.tourRequestId);
  if (!lead) return { status: "not-found" };
  if (!isQuotable(lead)) return { status: "not-quotable" };
  if (!isSendConfigured()) return { status: "unconfigured" };

  const link = await issueQuoteToken();
  const quote = await markQuoteSent(quoteId, {
    // The version the couple are now shown is today's, as the state machine's
    // note on re-sends says; what they *accept* is fixed only by paying.
    termsVersion: TERMS_VERSION,
    tokenHash: link.digest,
    actorUserId,
    from: ["sent"],
    ifSentAt: sentAt,
    now,
  });
  if (!quote) return { status: "not-sendable" };

  await recordAuditOrWarn({
    actorUserId,
    action: "quote.resent",
    entityType: "tour_request",
    entityId: lead.id,
    after: { quoteRef: quoteRef(quote.id), termsVersion: quote.termsVersion },
  });

  const email = await emailQuote(quote, lead, link.token);
  return { status: "sent", quote, email, superseded: 0 };
}

/**
 * Build and send the quote-sent email for one send of a quote, logged under
 * the quote and the `sent_at` that send stamped — one email per link.
 */
async function emailQuote(
  quote: Quote,
  lead: Pick<TourRequest, "id" | "name" | "email">,
  token: string,
): Promise<LoggedSend["status"]> {
  const locale = quote.locale;
  const money = (cents: number) => formatPrice(cents, locale, quote.currency);
  // Re-read for the instalments: the split was frozen at the last save, and
  // the email states exactly the figures the couple will be asked for.
  const withPayments = await getQuote(quote.id);
  const deposit = withPayments?.payments.find((payment) => payment.kind === "deposit");
  const balance = withPayments?.payments.find((payment) => payment.kind === "balance");

  const message = guestQuoteSentEmail({
    ref: quoteRef(quote.id),
    guestName: lead.name,
    guestEmail: lead.email,
    locale,
    date: formatDay(quote.eventDate, locale),
    venue: quote.venue,
    lines: quote.lineItems.map((line) => ({
      label: line.label,
      quantity: line.quantity,
      amount: money(line.unitCents * line.quantity),
    })),
    total: money(quote.totalCents),
    deposit: money(deposit?.amountCents ?? 0),
    depositPercent: quote.depositPercent,
    balance: money(balance?.amountCents ?? 0),
    balanceDue: formatDay(balance?.dueDate ?? balanceDueDate(quote.eventDate), locale),
    balanceDueDaysBefore: BALANCE_DUE_DAYS_BEFORE,
    termsWindowDays: quote.termsWindowDays,
    quoteUrl: `${siteUrl()}${quotePath(locale, token)}`,
  });

  const result = await sendLoggedEmail(
    {
      kind: "quote-sent",
      recipient: "guest",
      tourRequestId: lead.id,
      quoteId: quote.id,
      // `markQuoteSent` always stamps it; the fallback only satisfies the type.
      quoteSentAt: quote.sentAt ?? new Date(),
    },
    message,
  );

  if (result.status !== "sent") {
    console.warn(`[quote-builder] quote-sent for ${quoteRef(quote.id)}: ${result.status}`);
  }
  return result.status;
}

/** What the card says about the email behind a quote's current link. */
export type QuoteEmailState = "sent" | "sending" | "not-sent";

/**
 * For each quote, whether the email carrying its *current* link went out —
 * the row logged under its present `sent_at`. A quote re-sent since an old
 * failure reads by its new send, not by the failure.
 */
export async function quoteEmailStates(
  sent: readonly Pick<Quote, "id" | "sentAt">[],
): Promise<Map<string, QuoteEmailState>> {
  const states = new Map<string, QuoteEmailState>();
  const withStamp = sent.filter((quote) => quote.sentAt !== null);
  if (withStamp.length === 0) return states;

  const rows = await db
    .select({
      quoteId: messageLog.quoteId,
      quoteSentAt: messageLog.quoteSentAt,
      status: messageLog.status,
    })
    .from(messageLog)
    .where(inArray(messageLog.quoteId, withStamp.map((quote) => quote.id)));

  for (const quote of withStamp) {
    const forThisLink = rows.filter(
      (row) =>
        row.quoteId === quote.id &&
        row.quoteSentAt !== null &&
        row.quoteSentAt.getTime() === quote.sentAt!.getTime(),
    );
    states.set(
      quote.id,
      forThisLink.some((row) => row.status === "sent")
        ? "sent"
        : forThisLink.some((row) => row.status === "sending")
          ? "sending"
          : "not-sent",
    );
  }
  return states;
}
