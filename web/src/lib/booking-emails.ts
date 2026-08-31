/**
 * Turning a confirmed booking into the two emails it causes.
 *
 * Pure — it takes facts and returns {@link EmailMessage}s. Sending is
 * `lib/email.ts`'s job, and keeping the two apart is what lets the wording, the
 * substitution, the escaping and the "what if there are no add-ons" case be
 * unit-tested without a mail server or a fake API key.
 *
 * **Both parts, every time.** Each message carries the branded HTML from
 * `lib/email-layout.ts` *and* a plain text alternative, assembled from the same
 * strings in `content/emails.ts`. The text part is not a fallback nobody reads:
 * it is what a text-only client shows, what a screen reader in some setups
 * prefers, and one of the things spam filters look for before trusting an HTML
 * mail from a young sending domain.
 *
 * No `server-only` marker here for the same reason as before: there is nothing
 * in it that would be unsafe in a bundle, and it imports nothing that would be.
 */
import { site, taglines } from "@/content/site";
import { bookingEmails, cancellationEmails } from "@/content/emails";
import { cancellationEmailCopy } from "@/content/cancellation";
import { t, type Locale } from "@/i18n/config";
import type { EmailMessage } from "@/lib/email";
import {
  emailButton,
  emailContacts,
  emailDetails,
  emailDivider,
  emailDocument,
  emailEyebrow,
  emailHeading,
  emailNote,
  emailPalette,
  emailParagraph,
  emailSpacer,
  escapeHtml,
  type DetailRow,
} from "@/lib/email-layout";
import { siteUrl, siteUrlLabel } from "@/lib/site-origin";

/** Everything the two emails need to know, already formatted for reading. */
export type BookingEmailFacts = {
  ref: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  /**
   * The language the guest booked and confirmed in — the `/pt` or `/en` prefix
   * of the path they were standing on. Decides the guest's mail entirely, and
   * is reported (not obeyed) in the team's.
   */
  locale: Locale;
  /** "Saturday, 15 August 2026" — already in the guest's language. */
  date: string;
  /** "Rural Saloia — experiência privada" — name plus how it was sold. */
  experience: string;
  /** "Manhã · 10h00" — the departure, in the guest's language. */
  departure: string;
  /**
   * True when the tour's departure has no clock time yet — `content/logistics.ts`
   * decides, the caller asks. The confirmation then promises the hour in
   * writing rather than sending a guest away with "at your departure time" and
   * no time anywhere in the mail, and the team's copy says who owes it.
   */
  departureTimeFollows: boolean;
  /** Where to be, with the team's own maps pin. `null` when the tour has none. */
  meetingPoint: { address: string; mapsUrl: string } | null;
  /** Add-on names, in the guest's language. Empty when there are none. */
  addOns: string[];
  partySize: number;
  /** "2 adultos · 1 criança (4–12)" — already in the guest's language. */
  partyLabel: string;
  /** "€340" — already formatted. */
  total: string;
  /** Deep link to the lead on the Sales board, for the team's copy. */
  adminUrl: string;
  /**
   * The guest's self-serve cancel link, token and all — or `null` when this
   * booking has none.
   *
   * **Null is a real state, not an oversight.** A booking made while
   * `BOOKING_TOKEN_SECRET` was unset never got a credential (see
   * `lib/booking-checkout.ts`), and the honest thing for its confirmation to do
   * is carry no cancel button rather than one that lands on "this link no
   * longer works". The free-cancellation promise above it still holds — it is
   * just answered by a phone call, the way it was before this link existed.
   *
   * **It is a credential.** It belongs in the guest's mail and nowhere else:
   * never in the team's copy (which is forwarded, and would hand a third party
   * the power to cancel someone's booking), never in an audit payload, never in
   * a log line.
   */
  cancelUrl: string | null;
};

/** Replace every `{key}` in `template`. Unknown keys are left alone, visibly. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

const [diogo, rita] = site.contacts;

/**
 * A footer line with the site's address linked in place of `{site}`.
 *
 * Split-escape-join rather than substitute-then-escape: the anchor has to reach
 * the client as markup while the sentence around it stays inert text, and doing
 * it the other way round would escape the link into visible angle brackets — or,
 * worse, teach the codebase that HTML may be interpolated before escaping.
 */
function footerWithSiteLink(template: string): string {
  const origin = siteUrl();
  return template
    .split("{site}")
    .map(escapeHtml)
    .join(
      `<a href="${origin}" style="color:${emailPalette.textMuted};text-decoration:underline;">${escapeHtml(siteUrlLabel(origin))}</a>`,
    );
}

/** Plain text: drops the empty lines an omitted section would otherwise leave. */
function textLines(lines: (string | null)[]): string {
  return lines.filter((line) => line !== null).join("\n");
}

/**
 * The guest's confirmation, in the language they booked in.
 *
 * `replyTo` is the business inbox rather than the sending address: a guest
 * replying "can we make it four people?" must reach a person, and the `From:`
 * on a transactional send is usually a no-reply domain.
 */
export function guestConfirmationEmail(facts: BookingEmailFacts): EmailMessage {
  const c = bookingEmails.guest;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    ref: facts.ref,
    experience: facts.experience,
    date: facts.date,
    party: String(facts.partySize),
    total: facts.total,
    site: siteUrl(),
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const addOnsList = facts.addOns.join(", ");

  // "What happens next" ends by referring to the guest's departure time. When
  // the tour has one, the details above it said so; when it does not, this is
  // the sentence that keeps the paragraph from pointing at nothing.
  const nextBody = facts.departureTimeFollows
    ? `${t(c.next.body, l)} ${t(c.departureTimeNote, l)}`
    : t(c.next.body, l);

  // Omitted entirely rather than left as an empty "Extras:" line — a
  // confirmation with a blank field on it reads like something went wrong.
  const rows: DetailRow[] = [
    { label: t(c.labels.reference, l), value: facts.ref, mono: true },
    { label: t(c.labels.experience, l), value: facts.experience },
    { label: t(c.labels.date, l), value: facts.date },
    { label: t(c.labels.departure, l), value: facts.departure },
    ...(facts.meetingPoint
      ? [
          {
            label: t(c.labels.meetingPoint, l),
            value: facts.meetingPoint.address,
            href: facts.meetingPoint.mapsUrl,
          },
        ]
      : []),
    { label: t(c.labels.party, l), value: facts.partyLabel },
    ...(facts.addOns.length > 0
      ? [{ label: t(c.labels.addOns, l), value: addOnsList }]
      : []),
    { label: t(c.labels.total, l), value: facts.total, emphasis: true },
  ];

  const text = textLines([
    greeting,
    "",
    t(c.lead, l),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    facts.meetingPoint ? `${t(c.labels.meetingPoint, l)}: ${facts.meetingPoint.mapsUrl}` : null,
    "",
    // One paragraph in text, two blocks in HTML: on a phone a wall of text is
    // read as a wall, but in a plain text mail an isolated line looks truncated.
    `${nextBody} ${t(c.cancellationNote, l)} ${t(c.changeNote, l)}`,
    "",
    // The URL bare on its own line: a text-only client has no button to render,
    // and a link split across a sentence is one a mail client will wrap and
    // break. Omitted whole when there is no token — see `cancelUrl`.
    ...(facts.cancelUrl
      ? [t(cancellationEmailCopy.intro, l), facts.cancelUrl, t(cancellationEmailCopy.warning, l), ""]
      : []),
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(c.preheader, l), values),
    banner: { text: t(c.banner, l) },
    content: [
      emailHeading(greeting),
      emailParagraph(t(c.lead, l), { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      emailSpacer(24),
      emailNote({ title: t(c.next.title, l), body: nextBody }),
      emailSpacer(16),
      emailParagraph(t(c.cancellationNote, l), { muted: true, spaceBelow: 8 }),
      // Directly under the promise it honours, so the sentence and the button
      // that performs it are read as one thing.
      ...(facts.cancelUrl
        ? [
            emailSpacer(12),
            emailParagraph(t(cancellationEmailCopy.intro, l), { spaceBelow: 12 }),
            emailButton({
              label: t(cancellationEmailCopy.button, l),
              href: facts.cancelUrl,
            }),
            emailSpacer(8),
            emailParagraph(t(cancellationEmailCopy.warning, l), {
              muted: true,
              spaceBelow: 12,
            }),
          ]
        : []),
      emailSpacer(8),
      emailParagraph(t(c.changeNote, l), { spaceBelow: 12 }),
      emailContacts(
        [diogo, rita].map((contact) => ({
          name: contact.name,
          display: contact.phoneDisplay,
          href: `tel:${contact.phone}`,
        })),
      ),
      emailSpacer(24),
      emailDivider(),
      emailSpacer(20),
      emailParagraph(t(c.signoff, l), { muted: true, spaceBelow: 0 }),
    ].join(""),
    footer: [escapeHtml(t(taglines, l)), footerWithSiteLink(t(c.footerNote, l))],
  });

  return {
    to: [facts.guestEmail],
    subject,
    text,
    html,
    replyTo: site.email,
  };
}

/**
 * The team's copy. Portuguese, and carrying the contact details the guest's
 * copy does not need — this is the message that turns into a phone call.
 */
export function teamNotificationEmail(
  facts: BookingEmailFacts,
  recipients: string[],
): EmailMessage {
  const c = bookingEmails.team;

  const values: Record<string, string> = {
    ref: facts.ref,
    date: facts.date,
    experience: facts.experience,
    party: String(facts.partySize),
    total: facts.total,
    name: facts.guestName,
    adminUrl: facts.adminUrl,
  };

  const subject = fill(c.subject, values);
  const phone = facts.guestPhone ?? "—";

  const bookingRows: DetailRow[] = [
    { label: c.labels.reference, value: facts.ref, mono: true },
    { label: c.labels.date, value: facts.date },
    { label: c.labels.departure, value: facts.departure },
    { label: c.labels.experience, value: facts.experience },
    ...(facts.addOns.length > 0
      ? [{ label: c.labels.addOns, value: facts.addOns.join(", ") }]
      : []),
    { label: c.labels.party, value: facts.partyLabel },
    { label: c.labels.total, value: facts.total, emphasis: true },
  ];

  // Tappable: on the phone this notification is read on, the next action is
  // either dialling the guest or writing to them.
  const guestRows: DetailRow[] = [
    { label: c.guestLabels.name, value: facts.guestName },
    {
      label: c.guestLabels.email,
      value: facts.guestEmail,
      href: `mailto:${facts.guestEmail}`,
    },
    {
      label: c.guestLabels.phone,
      value: phone,
      ...(facts.guestPhone ? { href: `tel:${facts.guestPhone}` } : {}),
    },
    { label: c.guestLabels.locale, value: facts.locale.toUpperCase() },
  ];

  const text = textLines([
    c.heading,
    "",
    ...bookingRows.map((row) => `${row.label}: ${row.value}`),
    facts.departureTimeFollows
      ? `\n${c.departureTimeNote.title}: ${c.departureTimeNote.body}`
      : null,
    "",
    c.guestHeading,
    ...guestRows.map((row) => `${row.label}: ${row.value}`),
    "",
    fill(c.ctaLine, values),
  ]);

  const html = emailDocument({
    lang: "pt",
    title: subject,
    preheader: fill(c.preheader, values),
    banner: { text: c.banner, background: emailPalette.primaryDark },
    content: [
      emailHeading(facts.guestName),
      emailParagraph(c.heading, { muted: true, spaceBelow: 24 }),
      emailEyebrow(c.detailsHeading),
      emailDetails(bookingRows),
      emailSpacer(24),
      // Only when the tour owes one: the guest has been promised an hour in
      // writing, and this notification is where that job is picked up.
      ...(facts.departureTimeFollows
        ? [emailNote(c.departureTimeNote), emailSpacer(24)]
        : []),
      emailDivider(),
      emailSpacer(24),
      emailEyebrow(c.guestHeading),
      // Without the name: it is the heading of this email. The text part keeps
      // it, because there it has no heading to be.
      emailDetails(guestRows.slice(1)),
      emailSpacer(28),
      emailButton({ label: c.cta, href: facts.adminUrl }),
    ].join(""),
    footer: [escapeHtml(c.footerNote)],
  });

  return {
    to: recipients,
    subject,
    text,
    html,
    // So hitting reply on the notification writes to the guest. This is the
    // single most common thing either of them will want to do with it.
    replyTo: facts.guestEmail,
  };
}

/**
 * The guest's cancellation receipt, in the language they booked in.
 *
 * Built from the same {@link BookingEmailFacts} the confirmation used, with one
 * field pointedly ignored: `cancelUrl`. The token behind it has been spent by
 * the time this is composed, and a dead link at the bottom of a receipt is a
 * small betrayal of the only job this email has — to be the thing a guest can
 * find again when they wonder whether the money is really coming back.
 */
export function guestCancellationEmail(facts: BookingEmailFacts): EmailMessage {
  const c = cancellationEmails.guest;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    ref: facts.ref,
    experience: facts.experience,
    date: facts.date,
    total: facts.total,
    site: siteUrl(),
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const refundBody = fill(t(c.refund.body, l), values);

  // No meeting point and no add-ons: this is a receipt for something that is
  // not happening, and every line that reads like an itinerary works against
  // that. What stays is what a guest would quote back to us on the phone.
  const rows: DetailRow[] = [
    { label: t(bookingEmails.guest.labels.reference, l), value: facts.ref, mono: true },
    { label: t(bookingEmails.guest.labels.experience, l), value: facts.experience },
    { label: t(bookingEmails.guest.labels.date, l), value: facts.date },
    { label: t(bookingEmails.guest.labels.departure, l), value: facts.departure },
    { label: t(bookingEmails.guest.labels.total, l), value: facts.total, emphasis: true },
  ];

  const text = textLines([
    greeting,
    "",
    t(c.lead, l),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    `${t(c.refund.title, l)}: ${refundBody}`,
    "",
    t(c.outro, l),
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(c.preheader, l), values),
    // Neutral rather than the confirmation's green: nothing here is a success
    // to celebrate, and nothing here is an error either.
    banner: { text: t(c.banner, l), background: emailPalette.textMuted },
    content: [
      emailHeading(greeting),
      emailParagraph(t(c.lead, l), { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      emailSpacer(24),
      emailNote({ title: t(c.refund.title, l), body: refundBody }),
      emailSpacer(24),
      emailParagraph(t(c.outro, l), { spaceBelow: 12 }),
      emailContacts(
        [diogo, rita].map((contact) => ({
          name: contact.name,
          display: contact.phoneDisplay,
          href: `tel:${contact.phone}`,
        })),
      ),
      emailSpacer(24),
      emailDivider(),
      emailSpacer(20),
      emailParagraph(t(c.signoff, l), { muted: true, spaceBelow: 0 }),
    ].join(""),
    footer: [escapeHtml(t(taglines, l)), footerWithSiteLink(t(c.footerNote, l))],
  });

  return { to: [facts.guestEmail], subject, text, html, replyTo: site.email };
}

/**
 * The team's cancellation notice. Portuguese, and about the departure rather
 * than about the guest: what this email is for is the seat coming free.
 *
 * `replyTo` is the guest, as on the booking notification — a cancellation
 * inside the window is the one Rita most often wants to answer personally, and
 * this makes that a single tap.
 */
export function teamCancellationEmail(
  facts: BookingEmailFacts,
  recipients: string[],
): EmailMessage {
  const c = cancellationEmails.team;

  const values: Record<string, string> = {
    ref: facts.ref,
    date: facts.date,
    experience: facts.experience,
    party: String(facts.partySize),
    total: facts.total,
    name: facts.guestName,
    adminUrl: facts.adminUrl,
  };

  const subject = fill(c.subject, values);

  const rows: DetailRow[] = [
    { label: c.labels.reference, value: facts.ref, mono: true },
    { label: c.labels.date, value: facts.date },
    { label: c.labels.departure, value: facts.departure },
    { label: c.labels.experience, value: facts.experience },
    { label: c.labels.party, value: facts.partyLabel },
    { label: c.labels.refund, value: facts.total, emphasis: true },
  ];

  const text = textLines([
    c.heading,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    `${c.released.title}: ${c.released.body}`,
    "",
    fill(c.ctaLine, values),
  ]);

  const html = emailDocument({
    lang: "pt",
    title: subject,
    preheader: fill(c.preheader, values),
    banner: { text: c.banner, background: emailPalette.textMuted },
    content: [
      emailHeading(facts.guestName),
      emailParagraph(c.heading, { muted: true, spaceBelow: 24 }),
      emailEyebrow(c.detailsHeading),
      emailDetails(rows),
      emailSpacer(24),
      emailNote(c.released),
      emailSpacer(28),
      emailButton({ label: c.cta, href: facts.adminUrl }),
    ].join(""),
    footer: [escapeHtml(c.footerNote)],
  });

  return { to: recipients, subject, text, html, replyTo: facts.guestEmail };
}
