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
import { bookingEmails } from "@/content/emails";
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
};

/** Replace every `{key}` in `template`. Unknown keys are left alone, visibly. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

/** `https://agorasim.pt` → `agorasim.pt`, for a link nobody needs to read twice. */
const SITE_LABEL = site.domain.replace(/^https?:\/\//, "");

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
  return template
    .split("{site}")
    .map(escapeHtml)
    .join(
      `<a href="${site.domain}" style="color:${emailPalette.textMuted};text-decoration:underline;">${SITE_LABEL}</a>`,
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
    site: site.domain,
  };

  const subject = fill(t(c.subject, l), values);
  const greeting = fill(t(c.greeting, l), values);
  const addOnsList = facts.addOns.join(", ");

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
    `${t(c.next.body, l)} ${t(c.cancellationNote, l)} ${t(c.changeNote, l)}`,
    "",
    `${diogo.name} ${diogo.phoneDisplay}`,
    `${rita.name} ${rita.phoneDisplay}`,
    "",
    t(c.signoff, l),
    site.domain,
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
      emailNote({ title: t(c.next.title, l), body: t(c.next.body, l) }),
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
