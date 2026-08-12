/**
 * Drizzle schema for the Agorasim operations database (Neon Postgres).
 *
 * Two concerns live here:
 *
 * 1. **Inbound leads** — `tourRequests` captures the public onboarding form
 *    (customers requesting a tour). These surface on the admin "Sales" screen
 *    for the team (Diogo & Rita) to triage and follow up, as a board or a table
 *    over the same rows.
 *
 * 1b. **The catalogue** — `experienceCatalogue` holds the experiences and add-ons
 *    themselves, so the offer can change without a deploy. Leads reference it by
 *    slug.
 *
 * 1c. **Availability and bookings** — `availability` is which days are on sale
 *    (supply); `bookings` is what has been sold against them (demand, and the
 *    money). The public calendar reads both, the admin calendar writes the
 *    first, and no availability row means no tour. Guest identity stays on
 *    `tourRequests` — `bookings` deliberately holds none.
 *
 * 2. **Generated content drafts** — one table per output type produced by the
 *    `workspaces/` ICM pipelines. Each row is a reviewable draft that the admin
 *    "Content" page lists before it is published to the site. The JSON payload
 *    columns mirror the `Localized<T>` shape used across `web/src/content/` so a
 *    published draft maps cleanly onto the site's typed content and JSON-LD.
 *
 * 3. **Operators and accountability** — `adminUsers` (who can sign in) and
 *    `auditLog` (what they did). The admin used to be one shared password, so
 *    "who archived this lead?" had no answer; every mutating admin action now
 *    writes an audit row naming the actor.
 *
 * Keep enum/column changes in sync with the admin dashboard and the pipeline
 * publish stages (`workspaces/geo-content/stages/03_publish`).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

/** Two-letter locale, mirroring `src/i18n/config.ts`. */
export const localeEnum = pgEnum("locale", ["pt", "en"]);

/** Lifecycle of an inbound tour request as the team works it. */
export const requestStatusEnum = pgEnum("request_status", [
  "new",
  "contacted",
  "quoted",
  "booked",
  "archived",
]);

/**
 * What kind of job an enquiry is about — the top-level split the Sales board
 * shows as an icon, before any experience detail.
 *
 * `tour` is everything that comes through the onboarding form today. `wedding`
 * and `event` exist because the wedding-hire and events quote flows write into
 * this same table once they ship, and a lead whose type is only inferrable from
 * a free-text message cannot be filtered on.
 */
export const enquiryKindEnum = pgEnum("enquiry_kind", ["tour", "wedding", "event"]);

/** Where an experience sits in the catalogue: the main tour, or an add-on. */
export const experienceKindEnum = pgEnum("experience_kind", ["signature", "complement"]);

/**
 * Which part of a day a bookable slot occupies.
 *
 * The launch model is **one slot per day** (`full_day`) — that is what Diogo &
 * Rita run, one car, one tour, one day. The other two exist because the column
 * is the thing that would otherwise need a migration on the morning they decide
 * to run a morning and an afternoon departure, and because a calendar keyed on
 * `date` alone cannot express that at all.
 */
export const availabilitySlotEnum = pgEnum("availability_slot", [
  "full_day",
  "morning",
  "afternoon",
]);

/**
 * Whether a slot is on sale.
 *
 * Note what is *not* here: "booked". A slot being sold out is arithmetic
 * (`capacity` minus the bookings against it), not a state an operator sets, and
 * a status column that has to be kept in step with a count is a status column
 * that will disagree with it. `closed` means a human closed it — a wedding, a
 * service, a day off.
 */
export const availabilityStatusEnum = pgEnum("availability_status", ["open", "closed"]);

/**
 * Where a booking is in its life.
 *
 * `pending` is a **hold**: a seat reserved while the guest is on Stripe's
 * payment page, which stops counting against capacity once `holdExpiresAt`
 * passes. It is not a state anything has to clean up for the arithmetic to be
 * right — see `lib/bookings.ts`.
 *
 * `expired` and `cancelled` are different failures worth telling apart: nobody
 * finished paying, versus somebody (guest or team) called it off after they
 * had. `refunded` closes the loop the refund policy opens — money went back,
 * and the row says so rather than being deleted.
 */
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
  "refunded",
]);

/** Review lifecycle shared by every generated-content draft table. */
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "approved",
  "published",
]);

/** Social networks the social pipeline targets (see .icm/docs/social-media-automation.md). */
export const socialPlatformEnum = pgEnum("social_platform", [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
]);

/** Triage lifecycle for an internal feature request as the team works it. */
export const featureRequestStatusEnum = pgEnum("feature_request_status", [
  "new",
  "planned",
  "in_progress",
  "completed",
  "declined",
]);

/** Rough urgency an operator assigns to a feature request. */
export const featureRequestPriorityEnum = pgEnum("feature_request_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * What an admin account is allowed to do. Two roles is the whole model:
 *
 * - `owner` — Diogo & Rita. Everything, including managing accounts and reading
 *   or exporting guest personal data.
 * - `collaborator` — the developer. Everything operational, but no user
 *   management and no bulk export of guest PII.
 *
 * Enforcement lives in `requireAdmin()` (`lib/admin-auth.ts`), never in the
 * proxy alone — see the note at the top of that file.
 */
export const adminRoleEnum = pgEnum("admin_role", ["owner", "collaborator"]);

export type AppLocale = (typeof localeEnum.enumValues)[number];
export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
export type EnquiryKind = (typeof enquiryKindEnum.enumValues)[number];
export type ExperienceKind = (typeof experienceKindEnum.enumValues)[number];
export type AvailabilitySlot = (typeof availabilitySlotEnum.enumValues)[number];
export type AvailabilityStatus = (typeof availabilityStatusEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type SocialPlatform = (typeof socialPlatformEnum.enumValues)[number];
export type FeatureRequestStatus = (typeof featureRequestStatusEnum.enumValues)[number];
export type FeatureRequestPriority = (typeof featureRequestPriorityEnum.enumValues)[number];
export type AdminRole = (typeof adminRoleEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Shape helpers for the localized JSON payloads
// ---------------------------------------------------------------------------

/** `Localized<T>` — the PT/EN pair used across the site content. */
export type Localized<T = string> = { pt: T; en: T };

/** A GEO content block section (H2/H3 heading + body paragraphs). */
export type GeoSection = { heading: string; body: string[] };

/** A single FAQ entry inside a generated block. */
export type GeoFaq = { question: string; answer: string };

/** A catalogue FAQ — both halves localized, as the site renders them. */
export type LocalizedFaq = { question: Localized; answer: Localized };

/** Per-locale GEO block body, matching the publish stage's JSON contract. */
export type GeoLocaleBlock = {
  intro: string;
  sections: GeoSection[];
  faqs: GeoFaq[];
};

// ---------------------------------------------------------------------------
// Operators and accountability
// ---------------------------------------------------------------------------

/**
 * Admin accounts. Replaces the single shared `ADMIN_PASSWORD`, so every action
 * in the operations area has a named actor behind it.
 *
 * `passwordHash` is an scrypt digest produced by `lib/password.ts` — never a raw
 * password, and never something the proxy touches (hashing needs `node:crypto`,
 * the proxy only verifies HMAC signatures).
 *
 * Accounts are **disabled, not deleted**: `auditLog.actorUserId` points here, and
 * an audit trail whose actor rows can vanish is not an audit trail. `disabledAt`
 * is the off switch; a row is only ever removed by hand, deliberately.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Sign-in identity. Stored lower-cased so lookups are case-insensitive. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** `scrypt$N$r$p$<salt>$<hash>` — see `lib/password.ts`. */
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("collaborator"),

  /**
   * "Sign out everywhere". Session tokens carry an issued-at; any token minted
   * before this instant is rejected by `requireAdmin()`. Bumping this is the
   * whole revocation mechanism — no server-side session table needed.
   */
  sessionsValidFrom: timestamp("sessions_valid_from", { withTimezone: true })
    .notNull()
    .defaultNow(),

  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  /** Set to disable sign-in. Nullable: `null` means the account is active. */
  disabledAt: timestamp("disabled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

/**
 * Append-only record of every mutating admin action.
 *
 * Written by one helper (`lib/audit.ts`), called from the server actions — never
 * hand-rolled inserts, so the shape cannot drift action by action. Rows are
 * never updated or deleted by the application.
 *
 * `before`/`after` hold the changed slice of the row, not the whole row, and are
 * **redacted of personal data** for actions on guest records: an erasure entry
 * that quoted the guest's email would defeat the erasure it records.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Who did it. Nullable only so an action taken by an automated job (the
   * retention cron) can be recorded with no human actor.
   */
  actorUserId: uuid("actor_user_id").references(() => adminUsers.id, {
    onDelete: "set null",
  }),
  /** Dotted verb, e.g. `tour_request.status_changed`. See `lib/audit.ts`. */
  action: text("action").notNull(),
  /** Table-ish name of what was acted on, e.g. `tour_request`. */
  entityType: text("entity_type").notNull(),
  /** Primary key of the affected row, where there is a single one. */
  entityId: text("entity_id"),

  before: jsonb("before").$type<Record<string, unknown> | null>(),
  after: jsonb("after").$type<Record<string, unknown> | null>(),

  /** Best-effort client IP (see `lib/request-ip.ts`) — evidence, not identity. */
  ipAddress: text("ip_address"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // The log view is ordered by time; the per-row "last changed by" line looks up
  // by (entity_type, entity_id).
  index("audit_log_created_at_idx").on(table.createdAt),
  index("audit_log_entity_idx").on(table.entityType, table.entityId),
  index("audit_log_actor_idx").on(table.actorUserId),
]);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

// ---------------------------------------------------------------------------
// Inbound leads
// ---------------------------------------------------------------------------

/**
 * Public onboarding form submissions — customers requesting a tour. Written by
 * the `submitTourRequest` server action, read by the admin Submissions page.
 *
 * **This table is personal data** (GDPR Art. 4(1)): name, email, phone, and a
 * free-text message from, mostly, EU residents. Three consequences are encoded
 * below and enforced elsewhere:
 *
 * - Marketing consent is stored *separately from the enquiry itself*, with a
 *   timestamp and the version of the text that was agreed to, so it can be
 *   evidenced later (Art. 7(1)). Submitting the form is not consent to
 *   marketing, and the box is never pre-ticked.
 * - Rows are erasable and exportable from the admin (Art. 15 & 17), owner-only,
 *   through the audit log.
 * - Rows that never convert are anonymised by the retention job
 *   (`app/api/cron/retention`) after `ENQUIRY_RETENTION_DAYS`.
 *
 * See `.icm/docs/data-protection.md`.
 */
export const tourRequests = pgTable("tour_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Who
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  locale: localeEnum("locale").notNull().default("pt"),

  // What they want
  /** Tour, wedding hire or an event — the icon the Sales board leads with. */
  kind: enquiryKindEnum("kind").notNull().default("tour"),
  /** Slug of the primary experience they're interested in (e.g. `rural-saloia`). */
  experienceSlug: text("experience_slug"),
  /** Slugs of add-on experiences (Tasco Galapito, Manzwine, …). */
  addOns: jsonb("add_ons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  partySize: integer("party_size"),
  /** Free-form preferred date/period ("2026-08-15", "late August", "flexible"). */
  preferredDate: text("preferred_date"),
  message: text("message"),

  // Triage
  status: requestStatusEnum("status").notNull().default("new"),
  /** Where the lead came from — website form, phone follow-up, import, … */
  source: text("source").notNull().default("website"),
  /**
   * The team's own notes on this lead — what was agreed on the phone, which car
   * was promised, why it went quiet. Written only from the admin detail page.
   *
   * It is *about* a guest, so it is personal data like the rest of the row: the
   * retention job clears it alongside the name and the message, and it is
   * included in a subject-access export.
   */
  internalNotes: text("internal_notes"),
  /** When someone last actually reached out. Set by "Log contact". */
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),

  // Marketing consent — deliberately not `notNull().default(true)`.
  /** Opt-in to marketing email. Never a condition of sending the enquiry. */
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  /** When consent was given. Null whenever `marketingConsent` is false. */
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  /**
   * Which wording the person agreed to (`MARKETING_CONSENT_VERSION` in
   * `content/privacy.ts`). Reword the checkbox and old rows still evidence what
   * was actually shown at the time.
   */
  marketingConsentVersion: text("marketing_consent_version"),

  /** Set by the retention job when the PII was cleared. See `lib/retention.ts`. */
  anonymisedAt: timestamp("anonymised_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Triage filters on `status`; every list is ordered by `created_at`.
  index("tour_requests_status_idx").on(table.status),
  index("tour_requests_created_at_idx").on(table.createdAt),
  // The subject-access export looks a person up by email across every table.
  index("tour_requests_email_idx").on(table.email),
]);

export type TourRequest = typeof tourRequests.$inferSelect;
export type NewTourRequest = typeof tourRequests.$inferInsert;

// ---------------------------------------------------------------------------
// The experience catalogue
// ---------------------------------------------------------------------------

/**
 * The experiences and add-ons Agorasim sells — Rural Saloia, Tasco Galapito,
 * Manzwine, and whatever Diogo & Rita add next.
 *
 * This used to be a TypeScript array in `content/experiences.ts`, which meant a
 * new add-on, a changed duration or a corrected price note was a code change and
 * a deploy. The catalogue is theirs to edit, so it lives here and is edited from
 * `/admin/experiences`.
 *
 * The columns mirror the `Experience` type the site already renders, so a row
 * maps onto it one-for-one (see `lib/experience-catalogue.ts`). Every guest-
 * facing string is `Localized` — PT and EN travel together, because a
 * half-translated catalogue is what happens when they don't.
 *
 * Rows are **archived, not deleted** (`active = false`): `tour_requests.
 * experience_slug` and `add_ons` reference these slugs as plain text, and a lead
 * that says "Manzwine" must keep saying so after Manzwine is retired.
 */
export const experienceCatalogue = pgTable("experiences", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** URL segment and the value stored on enquiries. Stable — renaming breaks links. */
  slug: text("slug").notNull().unique(),
  kind: experienceKindEnum("kind").notNull().default("complement"),
  /** Key into `EXPERIENCE_ICONS` (`lib/experience-icons.ts`) — the admin's shorthand. */
  icon: text("icon").notNull().default("sparkles"),

  title: jsonb("title").$type<Localized>().notNull(),
  tagline: jsonb("tagline").$type<Localized>().notNull(),
  /** Answer-first summary — the first ~40 words, which is what GEO answers with. */
  summary: jsonb("summary").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized<string[]>>().notNull(),
  duration: jsonb("duration").$type<Localized>().notNull(),
  highlights: jsonb("highlights").$type<Localized<string[]>>().notNull(),
  faqs: jsonb("faqs").$type<LocalizedFaq[]>().notNull().default(sql`'[]'::jsonb`),

  image: text("image").notNull(),
  imageAlt: jsonb("image_alt").$type<Localized>().notNull(),

  /**
   * What this costs, **per person, in euro cents**. `null` means no price has
   * been set.
   *
   * Cents, integer, because money in a float is a rounding error waiting for a
   * customer to find it, and because it is the unit Stripe charges in — a
   * conversion that only happens at the API boundary cannot drift.
   *
   * Nullable, and nullable is load-bearing: the real prices are Diogo & Rita's
   * to give (AGORA-002), and until they do, **an unpriced experience cannot be
   * sold**. The checkout refuses it and the site offers the enquiry form
   * instead. That is deliberately more annoying than a placeholder, because a
   * placeholder is a number a guest can be charged.
   */
  priceCents: integer("price_cents"),

  /** Archived experiences keep their slug resolvable but leave the website. */
  active: boolean("active").notNull().default(true),
  /** Display order within a kind. Lower first. */
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // The site asks for "the active ones, in order" on every render that matters.
  index("experiences_active_sort_idx").on(table.active, table.sortOrder),
]);

export type ExperienceRow = typeof experienceCatalogue.$inferSelect;
export type NewExperienceRow = typeof experienceCatalogue.$inferInsert;

// ---------------------------------------------------------------------------
// Availability — which days are actually on sale
// ---------------------------------------------------------------------------

/**
 * The bookable calendar: one row per day (per slot) that Diogo & Rita have
 * opened for sale.
 *
 * **No row means not bookable.** This is the load-bearing decision in the table
 * and it is deliberate: a calendar that defaults to "open" sells every day of
 * every year the moment the table exists, including the ones the car is at the
 * garage and the ones nobody has thought about yet. Availability is something a
 * human asserts, so the absence of an assertion is a no. The admin calendar
 * exists to make asserting it cheap — a month at a time, from a phone.
 *
 * `date` is a plain SQL `date`, not a timestamp. A tour on the 15th of August is
 * on the 15th of August in Sintra whatever timezone the browser asking about it
 * is in, and the moment this becomes an instant it starts drifting a day for
 * somebody. Every date in the booking engine is a `YYYY-MM-DD` key — see
 * `lib/availability.ts`, which owns the conversion at the edges.
 *
 * The row is *supply*. Demand — the bookings placed against it — lives in its
 * own table and is counted, never subtracted from `capacity` in place: an
 * operator lowering capacity to 2 must not be able to un-sell a seat that has
 * been paid for.
 */
export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** The calendar day, in Europe/Lisbon terms. `YYYY-MM-DD`. */
  date: date("date").notNull(),
  /** Which departure on that day. One per day (`full_day`) at launch. */
  slot: availabilitySlotEnum("slot").notNull().default("full_day"),

  /**
   * How many guests can be sold into this slot. One car, three seats, at
   * launch — but the number is per-slot rather than global because "we can take
   * six on the 20th, we're running both cars" is a sentence Rita will say.
   */
  capacity: integer("capacity").notNull().default(3),

  /** `closed` keeps the row (and its note) while taking the day off sale. */
  status: availabilityStatusEnum("status").notNull().default("open"),

  /**
   * Why, in the team's own words — "Diogo em casamento", "carro na revisão".
   * Internal only: it is never rendered to a guest, who is only ever told a day
   * is unavailable, not what the family is doing that day.
   */
  note: text("note"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One row per day per slot — the whole model depends on this being true, and
  // the upsert the admin calendar writes with resolves onto it.
  uniqueIndex("availability_date_slot_key").on(table.date, table.slot),
  // Every read is "the open days between these two dates".
  index("availability_date_idx").on(table.date),
]);

export type AvailabilityRow = typeof availability.$inferSelect;
export type NewAvailabilityRow = typeof availability.$inferInsert;

// ---------------------------------------------------------------------------
// Bookings — the demand side, and the money
// ---------------------------------------------------------------------------

/**
 * A seat sold, or being sold: one row per checkout the site starts.
 *
 * **This table holds no personal data.** Who the guest is lives on the
 * `tour_requests` row this points at — one home for names, emails and phone
 * numbers, already covered by the retention job, the subject-access export and
 * the erasure path. Duplicating them here would mean a second place to
 * remember, and the one thing certain about a second place to remember is that
 * somebody will forget it. What is here is commercial: what was sold, for how
 * much, on which day, and how the payment went.
 *
 * **A `pending` row is a hold.** The seat is reserved from the moment the guest
 * is sent to Stripe until `hold_expires_at`, and then it simply stops counting.
 * There is no sweeper the arithmetic depends on: `lib/bookings.ts` counts
 * confirmed rows plus pending rows whose hold is still live, so an abandoned
 * checkout releases its seat by the clock rather than by a job that might not
 * have run. (A job does mark them `expired` eventually, for tidiness on the
 * admin's screens — that is cosmetics, not correctness.)
 *
 * **`date`/`slot` are copied, not referenced.** They are what was actually
 * sold. An availability row can be edited, closed or deleted afterwards and the
 * booking must still say "the 15th of August, full day".
 */
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * The enquiry this booking belongs to — the guest's side of it, and the row
   * the Sales board draws.
   *
   * `set null` rather than `cascade`: an Art. 17 erasure removes the person,
   * and the financial record of a tour that was sold and paid for has its own
   * reasons to survive that (tax, among others). What is left is a booking with
   * no name on it, which is the correct outcome of an erasure, not an accident.
   */
  tourRequestId: uuid("tour_request_id").references(() => tourRequests.id, {
    onDelete: "set null",
  }),

  /** The day sold. Copied from availability, never a foreign key — see above. */
  date: date("date").notNull(),
  slot: availabilitySlotEnum("slot").notNull().default("full_day"),

  experienceSlug: text("experience_slug").notNull(),
  addOns: jsonb("add_ons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** Guests, and therefore seats consumed out of the slot's capacity. */
  partySize: integer("party_size").notNull(),

  /**
   * What the guest was charged, in the smallest unit. Computed on the server
   * from the catalogue — never read off the form, which is the whole reason
   * this column and `price_breakdown` exist rather than a price in a hidden
   * input.
   */
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("eur"),

  /**
   * The line items as they stood at the moment of sale: `{ slug, unitCents,
   * quantity }` per experience and add-on.
   *
   * A snapshot, because the catalogue is edited. Rita raising the Rural Saloia
   * price in September must not silently rewrite what August's guests paid, and
   * "what was this person actually charged for?" is a question a refund
   * conversation starts with.
   */
  priceBreakdown: jsonb("price_breakdown").$type<BookingLineItem[]>().notNull(),

  status: bookingStatusEnum("status").notNull().default("pending"),
  /** The language the guest bought in — which one their emails go out in. */
  locale: localeEnum("locale").notNull().default("pt"),

  /** Stripe's Checkout Session. Unique: the webhook resolves a booking by it. */
  stripeSessionId: text("stripe_session_id").unique(),
  /** Set once payment succeeds — the handle a refund is issued against. */
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  /** When a `pending` hold stops reserving the seat. */
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // "How many seats are gone on these days" — the query behind every calendar.
  index("bookings_date_slot_idx").on(table.date, table.slot, table.status),
  index("bookings_status_idx").on(table.status),
  index("bookings_tour_request_idx").on(table.tourRequestId),
]);

/** One priced line of a booking, frozen at the moment of sale. */
export type BookingLineItem = {
  slug: string;
  kind: ExperienceKind;
  /** Per person, in cents, as the catalogue had it that day. */
  unitCents: number;
  /** People — add-ons are priced per person, like the tour itself. */
  quantity: number;
};

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// ---------------------------------------------------------------------------
// Internal feature requests
// ---------------------------------------------------------------------------

/**
 * Feature requests raised from the admin dashboard — the team (Diogo & Rita)
 * jotting down ideas and asks for the toolkit itself. Deliberately free-form:
 * `title` and `description` are unconstrained text so an operator can capture
 * anything. `priority`/`status` are the only structured fields, used to triage
 * the backlog. Written by the `submitFeatureRequest` server action, read by the
 * admin "Feature requests" page.
 */
export const featureRequests = pgTable("feature_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Free-form request content
  title: text("title").notNull(),
  description: text("description").notNull(),
  /** Free-form grouping the requester types in (e.g. "Website", "Booking"). */
  category: text("category"),
  /** Who raised it. Set from the signed-in account, not typed by hand. */
  submittedByUserId: uuid("submitted_by_user_id").references(() => adminUsers.id, {
    onDelete: "set null",
  }),
  /**
   * The name people typed into the old free-text field, back when the admin was
   * one shared login. Kept so nothing is lost; never written to again. Rows from
   * before per-user accounts have this set and `submittedByUserId` null.
   */
  submittedByLegacy: text("submitted_by_legacy"),

  // Triage
  priority: featureRequestPriorityEnum("priority").notNull().default("medium"),
  status: featureRequestStatusEnum("status").notNull().default("new"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("feature_requests_status_idx").on(table.status),
  index("feature_requests_created_at_idx").on(table.createdAt),
  /**
   * Was the guard against the proposal catalogue filing the same priced item
   * twice when two clicks were in flight. That catalogue is gone — the contract
   * is signed and the page is a plain form now — but the index stays: it costs
   * nothing, and it still stops a categorised request being filed twice.
   * Postgres treats NULLs as distinct, so it only binds rows that carry a
   * category; free-form requests can still share a title.
   */
  uniqueIndex("feature_requests_title_category_key").on(table.title, table.category),
]);

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type NewFeatureRequest = typeof featureRequests.$inferInsert;

// ---------------------------------------------------------------------------
// Generated content drafts — one table per pipeline output type
// ---------------------------------------------------------------------------

/**
 * GEO content blocks (the `geo-content` pipeline output). Mirrors the publish
 * stage JSON: `{ slug, targetPage, dateModified, pt, en }`, where each locale
 * carries `{ intro, sections[], faqs[] }`.
 */
export const geoContentDrafts = pgTable("geo_content_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  /** Site page this block belongs to, e.g. `experiencias/rural-saloia`. */
  targetPage: text("target_page").notNull(),
  /** The exact query this block is optimized to win in AI search. */
  targetQuery: text("target_query"),

  pt: jsonb("pt").$type<GeoLocaleBlock>().notNull(),
  en: jsonb("en").$type<GeoLocaleBlock>().notNull(),

  status: contentStatusEnum("status").notNull().default("draft"),
  /** GEO freshness signal — surfaced as `dateModified` on the published page. */
  dateModified: date("date_modified"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // The review queue filters on `status` and orders by `updated_at`.
  index("geo_content_drafts_status_idx").on(table.status),
  index("geo_content_drafts_updated_at_idx").on(table.updatedAt),
]);

export type GeoContentDraft = typeof geoContentDrafts.$inferSelect;
export type NewGeoContentDraft = typeof geoContentDrafts.$inferInsert;

/**
 * Blog post drafts (future `blog/` pipeline). Localized title/excerpt plus a
 * body modelled as `Localized<string[]>` (paragraphs), matching how long-form
 * copy is stored in `src/content/pages.ts`.
 */
export const blogPostDrafts = pgTable("blog_post_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: jsonb("title").$type<Localized>().notNull(),
  excerpt: jsonb("excerpt").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized<string[]>>().notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  heroImage: text("hero_image"),

  status: contentStatusEnum("status").notNull().default("draft"),
  dateModified: date("date_modified"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("blog_post_drafts_status_idx").on(table.status),
  index("blog_post_drafts_updated_at_idx").on(table.updatedAt),
]);

export type BlogPostDraft = typeof blogPostDrafts.$inferSelect;
export type NewBlogPostDraft = typeof blogPostDrafts.$inferInsert;

/**
 * Social post drafts (future `social/` pipeline). One row per platform post,
 * with a localized caption and a scheduling slot.
 */
export const socialPostDrafts = pgTable("social_post_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: socialPlatformEnum("platform").notNull(),
  caption: jsonb("caption").$type<Localized>().notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** Slug of the experience this post promotes, if any. */
  experienceSlug: text("experience_slug"),
  mediaUrl: text("media_url"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),

  status: contentStatusEnum("status").notNull().default("draft"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("social_post_drafts_status_idx").on(table.status),
  index("social_post_drafts_updated_at_idx").on(table.updatedAt),
]);

export type SocialPostDraft = typeof socialPostDrafts.$inferSelect;
export type NewSocialPostDraft = typeof socialPostDrafts.$inferInsert;

/**
 * Email campaign drafts (future `email/` pipeline). Localized subject/preheader
 * and a paragraph body, targeted at an audience segment.
 */
export const emailCampaignDrafts = pgTable("email_campaign_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  subject: jsonb("subject").$type<Localized>().notNull(),
  preheader: jsonb("preheader").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized<string[]>>().notNull(),
  /** Audience segment, e.g. `past-guests`, `newsletter`, `lisbon-day-trippers`. */
  segment: text("segment").notNull().default("newsletter"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),

  status: contentStatusEnum("status").notNull().default("draft"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("email_campaign_drafts_status_idx").on(table.status),
  index("email_campaign_drafts_updated_at_idx").on(table.updatedAt),
]);

export type EmailCampaignDraft = typeof emailCampaignDrafts.$inferSelect;
export type NewEmailCampaignDraft = typeof emailCampaignDrafts.$inferInsert;
