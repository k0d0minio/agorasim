/**
 * Opening lines for reaching a guest, in the language they wrote to us in.
 *
 * The admin has no mail transport (see `inviteUser` in `app/admin/actions.ts`
 * for the same gap), so "contact this person" means handing their own mail app
 * or WhatsApp a message that is already addressed, already in the right
 * language, and already mentions what they asked about. That is the difference
 * between a reply that goes out during a tour break and one that waits for a
 * desk.
 *
 * The text is a starting point, not a script: it ends where the operator's own
 * sentence begins.
 */
import type { AppLocale } from "@/db/schema";

export type ContactContext = {
  name: string;
  locale: AppLocale | null;
  /** English name of the experience they asked about, if any. */
  experience: string | null;
};

/** First name only — "Olá Sofia" reads like a person, "Olá Sofia Almeida" does not. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

const COPY = {
  pt: {
    subject: (experience: string | null) =>
      experience ? `Agorasim — ${experience}` : "Agorasim — o seu pedido",
    greeting: (name: string) => `Olá ${name},`,
    thanks: (experience: string | null) =>
      experience
        ? `Obrigado pelo seu contacto sobre a experiência ${experience}.`
        : "Obrigado pelo seu contacto.",
    signoff: "Com os melhores cumprimentos,\nAgorasim",
  },
  en: {
    subject: (experience: string | null) =>
      experience ? `Agorasim — ${experience}` : "Agorasim — your enquiry",
    greeting: (name: string) => `Hello ${name},`,
    thanks: (experience: string | null) =>
      experience
        ? `Thank you for your enquiry about ${experience}.`
        : "Thank you for getting in touch.",
    signoff: "Kind regards,\nAgorasim",
  },
} as const;

function copyFor(locale: AppLocale | null) {
  return COPY[locale ?? "pt"];
}

/** Subject line for an email to this guest. */
export function contactSubject(context: ContactContext): string {
  return copyFor(context.locale).subject(context.experience);
}

/** Body for an email or a WhatsApp message — greeting, thanks, room to write. */
export function contactBody(context: ContactContext): string {
  const copy = copyFor(context.locale);
  return `${copy.greeting(firstName(context.name))}\n\n${copy.thanks(context.experience)}\n\n\n${copy.signoff}`;
}

/** `mailto:` link with the subject and body already filled in. */
export function mailtoHref(email: string, context: ContactContext): string {
  const params = new URLSearchParams({
    subject: contactSubject(context),
    body: contactBody(context),
  });
  return `mailto:${email}?${params.toString()}`;
}

/** `wa.me` link carrying the same opening message. */
export function whatsAppHref(number: string, context: ContactContext): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(contactBody(context))}`;
}
