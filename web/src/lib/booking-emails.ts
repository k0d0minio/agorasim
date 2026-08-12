/**
 * Turning a confirmed booking into the two emails it causes.
 *
 * Pure — it takes facts and returns {@link EmailMessage}s. Sending is
 * `lib/email.ts`'s job, and keeping the two apart is what lets the wording, the
 * substitution and the "what if there are no add-ons" case be unit-tested
 * without a mail server or a fake API key.
 *
 * No `server-only` marker here for the same reason: there is nothing in it that
 * would be unsafe in a bundle, and it imports nothing that would be.
 */
import { site } from "@/content/site";
import { bookingEmails } from "@/content/emails";
import { t, type Locale } from "@/i18n/config";
import type { EmailMessage } from "@/lib/email";

/** Everything the two emails need to know, already formatted for reading. */
export type BookingEmailFacts = {
  ref: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  locale: Locale;
  /** "Saturday, 15 August 2026" — already in the guest's language. */
  date: string;
  experience: string;
  /** Add-on names, in the guest's language. Empty when there are none. */
  addOns: string[];
  partySize: number;
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

const [diogo, rita] = site.contacts;

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
    // Omitted entirely rather than left as an empty "Add-ons:" line — a
    // confirmation with a blank field on it reads like something went wrong.
    addOns:
      facts.addOns.length > 0
        ? fill(t(c.addOnsLine, l), { list: facts.addOns.join(", ") })
        : "",
    diogo: diogo.phoneDisplay,
    rita: rita.phoneDisplay,
    site: site.domain,
  };

  return {
    to: [facts.guestEmail],
    subject: fill(t(c.subject, l), values),
    text: fill(t(c.body, l), values),
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
    email: facts.guestEmail,
    phone: facts.guestPhone ?? "—",
    locale: facts.locale.toUpperCase(),
    adminUrl: facts.adminUrl,
    addOns:
      facts.addOns.length > 0
        ? fill(c.addOnsLine, { list: facts.addOns.join(", ") })
        : "",
  };

  return {
    to: recipients,
    subject: fill(c.subject, values),
    text: fill(c.body, values),
    // So hitting reply on the notification writes to the guest. This is the
    // single most common thing either of them will want to do with it.
    replyTo: facts.guestEmail,
  };
}
