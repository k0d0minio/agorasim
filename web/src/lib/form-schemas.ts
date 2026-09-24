/**
 * One schema per server action.
 *
 * This replaces two habits that had spread across the actions: a wall of
 * `String(formData.get("x") ?? "")` at the top of every one, and three copies
 * of the same `(ARRAY as string[]).includes(value)` type guard.
 *
 * The status and priority enums are built from the Drizzle `pgEnum`s
 * themselves, so they cannot drift from the database: add a value to the schema
 * and it is accepted here immediately; remove one and everything that still
 * mentions it stops type-checking.
 *
 * Server-only — it reaches into `@/db/schema` for those enums, which has no
 * business in a client bundle.
 *
 * **Language.** The messages below are UI copy, not diagnostics: the admin
 * actions hand them straight to a field's `role="alert"` paragraph (spec §8
 * E6), so an untranslated one is an English sentence on a Portuguese screen.
 * Everything down to the *Public tour-request form* heading is admin, and is
 * therefore Portuguese (D4). The two public schemas below it carry no messages
 * at all — the guest forms word their own errors, bilingually, from
 * `content/` — and must stay that way.
 */
import "server-only";

import { z } from "zod";

import {
  adminRoleEnum,
  availabilitySlotEnum,
  availabilityStatusEnum,
  enquiryKindEnum,
  experienceKindEnum,
  featureRequestPriorityEnum,
  featureRequestStatusEnum,
  localeEnum,
  requestStatusEnum,
} from "@/db/schema";
import {
  DELETE_CONFIRMATION,
  EVENT_CANCEL_CONFIRMATION,
  REFUND_CONFIRMATION,
} from "@/lib/admin-format";
import {
  DEFAULT_DRIVERS,
  isDateKey,
  MAX_DRIVERS,
  MAX_RANGE_DAYS,
  todayKey,
  TOUR_SLOTS,
} from "@/lib/availability";
import { MAX_PARTY_ONLINE } from "@/lib/fleet";
import { parseAmountInput, parsePriceInput } from "@/lib/money";
import { EXPERIENCE_ICON_KEYS, FALLBACK_EXPERIENCE_ICON } from "@/lib/experience-icons";
import { isExperienceBlobUrl, isLegacyImagePath } from "@/lib/experience-images";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { classicCars } from "@/content/site";
import { isServiceHours } from "@/content/quote-request";

// ---------------------------------------------------------------------------
// Enums, straight from the database schema
// ---------------------------------------------------------------------------

export const requestStatusSchema = z.enum(requestStatusEnum.enumValues);
export const enquiryKindSchema = z.enum(enquiryKindEnum.enumValues);
export const experienceKindSchema = z.enum(experienceKindEnum.enumValues);
export const featureRequestStatusSchema = z.enum(featureRequestStatusEnum.enumValues);
export const featureRequestPrioritySchema = z.enum(featureRequestPriorityEnum.enumValues);
export const localeSchema = z.enum(localeEnum.enumValues);
export const adminRoleSchema = z.enum(adminRoleEnum.enumValues);
export const availabilitySlotSchema = z.enum(availabilitySlotEnum.enumValues);
export const availabilityStatusSchema = z.enum(availabilityStatusEnum.enumValues);

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

/** A required text field. */
const text = z.string().trim();

/** An optional free-text column: absent or blank becomes SQL NULL. */
const optionalText = z
  .string()
  .trim()
  .catch("")
  .transform((value) => value || null);

/**
 * A free-text column a form may address *or leave alone*.
 *
 * Three states, not two: the field was posted with something in it (write it),
 * posted empty (clear it — the operator emptied the box), or not posted at all
 * (`undefined`, and the column keeps whatever it had). {@link optionalText}
 * collapses the last two, which is right for a form that always renders the
 * field and wrong for one that does not: the calendar's month sweeps post no
 * `note`, and they must not therefore erase one.
 */
const preservedText = z
  .string()
  .trim()
  .optional()
  .catch(undefined)
  .transform((value) => (value === undefined ? undefined : value || null));

/** Rough shape check only — deliverability is the mail server's problem. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `rural-saloia` — lowercase words joined by single hyphens. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A textarea holding paragraphs, separated by blank lines. */
const paragraphs = z
  .string()
  .catch("")
  .transform((value) =>
    value
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean),
  );

/** A textarea holding one item per line. */
const lines = z
  .string()
  .catch("")
  .transform((value) =>
    value
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean),
  );

/**
 * A repeated field. `formValues` collapses a single occurrence to a string, so
 * every list field has to widen it back — the same shape the add-ons and bulk-id
 * fields use.
 */
const repeated = z.preprocess(
  (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
  z.array(z.string()),
);

/**
 * How many people, as a public enquiry form asks it: a positive whole number,
 * or nothing at all. Anything else — "umas 40", a zero, an empty box — is
 * nothing, because neither enquiry form is willing to refuse a lead over the
 * one field the team will confirm on the phone anyway. Distinct from
 * {@link partyCount}, which prices a checkout and therefore refuses.
 */
const optionalCount = z
  .string()
  .trim()
  .catch("")
  .transform((value) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

/**
 * A stepper's count: an integer within [min, max], refused otherwise.
 *
 * A message may be passed by schemas that surface errors inline (the manual
 * booking form is Portuguese); the public checkout schema leaves the default,
 * because the guest UI words its own errors in both languages.
 */
const partyCount = (min: number, max: number, message = "Invalid input") =>
  z
    .string()
    .trim()
    .transform((value) => Number.parseInt(value, 10))
    .refine((n) => Number.isInteger(n) && n >= min && n <= max, message);

/**
 * `FormData` as a plain object `safeParse` can read. Repeated names (a checkbox
 * group) come back as an array, everything else as a single value.
 */
export function formValues(
  formData: FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of formData.keys()) {
    if (key in values) continue;
    const all = formData.getAll(key);
    values[key] = all.length > 1 ? all : all[0];
  }
  return values;
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  // Lower-cased here so the action's lookup matches how addresses are stored.
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
  password: z.string().min(1),
  // Only same-origin admin paths, so `next` can't be turned into an open redirect.
  next: z
    .string()
    .trim()
    .transform((value) => (value.startsWith("/admin") ? value : "/admin"))
    .catch("/admin"),
});

export const updateTourRequestStatusSchema = z.object({
  id: z.uuid(),
  status: requestStatusSchema,
});

export const updateFeatureRequestStatusSchema = z.object({
  id: z.uuid(),
  status: featureRequestStatusSchema,
});

export const featureRequestSchema = z.object({
  title: text.min(1, "Dê um título curto à sugestão."),
  description: text.min(1, "Descreva o que gostaria de ver."),
  category: optionalText,
  // Free-form field with a sane default — an unknown value is not worth an error.
  priority: featureRequestPrioritySchema.catch("medium"),
});

/** Field names `submitFeatureRequest` can report an inline error against. */
export type FeatureRequestField = "title" | "description";

// ---------------------------------------------------------------------------
// Lead detail — editing one enquiry from its own page
// ---------------------------------------------------------------------------

/**
 * The editable half of a lead. Triage (status) has its own control and is not
 * here; this is "the phone call corrected the party size and the date".
 *
 * Contact details are editable on purpose: a mistyped email is the single most
 * common reason a lead goes nowhere, and re-typing it into the guest's record is
 * the fix. Every save writes an audit entry naming the fields that changed —
 * never their guest-identifying values.
 */
export const updateTourRequestSchema = z.object({
  id: z.uuid(),
  name: text.min(1, "O pedido precisa de um nome."),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Escreva um endereço de email válido."),
  phone: optionalText,
  kind: enquiryKindSchema.catch("tour"),
  experienceSlug: optionalText.transform((slug) =>
    slug && SLUG_RE.test(slug) ? slug : null,
  ),
  addOns: repeated.transform((slugs) => slugs.filter((slug) => SLUG_RE.test(slug))),
  partySize: z
    .string()
    .trim()
    .catch("")
    .transform((value) => {
      const n = Number.parseInt(value, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  preferredDate: optionalText,
  message: optionalText,
  internalNotes: optionalText,
});

/** Field names `updateTourRequest` can report an inline error against. */
export type TourRequestEditField = "name" | "email";

export const tourRequestIdSchema = z.object({ id: z.uuid() });

// ---------------------------------------------------------------------------
// The experience catalogue
// ---------------------------------------------------------------------------

/**
 * One catalogue entry, as the editor submits it.
 *
 * The form is flat (`titlePt`, `titleEn`, …) because that is what an HTML form
 * is; the nesting the database wants is rebuilt by the transform at the end, in
 * one place, rather than by the action picking fields apart by hand.
 *
 * Both locales are required for every guest-facing string. That is the rule the
 * site already assumes — `t(value, locale)` has no fallback — and enforcing it
 * at the door is how the catalogue avoids growing rows that render blank for
 * half the visitors.
 */
export const experienceSchema = z
  .object({
    /** Absent when creating. Present, and the row's id, when editing. */
    id: z.uuid().optional().catch(undefined),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(SLUG_RE, "Use palavras minúsculas ligadas por hífenes, por exemplo rural-saloia."),
    kind: experienceKindSchema.catch("complement"),
    icon: z.enum(EXPERIENCE_ICON_KEYS).catch(FALLBACK_EXPERIENCE_ICON),
    /*
     * Exactly two shapes: a blob URL from the upload field, or a legacy
     * `/images/…` path committed to `web/public/` before uploads existed.
     * Anything else — a random external URL, a bare filename — would render a
     * broken image on the public site, so it is refused at the door.
     */
    image: z
      .string()
      .trim()
      .refine((value) => isExperienceBlobUrl(value) || isLegacyImagePath(value), {
        message: "Esta entrada ainda não tem fotografia — escolha uma antes de guardar.",
      }),
    /**
     * Price per person, as euros in a text box. Blank means unpriced, which is
     * a real and meaningful state — an unpriced experience cannot be sold, and
     * that is the correct behaviour until the real prices arrive (AGORA-002).
     * Anything unreadable is treated the same way rather than becoming zero:
     * a free tour is not a plausible reading of a typo.
     */
    price: z
      .string()
      .catch("")
      .transform((value) => parsePriceInput(value)),
    active: z.preprocess((value) => value === "on" || value === "true", z.boolean()).catch(true),
    sortOrder: z
      .string()
      .trim()
      .catch("")
      .transform((value) => {
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : 0;
      }),

    titlePt: text.min(1, "Falta o nome em português."),
    titleEn: text.min(1, "Falta o nome em inglês."),
    taglinePt: text.min(1, "Falta a frase de apresentação em português."),
    taglineEn: text.min(1, "Falta a frase de apresentação em inglês."),
    summaryPt: text.min(1, "Falta o resumo em português."),
    summaryEn: text.min(1, "Falta o resumo em inglês."),
    durationPt: text.min(1, "Falta a duração em português."),
    durationEn: text.min(1, "Falta a duração em inglês."),
    imageAltPt: text.min(1, "Descreva a fotografia em português."),
    imageAltEn: text.min(1, "Descreva a fotografia em inglês."),

    descriptionPt: paragraphs,
    descriptionEn: paragraphs,
    highlightsPt: lines,
    highlightsEn: lines,

    // Index-aligned across the four fields: row *n* of the FAQ editor.
    faqQuestionPt: repeated,
    faqQuestionEn: repeated,
    faqAnswerPt: repeated,
    faqAnswerEn: repeated,
  })
  .transform((value) => ({
    id: value.id,
    slug: value.slug,
    kind: value.kind,
    icon: value.icon,
    image: value.image,
    priceCents: value.price,
    active: value.active,
    sortOrder: value.sortOrder,
    title: { pt: value.titlePt, en: value.titleEn },
    tagline: { pt: value.taglinePt, en: value.taglineEn },
    summary: { pt: value.summaryPt, en: value.summaryEn },
    duration: { pt: value.durationPt, en: value.durationEn },
    imageAlt: { pt: value.imageAltPt, en: value.imageAltEn },
    description: { pt: value.descriptionPt, en: value.descriptionEn },
    highlights: { pt: value.highlightsPt, en: value.highlightsEn },
    /*
     * A FAQ row counts only when all four boxes are filled. A half-written
     * question is a draft the operator abandoned, not a question to publish in
     * one language and leave blank in the other — and it would land in the
     * page's FAQ JSON-LD exactly as written.
     */
    faqs: value.faqQuestionPt
      .map((questionPt, i) => ({
        question: { pt: questionPt.trim(), en: (value.faqQuestionEn[i] ?? "").trim() },
        answer: {
          pt: (value.faqAnswerPt[i] ?? "").trim(),
          en: (value.faqAnswerEn[i] ?? "").trim(),
        },
      }))
      .filter(
        (faq) => faq.question.pt && faq.question.en && faq.answer.pt && faq.answer.en,
      ),
  }));

/** Field names `saveExperience` can report an inline error against. */
export type ExperienceField =
  | "slug"
  | "image"
  | "titlePt"
  | "titleEn"
  | "taglinePt"
  | "taglineEn"
  | "summaryPt"
  | "summaryEn"
  | "durationPt"
  | "durationEn"
  | "imageAltPt"
  | "imageAltEn";

export const experienceIdSchema = z.object({ id: z.uuid() });

export const setExperienceActiveSchema = z.object({
  id: z.uuid(),
  active: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export const moveExperienceSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});

export const deleteExperienceSchema = z.object({
  id: z.uuid(),
  confirm: z.literal(DELETE_CONFIRMATION, `Escreva ${DELETE_CONFIRMATION} para confirmar.`),
});

// ---------------------------------------------------------------------------
// The Blog studio
// ---------------------------------------------------------------------------

/**
 * The half of an article the studio may change.
 *
 * Not the body: the prose is the pipeline's output, reviewed as markdown in
 * `src/content/generated/blog/` and re-loaded from there. What Diogo & Rita
 * genuinely need to fix in place is the shop window — the headline a reader
 * sees on the card and in Google, and the sentence under it. A body editor here
 * would be a second source of truth for the article, and the next load would
 * silently win.
 *
 * Both languages required, for the reason every localized pair on this site is:
 * `t()` has no fallback, so a blanked English title renders as nothing at all.
 */
export const blogPostSchema = z.object({
  id: z.uuid(),
  titlePt: text.min(1, "Escreva o título em português."),
  titleEn: text.min(1, "Escreva o título em inglês."),
  excerptPt: text.min(1, "Escreva o resumo em português."),
  excerptEn: text.min(1, "Escreva o resumo em inglês."),
});

/** Field names `saveBlogPost` can report an inline error against. */
export type BlogPostField = "titlePt" | "titleEn" | "excerptPt" | "excerptEn";

/**
 * Putting an article on the site, or taking it off.
 *
 * One schema with a boolean rather than two actions: it is one control in the
 * UI, and the audit entry differs only in which verb it names.
 */
export const setBlogPostPublishedSchema = z.object({
  id: z.uuid(),
  published: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

// ---------------------------------------------------------------------------
// The availability calendar
// ---------------------------------------------------------------------------

/**
 * The days a calendar write applies to.
 *
 * One field for both shapes the admin submits: a single tapped day, and the
 * whole month behind a bulk button. `formValues` collapses one occurrence to a
 * string, so `repeated` widens it back, and anything that is not a real
 * calendar day is dropped rather than rejected — a form carrying one malformed
 * date should still open the other thirty.
 *
 * The list is capped: a month is 31 days and a year is 366, so a request
 * naming more days than that is not the admin calendar talking.
 */
const dateKeys = repeated.transform((values) =>
  Array.from(new Set(values.filter(isDateKey))).sort().slice(0, MAX_RANGE_DAYS),
);

/**
 * Open or close days. One schema for one day and for a bulk sweep, because the
 * action is the same action — see the note on `saveExperience` for the same
 * reasoning about create-vs-update.
 */
/**
 * The departures a calendar write applies to — the two the business runs.
 * `full_day` is enum history (see `db/schema.ts`), never a valid submission.
 */
const tourSlots = repeated.transform((values) =>
  Array.from(
    new Set(values.filter((value): value is "morning" | "afternoon" =>
      value === "morning" || value === "afternoon",
    )),
  ),
);

/**
 * A seasonal window, as two day keys.
 *
 * "We are closed until April" is one gesture and must not arrive as three
 * hundred hidden inputs. Both ends are optional — a form that posts `dates`
 * instead simply leaves them out — and a value that is not a real day becomes
 * `undefined` rather than rejecting the whole submission, which keeps a
 * half-filled range from losing the day the operator also tapped.
 */
const optionalDateKey = z
  .string()
  .trim()
  .catch("")
  .transform((value) => (isDateKey(value) ? value : undefined));

export const setAvailabilitySchema = z.object({
  dates: dateKeys,
  /** Inclusive range, expanded server-side. Combined with `dates`, not instead. */
  from: optionalDateKey,
  to: optionalDateKey,
  slots: tourSlots,
  status: availabilityStatusSchema,
  /**
   * Drivers rostered on each departure. Clamped rather than refused: this
   * arrives from a stepper whose buttons already stop at the bounds, so an
   * out-of-range value is a crafted request, and the useful answer to one is
   * the nearest legal number. The ceiling is the real roster — a third driver
   * is AGORA-019's question, not this form's.
   */
  drivers: z
    .string()
    .trim()
    .catch("")
    .transform((value) => {
      // Not posted at all: the write is not about the roster. A month sweep
      // knows nothing about who is driving on the 14th and must leave Rita's
      // answer where it is — see `upsertDays`.
      if (value === "") return undefined;
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n)) return DEFAULT_DRIVERS;
      return Math.min(MAX_DRIVERS, Math.max(1, n));
    }),
  /** Absent leaves the note alone; posted-and-empty clears it. */
  note: preservedText,
});

/** Remove rows outright — "nobody has decided about these departures". */
export const clearAvailabilitySchema = z.object({
  dates: dateKeys,
  from: optionalDateKey,
  to: optionalDateKey,
  slots: tourSlots,
});

// ---------------------------------------------------------------------------
// Account management (owner-only actions)
// ---------------------------------------------------------------------------

/**
 * Length is the only password rule — see `MIN_PASSWORD_LENGTH` in `lib/password.ts`
 * for why composition rules are deliberately absent.
 */
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Escreva um endereço de email válido."),
  name: text.min(1, "Indique o nome da pessoa."),
  password,
  role: adminRoleSchema,
});

/** Field names `inviteUser` can report an inline error against. */
export type InviteUserField = "email" | "name" | "password";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escreva a sua palavra-passe atual."),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As duas palavras-passe não coincidem.",
  });

/** Field names `changeOwnPassword` can report an inline error against. */
export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export const adminUserIdSchema = z.object({ id: z.uuid() });

// ---------------------------------------------------------------------------
// Data-subject rights (owner-only actions)
// ---------------------------------------------------------------------------

/**
 * Destructive actions carry a typed confirmation, not just a click: the dialog
 * asks for the word so a mis-tap cannot erase a person's record. The word itself
 * lives in `admin-format.ts`, which the dialog can also import.
 */
export const deleteTourRequestSchema = z.object({
  id: z.uuid(),
  confirm: z.literal(DELETE_CONFIRMATION, `Escreva ${DELETE_CONFIRMATION} para confirmar.`),
});

export const exportSubjectSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
});

// ---------------------------------------------------------------------------
// Cancelling a paid booking
// ---------------------------------------------------------------------------

/**
 * Cancel and refund, from the Sales board.
 *
 * The amount is typed rather than picked, because "how much goes back" is the
 * judgement the team is actually making — full for weather, part of it for a
 * late cancellation met with goodwill, and `0` for neither. It is parsed with
 * {@link parseAmountInput} precisely so a typed zero survives as `0` instead of
 * arriving as an empty field.
 *
 * The ceiling is *not* checked here: how much is left to refund is a fact about
 * the booking row, which a schema over a `FormData` has no way to read. The
 * action re-reads the booking and validates against `refundableCents` — the same
 * reason it, and not this, decides whether the booking may be cancelled at all.
 */
export const cancelBookingSchema = z.object({
  bookingId: z.uuid(),
  refundAmount: z
    .string()
    .transform((value) => parseAmountInput(value))
    .refine((cents) => cents !== null, "Indique o valor a reembolsar, ou 0.")
    .transform((cents) => cents as number),
  confirm: z.literal(
    REFUND_CONFIRMATION,
    `Escreva ${REFUND_CONFIRMATION} para confirmar.`,
  ),
});

/**
 * Moving a booking to another departure.
 *
 * No typed confirmation, unlike the cancellation above, and the difference is
 * the gesture: a refund moves money and cannot be taken back, while a move is
 * an edit that can be made again in the other direction. What stands between a
 * mis-tap and a moved tour is that the operator has to have chosen a day *and*
 * a departure from a list of the ones that can actually take this party.
 *
 * The slot is checked against the two departures the business runs rather than
 * against the enum, which still carries the retired `full_day` value that
 * nothing may be moved onto.
 */
export const moveBookingSchema = z.object({
  bookingId: z.uuid(),
  date: z
    .string()
    .trim()
    .refine((value) => isDateKey(value), "Escolha uma data para a nova partida."),
  slot: z.enum(TOUR_SLOTS, "Escolha a partida da manhã ou da tarde."),
});

// ---------------------------------------------------------------------------
// The quote builder (a wedding or event lead, on the Sales detail)
// ---------------------------------------------------------------------------

/** One priced line as the builder parsed it — `quotes.line_items`' shape. */
export type QuoteLineInput = { label: string; unitCents: number; quantity: number };

/**
 * The lines, from three repeated fields walked in step — `lineLabel`,
 * `lineQuantity`, `lineUnit` (euros, as typed).
 *
 * A row left entirely blank is not a line: the builder always offers one empty
 * row to type into, and saving with it untouched is not a mistake. A row with
 * anything in it must be whole — a description, a whole quantity above zero, a
 * price in euros — and the first incomplete row is named by its number, so the
 * message points at the row Rita has to fix rather than at the form.
 */
function parseQuoteLines(
  labels: string[],
  quantities: string[],
  units: string[],
  ctx: z.RefinementCtx,
): QuoteLineInput[] {
  const lines: QuoteLineInput[] = [];
  const rows = Math.max(labels.length, quantities.length, units.length);

  for (let i = 0; i < rows; i++) {
    const label = (labels[i] ?? "").trim();
    const quantityText = (quantities[i] ?? "").trim();
    const unitText = (units[i] ?? "").trim();
    if (!label && !unitText && (!quantityText || quantityText === "1")) continue;

    const n = i + 1;
    if (!label) {
      ctx.addIssue({ code: "custom", message: `A linha ${n} precisa de uma descrição.` });
      return [];
    }
    const quantity = Number(quantityText || "1");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      ctx.addIssue({
        code: "custom",
        message: `A quantidade da linha ${n} tem de ser um número inteiro maior que zero.`,
      });
      return [];
    }
    // Two decimals at most, unlike `parseAmountInput`'s three: in Portuguese
    // "1.500" is fifteen hundred euros, and read as €1.50 it is a wedding
    // quoted a thousand times too low. Refused, so Rita types "1500".
    const unitCents = /[.,]\d{3}$/.test(unitText) ? null : parseAmountInput(unitText);
    if (unitCents === null) {
      ctx.addIssue({
        code: "custom",
        message: `Indique o preço da linha ${n} em euros, sem separador de milhares (ex.: 1500 ou 1500,50).`,
      });
      return [];
    }
    lines.push({ label: label.slice(0, 200), unitCents, quantity });
  }

  if (lines.length === 0) {
    ctx.addIssue({ code: "custom", message: "Acrescente pelo menos uma linha ao orçamento." });
  }
  return lines;
}

/**
 * Saving a quote draft — "Criar orçamento" (with `leadId`) or "Guardar" on an
 * existing draft (with `quoteId`).
 *
 * The total is not a field: it is the sum of the lines (D-3, settled at
 * Define), so there is no figure to disagree with them. The deposit share is a
 * whole percentage, 30 by default in the form; the non-refundable window is
 * not offered at all and stays at D9's 30 days.
 */
export const quoteDraftSchema = z
  .object({
    leadId: z.uuid().optional(),
    quoteId: z.uuid().optional(),
    eventDate: z
      .string()
      .trim()
      .refine((value) => isDateKey(value), "Indique a data do evento.")
      .refine((value) => !isDateKey(value) || value >= todayKey(), "A data do evento já passou."),
    venue: z
      .string()
      .trim()
      .catch("")
      .transform((value) => (value ? value.slice(0, 300) : null)),
    depositPercent: z
      .string()
      .trim()
      .transform((value) => Number(value))
      .refine(
        (n) => Number.isInteger(n) && n >= 1 && n <= 100,
        "O sinal tem de ser uma percentagem entre 1 e 100.",
      ),
    lineLabel: repeated,
    lineQuantity: repeated,
    lineUnit: repeated,
  })
  .refine((value) => Boolean(value.leadId) !== Boolean(value.quoteId), "Pedido inválido.")
  .transform((value, ctx) => ({
    leadId: value.leadId ?? null,
    quoteId: value.quoteId ?? null,
    eventDate: value.eventDate,
    venue: value.venue,
    depositPercent: value.depositPercent,
    lineItems: parseQuoteLines(value.lineLabel, value.lineQuantity, value.lineUnit, ctx),
  }));

/** A button on one quote — discard, new version, send. */
export const quoteIdSchema = z.object({ quoteId: z.uuid() });

/**
 * "Reembolsar" on one instalment of a quote.
 *
 * Unlike the tour's, `0` is not an answer here: this refunds and does nothing
 * else unless the box says so, and a refund of nothing is a no-op dressed as an
 * action. The ceiling is the action's to check, against the row, for the
 * reason {@link cancelBookingSchema} gives. The box arrives as `"on"` or not at
 * all, the way a checkbox posts.
 */
export const refundQuotePaymentSchema = z.object({
  paymentId: z.uuid(),
  refundAmount: z
    .string()
    .transform((value) => parseAmountInput(value))
    .refine((cents) => cents !== null && cents > 0, "Indique o valor a reembolsar.")
    .transform((cents) => cents as number),
  cancelEvent: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  confirm: z.literal(
    REFUND_CONFIRMATION,
    `Escreva ${REFUND_CONFIRMATION} para confirmar.`,
  ),
});

/** "Cancelar evento" on a quote whose deposit has gone back in full. */
export const cancelHeldQuoteSchema = z.object({
  quoteId: z.uuid(),
  confirm: z.literal(
    EVENT_CANCEL_CONFIRMATION,
    `Escreva ${EVENT_CANCEL_CONFIRMATION} para confirmar.`,
  ),
});

/**
 * "Reenviar" — the quote, and the `sent_at` the operator's screen showed, so a
 * second tap (or a second phone) finds a newer stamp and does nothing.
 */
export const resendQuoteSchema = z.object({
  quoteId: z.uuid(),
  sentAt: z
    .string()
    .trim()
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Recarregue a página e tente outra vez."),
});

// ---------------------------------------------------------------------------
// Manual booking (a cash sale, from the calendar day sheet)
// ---------------------------------------------------------------------------

/**
 * A booking sold over the phone or in person, recorded straight into the
 * calendar without Stripe in the middle.
 *
 * Most of it is the *checkout* schema's shape — tour, date, departure, party in
 * the price bands, add-ons — plus the guest whose name the Sales board will
 * show. The differences are the two things a phone sale is:
 *
 * - **No stripeSessionId / hold.** The public schema hides the capacity check
 *   behind a booked calendar; here the booking is `confirmed` the moment it is
 *   created.
 * - **An editable `amount`, for the negotiated cash deal.** Blank uses the
 *   catalogue total, exactly as checkout would have priced it. A typed figure
 *   is the deal the team actually agreed, which is recorded on the row and
 *   reconciled in the `priceBreakdown` — a deal cheaper than the list is
 *   recorded honestly, not as a phantom full-price booking. A typed `0` is a
 *   real answer too: a favour, a payment still pending elsewhere.
 *
 * What is deliberately absent is a payment method field: the calendar records
 * cash rows, and everything else this schema could say (`stripe`) belongs on
 * the checkout path.
 */
export const createManualBookingSchema = z.object({
  /**
   * The enquiry this sale answers, when the sheet was opened from the Sales
   * board rather than from a day in the Calendar.
   *
   * Absent is the calendar's mount and means "there is no lead yet" — the
   * action creates one. Present and malformed is *not* the same thing and must
   * never fall through to that: it would record a phone sale against a new
   * stranger while the enquiry it answers sat untouched in `Novo`. So no
   * `.catch()` here; a broken id is a refusal.
   */
  leadId: z.uuid("Esse pedido já não existe.").optional(),
  /** Must be a real calendar day; the action re-checks it on sale/open. */
  date: z
    .string()
    .trim()
    .refine((value) => isDateKey(value), "Escolha uma data válida."),
  slot: z.enum(TOUR_SLOTS, "Escolha a partida da manhã ou da tarde."),
  experience: z
    .string()
    .trim()
    .regex(SLUG_RE, "Esta experiência não existe."),
  /** Shared departure or the whole slot — repriced server-side either way. */
  mode: z.enum(["public", "private"]).catch("public"),
  addOns: repeated.transform((slugs) => slugs.filter((slug) => SLUG_RE.test(slug))),
  adults: partyCount(1, MAX_PARTY_ONLINE, "Diga quantos adultos vêm (1 a 8)."),
  children: partyCount(0, MAX_PARTY_ONLINE).catch(0),
  infants: partyCount(0, MAX_PARTY_ONLINE).catch(0),
  /** Who reserves — the name the Sales board will show. */
  name: text.min(1, "Diga o nome de quem reserva."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Escreva um endereço de email válido."),
  phone: optionalText,
  /**
   * The agreed cash deal, as euros in a text box. Blank (or unreadable) means
   * "charge the catalogue total"; a typed figure overrides it — see the note
   * above the schema.
   */
  amount: z.string().trim().catch("").transform(parseAmountInput),
});

/** Field names `createManualBooking` can report an inline error against. */
export type ManualBookingField = "date" | "slot" | "experience" | "party" | "name" | "email";

// ---------------------------------------------------------------------------
// Public tour-request form
// ---------------------------------------------------------------------------

/**
 * The public onboarding form. Error *messages* are not set here: they are
 * bilingual and live in `content/tour-request.ts`, so the action maps a failed
 * field onto the localized copy.
 */
export const tourRequestSchema = z.object({
  name: text.min(1),
  email: text.regex(EMAIL_RE),
  phone: optionalText,
  preferredDate: optionalText,
  message: optionalText,
  /*
   * Shape only. Which slugs actually exist is a question for the catalogue,
   * which lives in the database and changes whenever Rita adds an add-on — so
   * the action checks the submitted slugs against it (`submitTourRequest`) and
   * this schema just refuses anything that isn't slug-shaped. An unrecognised
   * slug is dropped rather than rejected: the enquiry still matters.
   */
  experience: optionalText.transform((slug) =>
    slug && SLUG_RE.test(slug) ? slug : null,
  ),
  partySize: optionalCount,
  addOns: repeated.transform((slugs) => slugs.filter((slug) => SLUG_RE.test(slug))),
  /**
   * Marketing opt-in. An unticked checkbox submits nothing at all, so absence is
   * the "no" — which is exactly the default the GDPR requires. Consent is never
   * inferred from the presence of the rest of the form.
   */
  marketingConsent: z
    .preprocess((value) => value === "on" || value === "true", z.boolean())
    .catch(false),
});

/** Field names `submitTourRequest` can report an inline error against. */
export type TourRequestField = "name" | "email" | "preferredDate";

// ---------------------------------------------------------------------------
// Public wedding & event quote form
// ---------------------------------------------------------------------------

/**
 * The quote form on `/casamentos` and `/eventos`.
 *
 * Deliberately close to {@link tourRequestSchema} and deliberately not the same
 * one: a tour enquiry picks an experience off the catalogue, a quote enquiry
 * names a venue and a car. Both write `tour_requests`; `kind` is what tells
 * them apart on the Sales board.
 *
 * Only the name and the e-mail can fail. Everything a quote is priced from —
 * the date, the venue, the party — is asked for plainly and accepted empty,
 * because a couple who have not settled on a church yet are still a lead, and
 * this site does not trade leads for tidy rows.
 */
export const quoteRequestSchema = z.object({
  /**
   * Which door they came through, from a hidden field. Not trusted so much as
   * not worth distrusting: the worst a forged value does is put a card under
   * the wrong badge, which an operator can change on the lead's own page. An
   * unreadable one files as `event`, the more general of the two.
   */
  kind: z.enum(["wedding", "event"]).catch("event"),
  name: text.min(1),
  email: text.regex(EMAIL_RE),
  phone: optionalText,
  /** A `type="date"` field, so `YYYY-MM-DD` — stored in `preferred_date`. */
  preferredDate: optionalText,
  venue: optionalText,
  /**
   * A key from {@link SERVICE_HOURS}, never the label the guest saw. An
   * unrecognised one is dropped rather than rejected — the same reading as an
   * unknown experience slug on the tour enquiry, for the same reason.
   */
  serviceHours: optionalText.transform((value) =>
    value && isServiceHours(value) ? value : null,
  ),
  /** A `classicCars` id, or null for "advise us" — and for anything we retired. */
  preferredCar: optionalText.transform((value) =>
    value && classicCars.some((car) => car.id === value) ? value : null,
  ),
  partySize: optionalCount,
  message: optionalText,
  /** Same rules as everywhere else — see {@link tourRequestSchema}. */
  marketingConsent: z
    .preprocess((value) => value === "on" || value === "true", z.boolean())
    .catch(false),
});

/** Field names `submitQuoteRequest` can report an inline error against. */
export type QuoteRequestField = "name" | "email";

// ---------------------------------------------------------------------------
// Public booking checkout
// ---------------------------------------------------------------------------

/**
 * A booking, as the checkout form submits it.
 *
 * Stricter than the enquiry schema above, and the difference is the point: an
 * enquiry is a conversation starter, so an unrecognised add-on slug is dropped
 * and a missing date is fine. This one ends in a card being charged, so every
 * field it prices from has to be exactly what it says it is. The action refuses
 * anything the catalogue does not recognise rather than quietly selling a
 * cheaper day than the guest chose.
 *
 * Note what is *not* here: a price. The total is computed server-side from the
 * catalogue (`lib/bookings.ts`), and the number the browser was shown is never
 * read back.
 */
export const bookingCheckoutSchema = z.object({
  name: text.min(1),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
  phone: optionalText,
  message: optionalText,

  /** Must be a real calendar day; the action re-checks it is on sale. */
  date: z.string().trim().refine(isDateKey),
  /** Which departure of that day — 10:00 or 14:00. */
  slot: z.enum(["morning", "afternoon"]),
  experience: z.string().trim().regex(SLUG_RE),
  /** Shared departure or the whole slot — repriced server-side either way. */
  mode: z.enum(["public", "private"]),
  addOns: repeated.transform((slugs) => slugs.filter((slug) => SLUG_RE.test(slug))),
  /**
   * The party in the price list's bands. Bounds are sanity only — the pricing
   * engine and the availability re-check are the real referees.
   */
  adults: partyCount(1, MAX_PARTY_ONLINE),
  children: partyCount(0, MAX_PARTY_ONLINE).catch(0),
  infants: partyCount(0, MAX_PARTY_ONLINE).catch(0),

  marketingConsent: z
    .preprocess((value) => value === "on" || value === "true", z.boolean())
    .catch(false),
});

/** Field names `startCheckout` can report an inline error against. */
export type BookingCheckoutField = "name" | "email" | "date" | "party" | "addOns";
