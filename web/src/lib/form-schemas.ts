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
import { DELETE_CONFIRMATION } from "@/lib/admin-format";
import { DEFAULT_CAPACITY, isDateKey, MAX_CAPACITY } from "@/lib/availability";
import { parsePriceInput } from "@/lib/money";
import { EXPERIENCE_ICON_KEYS, FALLBACK_EXPERIENCE_ICON } from "@/lib/experience-icons";
import { isExperienceBlobUrl, isLegacyImagePath } from "@/lib/experience-images";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

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
  title: text.min(1, "Give the request a short title."),
  description: text.min(1, "Describe what you'd like to see."),
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
  name: text.min(1, "A lead needs a name."),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address."),
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
      .regex(SLUG_RE, "Use lowercase words joined by hyphens, e.g. rural-saloia."),
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
        message: "This entry has no photo yet — choose one to upload before saving.",
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

    titlePt: text.min(1, "Add the Portuguese title."),
    titleEn: text.min(1, "Add the English title."),
    taglinePt: text.min(1, "Add the Portuguese tagline."),
    taglineEn: text.min(1, "Add the English tagline."),
    summaryPt: text.min(1, "Add the Portuguese summary."),
    summaryEn: text.min(1, "Add the English summary."),
    durationPt: text.min(1, "Add the Portuguese duration."),
    durationEn: text.min(1, "Add the English duration."),
    imageAltPt: text.min(1, "Describe the image in Portuguese."),
    imageAltEn: text.min(1, "Describe the image in English."),

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
  confirm: z.literal(DELETE_CONFIRMATION, "Type DELETE to confirm."),
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
  Array.from(new Set(values.filter(isDateKey))).sort().slice(0, 366),
);

/**
 * Open or close days. One schema for one day and for a bulk sweep, because the
 * action is the same action — see the note on `saveExperience` for the same
 * reasoning about create-vs-update.
 */
export const setAvailabilitySchema = z.object({
  dates: dateKeys,
  slot: availabilitySlotSchema.catch("full_day"),
  status: availabilityStatusSchema,
  /**
   * Seats on offer. Clamped rather than refused: this arrives from a stepper
   * whose buttons already stop at the bounds, so an out-of-range value is a
   * crafted request, and the useful answer to one is the nearest legal number.
   */
  capacity: z
    .string()
    .trim()
    .catch("")
    .transform((value) => {
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n)) return DEFAULT_CAPACITY;
      return Math.min(MAX_CAPACITY, Math.max(1, n));
    }),
  note: optionalText,
});

/** Remove rows outright — "nobody has decided about these days". */
export const clearAvailabilitySchema = z.object({
  dates: dateKeys,
  slot: availabilitySlotSchema.catch("full_day"),
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
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address."),
  name: text.min(1, "Give the person a name."),
  password,
  role: adminRoleSchema,
});

/** Field names `inviteUser` can report an inline error against. */
export type InviteUserField = "email" | "name" | "password";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
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
  confirm: z.literal(DELETE_CONFIRMATION, "Type DELETE to confirm."),
});

export const exportSubjectSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
});

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
  partySize: z
    .string()
    .trim()
    .catch("")
    .transform((value) => {
      const n = Number.parseInt(value, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
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
  experience: z.string().trim().regex(SLUG_RE),
  addOns: repeated.transform((slugs) => slugs.filter((slug) => SLUG_RE.test(slug))),
  partySize: z
    .string()
    .trim()
    .transform((value) => Number.parseInt(value, 10))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= MAX_CAPACITY),

  marketingConsent: z
    .preprocess((value) => value === "on" || value === "true", z.boolean())
    .catch(false),
});

/** Field names `startCheckout` can report an inline error against. */
export type BookingCheckoutField = "name" | "email" | "date" | "partySize";
