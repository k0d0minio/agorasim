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
import { classicCars, site, taglines } from "@/content/site";
import { bookingEmails } from "@/content/emails";
import { serviceHoursLabel } from "@/content/quote-request";
import { termsContent, termsSection } from "@/content/terms";
import type { EnquiryKind } from "@/db/schema";
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
import { href } from "@/lib/routes";
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
  /** "Rural Saloia — por grupo" — name plus how it was sold. */
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
   * The guest's own cancel link — absolute, and carrying the plaintext token
   * this mail is the only place that will ever hold (`lib/cancellation-token.ts`).
   *
   * `null` when the booking has no usable token, and then the whole block is
   * omitted: the 48-hour promise still stands on the phone numbers below it,
   * and a confirmation offering a link that cannot know the guest is worse than
   * one that never offered it.
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

/** Where the terms of sale live for this locale, absolute — a mail has no base. */
function termsUrl(locale: Locale): string {
  return `${siteUrl()}${href(locale, "termos")}`;
}

/**
 * The withdrawal line, with the terms of sale linked in place of `{terms}`.
 *
 * Split-escape-join for the same reason as {@link footerWithSiteLink}: the
 * anchor has to reach the client as markup while the sentence around it stays
 * inert text. The label comes from `terms.ts`, so the link reads the same here
 * as it does above the pay button.
 */
function withdrawalWithTermsLink(locale: Locale): string {
  const label = t(termsContent.checkoutNotice.linkLabel, locale);
  return t(bookingEmails.guest.withdrawalNote, locale)
    .split("{terms}")
    .map(escapeHtml)
    .join(
      `<a href="${termsUrl(locale)}" style="color:${emailPalette.textMuted};text-decoration:underline;">${escapeHtml(label)}</a>`,
    );
}

/** Plain text: drops the empty lines an omitted section would otherwise leave. */
function textLines(lines: (string | null)[]): string {
  return lines.filter((line) => line !== null).join("\n");
}

/**
 * "2 adultos · 1 criança (4–12)" — the party, in the guest's language.
 *
 * Bands with nobody in them are simply not said, so a couple reads "2 adultos"
 * rather than "2 adultos · 0 crianças · 0 bebés". Falls back to the bare head
 * count for a row priced before the bands existed, where every band is zero and
 * the total is not.
 */
export function partyLabel(
  party: { adults: number; children: number; infants: number; partySize: number },
  locale: Locale,
): string {
  const w = bookingEmails.guest.partyWords;
  const label = [
    [party.adults, w.adult, w.adults] as const,
    [party.children, w.child, w.children] as const,
    [party.infants, w.infant, w.infants] as const,
  ]
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${t(count === 1 ? one : many, locale)}`)
    .join(" · ");

  return label || String(party.partySize);
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
    // The URL on its own line: a text client turns a bare link into a tappable
    // one, and a sentence wrapped around it is a link that breaks across lines.
    facts.cancelUrl
      ? fill(t(c.cancelLink.textLine, l), { url: facts.cancelUrl })
      : null,
    facts.cancelUrl ? "" : null,
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    siteUrl(),
    "",
    // The small print, last. In text an anchor is impossible, so the sentence
    // names the terms and the URL that reaches them is the line under it.
    fill(t(c.withdrawalNote, l), { terms: t(termsContent.checkoutNotice.linkLabel, l) }),
    fill(t(c.termsTextLine, l), { url: termsUrl(l) }),
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
      emailSpacer(8),
      emailParagraph(t(c.changeNote, l), { spaceBelow: 12 }),
      emailContacts(
        [diogo, rita].map((contact) => ({
          name: contact.name,
          display: contact.phoneDisplay,
          href: `tel:${contact.phone}`,
        })),
      ),
      // Below the phone numbers, not above them: the team would rather a guest
      // who is wavering rang them than pressed a button, and the ordering of a
      // confirmation email is the cheapest way to say so.
      ...(facts.cancelUrl
        ? [
            emailSpacer(24),
            emailDivider(),
            emailSpacer(20),
            emailParagraph(t(c.cancelLink.note, l), { muted: true, spaceBelow: 16 }),
            emailButton({ label: t(c.cancelLink.label, l), href: facts.cancelUrl }),
          ]
        : []),
      emailSpacer(24),
      emailDivider(),
      emailSpacer(20),
      emailParagraph(t(c.signoff, l), { muted: true, spaceBelow: 0 }),
    ].join(""),
    // The withdrawal statement sits in the footer rather than in the card: it
    // is said for the law, not for the guest, and the footer is the one part of
    // the shell that carries a link without the caller fighting the escaping.
    footer: [
      escapeHtml(t(taglines, l)),
      withdrawalWithTermsLink(l),
      footerWithSiteLink(t(c.footerNote, l)),
    ],
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
 * Everything the move notice needs — the confirmation's facts, plus the
 * departure this booking has just left.
 */
export type BookingMoveFacts = BookingEmailFacts & {
  /** "Saturday, 15 August 2026" — the day it *was* on, in the guest's language. */
  previousDate: string;
  /** "Manhã · 10h00" — the departure it was on. */
  previousDeparture: string;
};

/**
 * The guest's notice that their tour has been moved, in the language they
 * booked in.
 *
 * **Shaped like the confirmation, not like a memo.** The guest is still coming
 * — they need the details block, the meeting point, the hour and the reference,
 * exactly as the confirmation gave them, because this mail replaces it as the
 * one they will open on the morning. What the confirmation cannot say is which
 * plan is being corrected, so the departure they had is a row of its own above
 * the new one: without it, a mail listing a date nobody remembers agreeing to
 * reads as a second booking rather than a change to the first.
 *
 * **It carries a cancel link of its own.** A guest whose tour was moved without
 * being asked is precisely the one who may want out, and the link in their
 * original confirmation names a departure that no longer exists. The caller
 * (`lib/booking-move.ts`) mints the token that goes in it and only writes the
 * new digest to the row once this message has actually left, so a booking never
 * loses its working link to a mail that failed to send.
 *
 * `replyTo` is the business inbox, as on every other guest mail: "that day does
 * not work for us" has to reach a person.
 */
export function guestMoveEmail(facts: BookingMoveFacts): EmailMessage {
  const c = bookingEmails.moved;
  // The details block, the labels and the party words are the confirmation's:
  // this mail is that mail with a new date on it, and a second vocabulary for
  // the same rows is how "Ponto de encontro" ends up worded two ways.
  const g = bookingEmails.guest;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    ref: facts.ref,
    experience: facts.experience,
    date: facts.date,
    previousDate: facts.previousDate,
    party: String(facts.partySize),
    total: facts.total,
    site: siteUrl(),
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const lead = fill(t(c.lead, l), values);

  // Same sentence the confirmation appends when the tour owes an hour: the
  // guest is being sent to a departure whose time is still to follow, and this
  // mail is now the one they will read for it.
  const noteBody = facts.departureTimeFollows
    ? `${t(c.note.body, l)} ${t(g.departureTimeNote, l)}`
    : t(c.note.body, l);

  const rows: DetailRow[] = [
    { label: t(g.labels.reference, l), value: facts.ref, mono: true },
    { label: t(g.labels.experience, l), value: facts.experience },
    // The old departure first, so the new one below it is read as the answer to
    // it rather than as one more line of an unfamiliar list.
    {
      label: t(c.labels.previous, l),
      value: `${facts.previousDate} · ${facts.previousDeparture}`,
    },
    { label: t(g.labels.date, l), value: facts.date, emphasis: true },
    { label: t(g.labels.departure, l), value: facts.departure },
    ...(facts.meetingPoint
      ? [
          {
            label: t(g.labels.meetingPoint, l),
            value: facts.meetingPoint.address,
            href: facts.meetingPoint.mapsUrl,
          },
        ]
      : []),
    { label: t(g.labels.party, l), value: facts.partyLabel },
    ...(facts.addOns.length > 0
      ? [{ label: t(g.labels.addOns, l), value: facts.addOns.join(", ") }]
      : []),
    { label: t(g.labels.total, l), value: facts.total },
  ];

  const text = textLines([
    greeting,
    "",
    lead,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    facts.meetingPoint ? `${t(g.labels.meetingPoint, l)}: ${facts.meetingPoint.mapsUrl}` : null,
    "",
    `${t(c.note.title, l)}: ${noteBody}`,
    "",
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    facts.cancelUrl ? fill(t(g.cancelLink.textLine, l), { url: facts.cancelUrl }) : null,
    facts.cancelUrl ? "" : null,
    t(c.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(c.preheader, l), values),
    // The banner says it moved, in the banner's own words: a guest who reads
    // the first inch of this mail and stops must not come away believing the
    // original date still stands.
    banner: { text: t(c.banner, l) },
    content: [
      emailHeading(greeting),
      emailParagraph(lead, { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      emailSpacer(24),
      emailNote({ title: t(c.note.title, l), body: noteBody }),
      emailSpacer(16),
      emailContacts(
        [diogo, rita].map((contact) => ({
          name: contact.name,
          display: contact.phoneDisplay,
          href: `tel:${contact.phone}`,
        })),
      ),
      ...(facts.cancelUrl
        ? [
            emailSpacer(24),
            emailDivider(),
            emailSpacer(20),
            emailParagraph(t(g.cancelLink.note, l), { muted: true, spaceBelow: 16 }),
            emailButton({ label: t(g.cancelLink.label, l), href: facts.cancelUrl }),
          ]
        : []),
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

/** Which morning a reminder is sent on, relative to the tour. */
export type ReminderWhen = "tomorrow" | "today";

/**
 * Everything the day-before reminder needs — the confirmation's facts minus
 * the money and the cancel link, which this mail never carries (see
 * `bookingEmails.reminder`), plus which morning it is.
 */
export type ReminderEmailFacts = Pick<
  BookingEmailFacts,
  | "ref"
  | "guestName"
  | "guestEmail"
  | "locale"
  | "date"
  | "experience"
  | "departure"
  | "departureTimeFollows"
  | "meetingPoint"
  | "addOns"
  | "partyLabel"
> & { when: ReminderWhen };

/**
 * The §2.6 reminder, in the language the guest booked in.
 *
 * **The meeting point is the point.** The client's own line ends on it, so it
 * sits right under the departure, linked to the pin in the HTML and printed as
 * a bare URL in the text part, where a client makes it tappable.
 *
 * `replyTo` is the business inbox, as on every guest mail: "we are running
 * late" has to reach a person.
 */
export function guestReminderEmail(facts: ReminderEmailFacts): EmailMessage {
  const c = bookingEmails.reminder;
  const w = c[facts.when];
  // The labels are the confirmation's — one word for "Ponto de encontro".
  const g = bookingEmails.guest;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    ref: facts.ref,
    experience: facts.experience,
    date: facts.date,
    site: siteUrl(),
    diogoPhone: diogo.phoneDisplay,
    ritaPhone: rita.phoneDisplay,
  };

  const subject = fill(t(w.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const departureTime = facts.departureTimeFollows
    ? fill(t(c.departureTime.body, l), values)
    : null;

  const rows: DetailRow[] = [
    { label: t(g.labels.reference, l), value: facts.ref, mono: true },
    { label: t(g.labels.experience, l), value: facts.experience },
    { label: t(g.labels.date, l), value: facts.date },
    { label: t(g.labels.departure, l), value: facts.departure },
    ...(facts.meetingPoint
      ? [
          {
            label: t(g.labels.meetingPoint, l),
            value: facts.meetingPoint.address,
            href: facts.meetingPoint.mapsUrl,
          },
        ]
      : []),
    { label: t(g.labels.party, l), value: facts.partyLabel },
    ...(facts.addOns.length > 0
      ? [{ label: t(g.labels.addOns, l), value: facts.addOns.join(", ") }]
      : []),
  ];

  const text = textLines([
    greeting,
    "",
    t(w.lead, l),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    facts.meetingPoint ? `${t(g.labels.meetingPoint, l)}: ${facts.meetingPoint.mapsUrl}` : null,
    "",
    departureTime ? `${t(c.departureTime.title, l)}: ${departureTime}` : null,
    departureTime ? "" : null,
    t(c.changeNote, l),
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(w.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(c.preheader, l), values),
    banner: { text: t(w.banner, l) },
    content: [
      emailHeading(greeting),
      emailParagraph(t(w.lead, l), { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      ...(departureTime
        ? [emailSpacer(24), emailNote({ title: t(c.departureTime.title, l), body: departureTime })]
        : []),
      emailSpacer(24),
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
      emailParagraph(t(w.signoff, l), { muted: true, spaceBelow: 0 }),
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

/** Everything the cancellation notice needs, already formatted for reading. */
export type BookingCancellationFacts = {
  ref: string;
  guestName: string;
  guestEmail: string;
  /** The language the guest booked in — the language this goes out in. */
  locale: Locale;
  /** "Saturday, 15 August 2026" — already in the guest's language. */
  date: string;
  experience: string;
  /** "2 adultos · 1 criança (4–12)" — already in the guest's language. */
  partyLabel: string;
  /** "€340" — what they had paid, before any of it went back. */
  total: string;
  /** "€340" — what went back, or `null` when nothing did. */
  refund: string | null;
  /** True when the refund is smaller than {@link total}. */
  partialRefund: boolean;
};

/**
 * The guest's cancellation notice, in the language they booked in.
 *
 * One message for both paths that end a booking — the team cancelling from the
 * Sales board, and the guest's own cancel link — because what it has to say is
 * the same either way: the tour is off, and here is what
 * happened to the money. The two differ in who pressed the button, which is a
 * fact for the audit log, not for this email.
 *
 * `replyTo` is the business inbox, as on the confirmation: a cancelled tour is
 * the moment somebody is most likely to write back, and it must reach a person.
 */
export function guestCancellationEmail(facts: BookingCancellationFacts): EmailMessage {
  const c = bookingEmails.cancellation;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    ref: facts.ref,
    experience: facts.experience,
    date: facts.date,
    total: facts.total,
    refund: facts.refund ?? "",
    site: siteUrl(),
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);

  // The money, as one block: what went back and when to expect it, or a plain
  // statement that nothing did. Never both, and never neither.
  const moneyNote = facts.refund
    ? {
        title: t(c.refundLine.title, l),
        body: [
          fill(t(c.refundLine.body, l), values),
          facts.partialRefund ? fill(t(c.partialNote, l), values) : null,
        ]
          .filter((line) => line !== null)
          .join(" "),
      }
    : { title: t(c.noRefundLine.title, l), body: t(c.noRefundLine.body, l) };

  const rows: DetailRow[] = [
    { label: t(bookingEmails.guest.labels.reference, l), value: facts.ref, mono: true },
    { label: t(bookingEmails.guest.labels.experience, l), value: facts.experience },
    { label: t(bookingEmails.guest.labels.date, l), value: facts.date },
    { label: t(bookingEmails.guest.labels.party, l), value: facts.partyLabel },
    { label: t(c.labels.paid, l), value: facts.total },
    ...(facts.refund
      ? [{ label: t(c.labels.refund, l), value: facts.refund, emphasis: true }]
      : []),
  ];

  const text = textLines([
    greeting,
    "",
    fill(t(c.lead, l), values),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    `${moneyNote.title}: ${moneyNote.body}`,
    "",
    t(c.changeNote, l),
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
    // The muted strip, not the green one: this is not a confirmation, and a
    // cancellation wearing the confirmation's banner is a guest who reads the
    // first inch of the mail and believes the opposite of what it says.
    banner: { text: t(c.banner, l), background: emailPalette.textMuted },
    content: [
      emailHeading(greeting),
      emailParagraph(fill(t(c.lead, l), values), { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      emailSpacer(24),
      emailNote(moneyNote),
      emailSpacer(16),
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

/** Everything the team's cancellation notice needs, already formatted. */
export type TeamCancellationFacts = {
  ref: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  /** The language the guest booked in — reported here, not obeyed. */
  locale: Locale;
  /** "Saturday, 15 August 2026" — in the guest's language, as they saw it. */
  date: string;
  experience: string;
  departure: string;
  partyLabel: string;
  /** "€340" — what they had paid. */
  total: string;
  /** "€340" — what went back, or `null` when Stripe refused. */
  refund: string | null;
  /** True when the booking is cancelled and the money is still outstanding. */
  refundFailed: boolean;
  /** "15/08/2026, 23:04" — when the guest pressed the button, Lisbon time. */
  cancelledAt: string;
  /** Deep link to the lead on the Sales board. */
  adminUrl: string;
};

/**
 * The team's copy when a guest cancels themselves. Portuguese.
 *
 * The guest's own notice is `guestCancellationEmail` and goes out from
 * `lib/booking-refund.ts`, which is shared with the Sales board; this one has
 * no counterpart there on purpose. From the board the team *are* the ones who
 * pressed the button, and a notification would be the site telling them what
 * they had just done. The link is the only path that ends a booking with nobody
 * at the business awake, so it is the only path that owes them a message.
 *
 * `replyTo` is the guest, as on the new-booking notification: the likely next
 * action is writing to them, and a cancellation is when the team most wants to
 * ask whether another day would work.
 */
export function teamCancellationEmail(
  facts: TeamCancellationFacts,
  recipients: string[],
): EmailMessage {
  const c = bookingEmails.teamCancellation;

  const values: Record<string, string> = {
    ref: facts.ref,
    date: facts.date,
    experience: facts.experience,
    name: facts.guestName,
    total: facts.total,
    // The preheader states the money either way — "reembolso —" in an inbox
    // preview is what makes somebody open this one first.
    refund: facts.refund ?? "—",
    adminUrl: facts.adminUrl,
  };

  const subject = fill(c.subject, values);

  const bookingRows: DetailRow[] = [
    { label: bookingEmails.team.labels.reference, value: facts.ref, mono: true },
    { label: bookingEmails.team.labels.date, value: facts.date },
    { label: bookingEmails.team.labels.departure, value: facts.departure },
    { label: bookingEmails.team.labels.experience, value: facts.experience },
    { label: bookingEmails.team.labels.party, value: facts.partyLabel },
    { label: bookingEmails.team.labels.total, value: facts.total },
    { label: c.labels.refund, value: facts.refund ?? "—", emphasis: true },
    { label: c.labels.cancelledAt, value: facts.cancelledAt },
  ];

  const guestRows: DetailRow[] = [
    { label: bookingEmails.team.guestLabels.name, value: facts.guestName },
    {
      label: bookingEmails.team.guestLabels.email,
      value: facts.guestEmail,
      href: `mailto:${facts.guestEmail}`,
    },
    {
      label: bookingEmails.team.guestLabels.phone,
      value: facts.guestPhone ?? "—",
      ...(facts.guestPhone ? { href: `tel:${facts.guestPhone}` } : {}),
    },
    { label: bookingEmails.team.guestLabels.locale, value: facts.locale.toUpperCase() },
  ];

  const text = textLines([
    c.heading,
    "",
    ...bookingRows.map((row) => `${row.label}: ${row.value}`),
    facts.refundFailed ? `\n${c.refundFailed.title}: ${c.refundFailed.body}` : null,
    "",
    bookingEmails.team.guestHeading,
    ...guestRows.map((row) => `${row.label}: ${row.value}`),
    "",
    fill(c.ctaLine, values),
  ]);

  const html = emailDocument({
    lang: "pt",
    title: subject,
    preheader: fill(c.preheader, values),
    // Muted, like the guest's cancellation notice and for the same reason: this
    // is not a sale, and it must not read like one at a glance.
    banner: { text: c.banner, background: emailPalette.textMuted },
    content: [
      emailHeading(facts.guestName),
      emailParagraph(c.heading, { muted: true, spaceBelow: 24 }),
      emailEyebrow(c.detailsHeading),
      emailDetails(bookingRows),
      emailSpacer(24),
      // Only when there is a job outstanding. Everything else here is a record;
      // this is the one line that is a task.
      ...(facts.refundFailed ? [emailNote(c.refundFailed), emailSpacer(24)] : []),
      emailDivider(),
      emailSpacer(24),
      emailEyebrow(bookingEmails.team.guestHeading),
      // Without the name: it is the heading of this email.
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
    replyTo: facts.guestEmail,
  };
}

/** Everything the enquiry ack email needs, already formatted for reading. */
export type EnquiryEmailFacts = {
  /**
   * Which of the three doors it came through. `tour` is the `/reservar` form
   * and is answered with a date; `wedding` and `event` are the quote forms and
   * are answered with a price, which is the only thing these mails say
   * differently.
   */
  kind: EnquiryKind;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  locale: Locale;
  partySize: number | null;
  preferredDate: string | null;
  experience: string | null;
  /** Wedding and event enquiries only — null on a tour. */
  venue?: string | null;
  /** A {@link SERVICE_HOURS} key, resolved to a sentence here. */
  serviceHours?: string | null;
  /** A `classicCars` id, resolved to the car's name here. */
  preferredCar?: string | null;
  adminUrl: string;
};

/** The car they asked for, by the name it answers to. */
function carLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  const car = classicCars.find((entry) => entry.id === id);
  return car ? `${car.name} — ${car.model}` : id;
}

/**
 * The guest's acknowledgement, in the language they enquired in.
 *
 * Sent immediately on enquiry submission — no booking exists yet, so this is
 * a warm "we got it" rather than a details block. The meeting point and hour
 * are not known; the team fills those in when they reply.
 *
 * `replyTo` is the business inbox: the most likely next action from the guest
 * is a reply with more details or a question.
 */
export function guestEnquiryAckEmail(facts: EnquiryEmailFacts): EmailMessage {
  const c = bookingEmails.enquiryAck;
  const l = facts.locale;

  /*
   * A wedding or an event rewrites the four lines that make a promise, and
   * nothing else: same greeting, same two phone numbers, same sign-off. The
   * promise is the difference — "the team will be in touch to arrange the
   * details" is true of a tour and wrong of a wedding, which is answered with
   * a quote worked out by hand.
   */
  const voice = facts.kind === "tour" ? c : { ...c, ...c.quote };

  const values: Record<string, string> = {
    name: facts.guestName,
    site: siteUrl(),
  };

  const subject = fill(t(voice.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);

  const text = textLines([
    greeting,
    "",
    t(voice.lead, l),
    "",
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(voice.preheader, l), values),
    banner: { text: t(voice.banner, l) },
    content: [
      emailHeading(greeting),
      emailParagraph(t(voice.lead, l), { spaceBelow: 24 }),
      emailNote({
        title: t(c.note.title, l),
        body: t(c.note.body, l),
      }),
      emailSpacer(16),
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
 * The team's copy when a new enquiry arrives. Portuguese.
 *
 * Simpler than the booking notification: no reference, no payment, no
 * departure time. The team's next action is reading the message and replying.
 *
 * `replyTo` is the guest — same convention as the booking notification:
 * hitting reply writes to the person who filled the form.
 */
export function teamEnquiryEmail(
  facts: EnquiryEmailFacts,
  recipients: string[],
): EmailMessage {
  const c = bookingEmails.teamEnquiry;
  const isQuote = facts.kind !== "tour";

  const values: Record<string, string> = {
    name: facts.guestName,
    date: facts.preferredDate || "—",
    experience: facts.experience || "—",
    venue: facts.venue || "—",
    party: facts.partySize ? String(facts.partySize) : "—",
    adminUrl: facts.adminUrl,
  };

  const subject = fill(
    facts.kind === "tour" ? c.subject : c.quote.subject[facts.kind],
    values,
  );
  const phone = facts.guestPhone ?? "—";

  /*
   * What the team reads first. A quote enquiry drops the `Experiência` row —
   * it names none, by definition — for the three facts the price is worked out
   * from: where it is, how long for, and which car.
   */
  const enquiryRows: DetailRow[] = isQuote
    ? [
        { label: c.labels.date, value: facts.preferredDate || "—" },
        { label: c.quote.labels.venue, value: facts.venue || "—" },
        {
          label: c.quote.labels.hours,
          value: facts.serviceHours ? serviceHoursLabel(facts.serviceHours, "pt") : "—",
        },
        { label: c.quote.labels.car, value: carLabel(facts.preferredCar) ?? "—" },
        { label: c.labels.party, value: values.party },
      ]
    : [
        { label: c.labels.date, value: facts.preferredDate || "—" },
        { label: c.labels.experience, value: facts.experience || "—" },
        { label: c.labels.party, value: values.party },
      ];

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
    isQuote ? c.quote.heading : c.heading,
    "",
    ...enquiryRows.map((row) => `${row.label}: ${row.value}`),
    "",
    c.guestHeading,
    ...guestRows.map((row) => `${row.label}: ${row.value}`),
    "",
    fill(c.ctaLine, values),
  ]);

  const html = emailDocument({
    lang: "pt",
    title: subject,
    preheader: fill(isQuote ? c.quote.preheader : c.preheader, values),
    banner: {
      text: isQuote ? c.quote.banner : c.banner,
      background: emailPalette.primaryDark,
    },
    content: [
      emailHeading(facts.guestName),
      emailParagraph(isQuote ? c.quote.heading : c.heading, {
        muted: true,
        spaceBelow: 24,
      }),
      emailEyebrow(isQuote ? c.quote.detailsHeading : c.detailsHeading),
      emailDetails(enquiryRows),
      emailSpacer(24),
      emailDivider(),
      emailSpacer(24),
      emailEyebrow(c.guestHeading),
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
    replyTo: facts.guestEmail,
  };
}

/**
 * Everything the quote-sent email needs, already formatted in the couple's
 * language by the caller (`lib/quote-send.ts`) — this builder stays pure.
 */
export type QuoteSentEmailFacts = {
  /** `QT-1A2B3C` — what the couple quote on the phone. */
  ref: string;
  guestName: string;
  guestEmail: string;
  /** The quote's own language, which is the enquiry's. */
  locale: Locale;
  /** "sábado, 15 de agosto de 2026" — the event day. */
  date: string;
  /** Their venue, as typed on the quote. Omitted when there is none. */
  venue: string | null;
  /** The priced lines, amounts already formatted. */
  lines: { label: string; quantity: number; amount: string }[];
  total: string;
  deposit: string;
  depositPercent: number;
  /** What is left after the deposit and when it falls due, or `null` at a 100% deposit. */
  balance: { amount: string; dueDate: string } | null;
  /** How many days before the event the balance is asked for. */
  balanceDueDaysBefore: number;
  /** The non-refundable window the quote was written under (D9). */
  termsWindowDays: number;
  /**
   * The quote page, absolute, carrying the plaintext token this mail is the
   * only place that will ever hold (`lib/quote-token.ts`).
   */
  quoteUrl: string;
};

/**
 * The quote, sent to the couple in the language they enquired in.
 *
 * Shaped like the booking confirmation — a greeting, the facts table, what
 * happens next, the phone numbers — because it is read the same way: on a
 * phone, forwarded, and kept. The link to the quote page is the one action,
 * below the money rather than above it; nobody should be asked to pay before
 * they have read what for.
 *
 * `replyTo` is the business inbox: the next thing a couple does with a quote is
 * ask about it.
 */
export function guestQuoteSentEmail(facts: QuoteSentEmailFacts): EmailMessage {
  const c = bookingEmails.quoteSent;
  const l = facts.locale;

  const values: Record<string, string> = {
    name: facts.guestName,
    date: facts.date,
    total: facts.total,
    deposit: facts.deposit,
    site: siteUrl(),
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const nextBody = facts.balance
    ? fill(t(c.next.body, l), { days: String(facts.balanceDueDaysBefore) })
    : t(c.next.bodyFull, l);
  const termsNote = fill(t(c.termsNote, l), { days: String(facts.termsWindowDays) });

  const rows: DetailRow[] = [
    { label: t(c.labels.reference, l), value: facts.ref, mono: true },
    { label: t(c.labels.date, l), value: facts.date },
    ...(facts.venue ? [{ label: t(c.labels.venue, l), value: facts.venue }] : []),
    ...facts.lines.map((line) => ({
      label:
        line.quantity > 1
          ? fill(c.lineQuantity, { quantity: String(line.quantity), label: line.label })
          : line.label,
      value: line.amount,
    })),
    { label: t(c.labels.total, l), value: facts.total, emphasis: true },
    {
      label: fill(t(c.labels.deposit, l), { percent: String(facts.depositPercent) }),
      value: facts.deposit,
    },
    {
      label: t(c.labels.balance, l),
      value: facts.balance
        ? fill(t(c.balanceDue, l), { amount: facts.balance.amount, date: facts.balance.dueDate })
        : t(c.noBalance, l),
    },
  ];

  const text = textLines([
    greeting,
    "",
    t(c.lead, l),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    nextBody,
    "",
    // The URL on its own line, as the cancel link is — a text client makes a
    // bare line tappable and breaks one wrapped in a sentence.
    fill(t(c.ctaTextLine, l), { url: facts.quoteUrl }),
    "",
    termsNote,
    "",
    t(c.questions, l),
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
      emailSpacer(20),
      emailButton({ label: t(c.cta, l), href: facts.quoteUrl }),
      emailSpacer(20),
      emailParagraph(termsNote, { muted: true, spaceBelow: 16 }),
      emailParagraph(t(c.questions, l), { spaceBelow: 12 }),
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

/** Which instalment a quote receipt is for — the two kinds the log keys apart. */
export type QuoteReceiptInstalment = "deposit" | "balance";

/**
 * Everything the two quote receipts need, already formatted in the couple's
 * language by the caller (`lib/quote-checkout.ts`) — this builder stays pure.
 */
export type QuoteReceiptEmailFacts = {
  instalment: QuoteReceiptInstalment;
  /** `QT-1A2B3C`. */
  ref: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  /** The quote's own language, which is the enquiry's. */
  locale: Locale;
  /** The event day, formatted. */
  date: string;
  venue: string | null;
  /** What this payment was, formatted. */
  amount: string;
  /** The day it landed, formatted. */
  paidOn: string;
  total: string;
  /** What is still owed and by when, or `null` when nothing is. */
  remaining: { amount: string; dueDate: string } | null;
  /** How many days before the event the balance link is sent. */
  balanceDueDaysBefore: number;
  /** The fee Stripe routed, formatted — `null` on a platform-only charge. Team copy only. */
  fee: string | null;
  /** Deep link to the lead on the Sales board, for the team's copy. */
  adminUrl: string;
};

/**
 * The couple's receipt for one paid instalment — and their durable copy of
 * the event terms.
 *
 * The events section of the terms of sale is reproduced here verbatim, under
 * the version it carries, because a page we control is not a durable medium
 * (DL 24/2014 art. 4(1)) and this email is. It is read from `terms.ts`, the
 * same object the quote page renders above the pay button, so the two cannot
 * disagree about what was agreed.
 *
 * No link to the quote page: the plaintext token lives only in the quote-sent
 * email, and the webhook that usually sends this never has it.
 */
export function guestQuoteReceiptEmail(facts: QuoteReceiptEmailFacts): EmailMessage {
  const c = bookingEmails.quoteReceipt;
  const l = facts.locale;
  const which = facts.instalment;

  const values: Record<string, string> = {
    name: facts.guestName,
    date: facts.date,
    amount: facts.amount,
    due: facts.remaining?.dueDate ?? "",
    site: siteUrl(),
  };

  const subject = fill(t(c.subject[which], l), values);
  const greeting = fill(t(c.greeting, l), values);
  const events = termsSection("events", l);
  const termsHeading = fill(t(c.termsHeading, l), {
    version: t(termsContent.lastUpdated, l),
  });
  const nextBody = fill(t(c.next.body, l), { days: String(facts.balanceDueDaysBefore) });
  const fullTermsUrl = termsUrl(l);

  const rows: DetailRow[] = [
    { label: t(c.labels.reference, l), value: facts.ref, mono: true },
    { label: t(c.labels.date, l), value: facts.date },
    ...(facts.venue ? [{ label: t(c.labels.venue, l), value: facts.venue }] : []),
    { label: t(c.labels.paidOn, l), value: facts.paidOn },
    { label: t(c.labels.total, l), value: facts.total },
    {
      label: t(c.labels.remaining, l),
      value: facts.remaining
        ? fill(t(c.remainingDue, l), {
            amount: facts.remaining.amount,
            date: facts.remaining.dueDate,
          })
        : t(c.fullyPaid, l),
    },
    { label: t(c.labels.paid[which], l), value: facts.amount, emphasis: true },
  ];

  const text = textLines([
    greeting,
    "",
    t(c.lead[which], l),
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    facts.remaining ? nextBody : null,
    facts.remaining ? "" : null,
    termsHeading,
    events.heading,
    ...events.body,
    "",
    fill(t(c.fullTerms, l), { url: fullTermsUrl }),
    "",
    t(c.questions, l),
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    siteUrl(),
  ]);

  const html = emailDocument({
    lang: l,
    title: subject,
    preheader: fill(t(c.preheader[which], l), values),
    banner: { text: t(c.banner[which], l) },
    content: [
      emailHeading(greeting),
      emailParagraph(t(c.lead[which], l), { spaceBelow: 24 }),
      emailEyebrow(t(c.detailsHeading, l)),
      emailDetails(rows),
      emailSpacer(24),
      ...(facts.remaining
        ? [emailNote({ title: t(c.next.title, l), body: nextBody }), emailSpacer(24)]
        : []),
      emailDivider(),
      emailSpacer(20),
      emailEyebrow(termsHeading),
      emailParagraph(events.heading, { spaceBelow: 8 }),
      ...events.body.map((paragraph) => emailParagraph(paragraph, { muted: true, spaceBelow: 12 })),
      // The link as markup, the words around it inert — as in the withdrawal line.
      `<p style="margin:4px 0 20px;"><a href="${escapeHtml(fullTermsUrl)}" style="color:${emailPalette.textMuted};text-decoration:underline;">${escapeHtml(t(c.fullTermsLink, l))}</a></p>`,
      emailParagraph(t(c.questions, l), { spaceBelow: 12 }),
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
 * The team's notice of the same payment. Portuguese, with the fee Stripe took
 * and the couple's contact details — the mail Rita reads on her phone.
 */
export function teamQuoteReceiptEmail(
  facts: QuoteReceiptEmailFacts,
  recipients: string[],
): EmailMessage {
  const c = bookingEmails.teamQuoteReceipt;
  const which = facts.instalment;

  const values: Record<string, string> = {
    ref: facts.ref,
    name: facts.guestName,
    date: facts.date,
    amount: facts.amount,
    adminUrl: facts.adminUrl,
  };

  const subject = fill(c.subject[which], values);
  const heading = fill(c.heading[which], values);

  const rows: DetailRow[] = [
    { label: c.labels.reference, value: facts.ref, mono: true },
    { label: c.labels.date, value: facts.date },
    ...(facts.venue ? [{ label: c.labels.venue, value: facts.venue }] : []),
    { label: c.labels.total, value: facts.total },
    {
      label: c.labels.remaining,
      value: facts.remaining
        ? fill(c.remainingDue, { amount: facts.remaining.amount, date: facts.remaining.dueDate })
        : c.fullyPaid,
    },
    { label: c.labels.fee, value: facts.fee ?? c.noFee },
    { label: c.labels.amount, value: facts.amount, emphasis: true },
  ];

  const phone = facts.guestPhone ?? "—";
  const guestRows: DetailRow[] = [
    { label: c.guestLabels.name, value: facts.guestName },
    { label: c.guestLabels.email, value: facts.guestEmail, href: `mailto:${facts.guestEmail}` },
    {
      label: c.guestLabels.phone,
      value: phone,
      ...(facts.guestPhone ? { href: `tel:${facts.guestPhone}` } : {}),
    },
  ];

  const text = textLines([
    heading,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
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
    banner: { text: c.banner[which], background: emailPalette.primaryDark },
    content: [
      emailHeading(facts.guestName),
      emailParagraph(heading, { muted: true, spaceBelow: 24 }),
      emailEyebrow(c.detailsHeading),
      emailDetails(rows),
      emailSpacer(24),
      emailDivider(),
      emailSpacer(24),
      emailEyebrow(c.guestHeading),
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
    // Reply writes to the couple, as on every team notification.
    replyTo: facts.guestEmail,
  };
}
