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
  featureRequestPriorityEnum,
  featureRequestStatusEnum,
  localeEnum,
  requestStatusEnum,
} from "@/db/schema";
import { experiences } from "@/content/experiences";
import { DELETE_CONFIRMATION } from "@/lib/admin-format";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

// ---------------------------------------------------------------------------
// Enums, straight from the database schema
// ---------------------------------------------------------------------------

export const requestStatusSchema = z.enum(requestStatusEnum.enumValues);
export const featureRequestStatusSchema = z.enum(featureRequestStatusEnum.enumValues);
export const featureRequestPrioritySchema = z.enum(featureRequestPriorityEnum.enumValues);
export const localeSchema = z.enum(localeEnum.enumValues);
export const adminRoleSchema = z.enum(adminRoleEnum.enumValues);

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

const experienceSlugs = new Set(experiences.map((e) => e.slug));

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

export const proposalRequestSchema = z.object({
  ids: z.array(z.string()).min(1, "Pick at least one feature to request."),
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

/**
 * Bulk triage. `ids` arrives as repeated checkbox values, which `formValues`
 * collapses to a single string when only one box is ticked — hence the
 * preprocess, the same shape the add-ons field uses.
 */
const idList = z
  .preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(z.uuid()),
  )
  .refine((ids) => ids.length > 0, "Select at least one submission.");

export const bulkTourRequestSchema = z
  .object({
    ids: idList,
    /** `archive` re-triages the rows; `delete` erases them. */
    operation: z.enum(["archive", "delete"]),
    confirm: z.string().optional(),
  })
  // The typed confirmation is checked server-side too, not just by the dialog
  // that renders it: a disabled button is a UI affordance, not a safeguard.
  .refine(
    (value) => value.operation !== "delete" || value.confirm === DELETE_CONFIRMATION,
    { path: ["confirm"], message: `Type ${DELETE_CONFIRMATION} to confirm.` },
  );

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
  // An unrecognised slug is dropped rather than rejected — the enquiry still matters.
  experience: optionalText.transform((slug) =>
    slug && experienceSlugs.has(slug) ? slug : null,
  ),
  partySize: z
    .string()
    .trim()
    .catch("")
    .transform((value) => {
      const n = Number.parseInt(value, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  addOns: z
    .preprocess(
      (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
      z.array(z.string()),
    )
    .transform((slugs) => slugs.filter((slug) => experienceSlugs.has(slug))),
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
export type TourRequestField = "name" | "email";
