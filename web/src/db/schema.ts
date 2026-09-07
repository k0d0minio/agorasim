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
 * 1c. **Availability and bookings** — `availability` is which *departures* are
 *    on sale and how many drivers they have (supply, shared by every tour);
 *    `bookings` is what has been sold against them (demand, and the money). The
 *    public calendar reads both, the admin calendar writes the first, and no
 *    availability row means no tour. Guest identity stays on `tourRequests` —
 *    `bookings` deliberately holds none.
 *
 * 1d. **Quotes and their instalments** — weddings and events are not sold off a
 *    price list; they are quoted per job. `quotes` is that offer (a *hard*
 *    event date, a venue, a total, the terms it was made under) and
 *    `quotePayments` its instalments — a 30% deposit and a balance, each with
 *    its own Stripe session, fee and status. Same PII split as `bookings`:
 *    the couple live on `tourRequests`, the money lives here.
 *
 * 2. **Generated content drafts** — one table per output type produced by the
 *    `workspaces/` ICM pipelines. Each row is a reviewable draft that the admin
 *    "Content" page lists before it is published to the site. The JSON payload
 *    columns mirror the `Localized<T>` shape used across `web/src/content/` so a
 *    published draft maps cleanly onto the site's typed content and JSON-LD.
 *
 * 2b. **What was sent** — `messageLog` records every automatic message (the
 *    booking confirmation today, the lifecycle mails next), so a scheduled send
 *    can ask "did this already go out?" and the admin can answer "what did this
 *    guest receive?". It is personal data and is erased and expired with the
 *    enquiry it belongs to.
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

import { DRIVERS_PER_SLOT, VEHICLE_CLASSES } from "@/lib/fleet";
import type { ExperiencePricing } from "@/lib/pricing";

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
 * The business runs **two departures a day** — 10:00 (`morning`) and 14:00
 * (`afternoon`), straight from Diogo & Rita's capacity answers (AGORA-002).
 * `full_day` is the launch-era value the enum cannot drop; the 0012 migration
 * moved its rows to `morning` and nothing writes it any more.
 */
export const availabilitySlotEnum = pgEnum("availability_slot", [
  "full_day",
  "morning",
  "afternoon",
]);

/**
 * Whether a departure is on sale.
 *
 * Note what is *not* here: "booked". A departure being full is arithmetic — the
 * drivers and vehicles it has, minus the bookings against them, across every
 * tour — not a state an operator sets, and a status column that has to be kept
 * in step with a count is a status column that will disagree with it. `closed`
 * means a human closed it — a wedding, a service, a day off, a season that has
 * not opened yet.
 */
export const availabilityStatusEnum = pgEnum("availability_status", ["open", "closed"]);

/**
 * Which half of the price list a booking was sold from: `public` is priced per
 * person and tiered by adults, `private` is a group figure and the only mode
 * add-ons attach to.
 *
 * **It no longer decides who shares a car.** Since AGORA-012 every booking is
 * private to its vehicle — nobody is put in a car with strangers — because
 * whether two parties may share a departure is an open question with the
 * client (AGORA-019). The pricing tiers stay exactly as they were; only the
 * sharing semantics wait. So a `public` booking today is a per-person price
 * for a car of your own.
 */
export const bookingModeEnum = pgEnum("booking_mode", ["public", "private"]);

/**
 * Which class of vehicle a booking took out of the pool.
 *
 * Stored rather than derived, for the same reason `date` and `price_breakdown`
 * are: it is what was actually committed. `lib/fleet.ts` decides the class from
 * the route and the party at the moment of sale, and that rule can change —
 * the tour that was sold a small classic in August must keep saying so in
 * September. It is also what makes occupancy one `group by` instead of a
 * catalogue lookup per row.
 */
export const vehicleClassEnum = pgEnum("vehicle_class", VEHICLE_CLASSES);

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

/**
 * Which path ended a booking — the "who" next to `cancelled_at`'s "when".
 *
 * `guest` is the self-serve cancel link; `admin` is somebody on the Sales board
 * acting on a phone call or a WhatsApp message. `system` is neither: a Stripe
 * session that failed outright, or a checkout that never got one.
 * Without it those rows would have to leave the column null, which is the same
 * shape as "cancelled before this column existed" and would make the two
 * indistinguishable forever.
 *
 * Null therefore means exactly one thing: a row cancelled before this column
 * shipped. It is deliberately not backfilled — the answer is not recoverable,
 * and guessing it would put a lie in the audit trail.
 */
export const cancelledViaEnum = pgEnum("cancelled_via", ["guest", "admin", "system"]);

/**
 * How a booking was paid for.
 *
 * `stripe` is every row born inside Checkout — the online path that owns a
 * payment intent. `cash` is a booking taken by phone or in person and recorded
 * straight into the calendar by the team: it is `confirmed` from the moment it
 * is created, never holds a seat, and has no Stripe ids by construction. The
 * distinction exists so the money views, refund paths and reconciliations do
 * not have to infer "cash" from a null payment intent.
 */
export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "cash"]);

/**
 * Which rule of the commission agreement produced the fee on a booking.
 *
 * §4 is a percentage between two bounds — 4%, never under €10, never over €50 —
 * so the fee alone does not say why it is what it is: €50 is both "4% of
 * €1,250" and "the cap on a €2,000 group". This column is that explanation,
 * written next to the amount so a reconciliation against the Stripe dashboard
 * never has to re-derive it. See `lib/commission.ts`, which owns the values.
 */
export const commissionBoundEnum = pgEnum("commission_bound", ["rate", "floor", "cap"]);

/**
 * Every automatic message this system sends, as a closed set.
 *
 * A message's *kind* is what makes "has this booking already had its
 * day-before reminder?" answerable, so it is an enum and not free text: a typo
 * in a kind is a second reminder in somebody's inbox, not a mislabelled row.
 * The name says the occasion, never the recipient — the same kind goes to the
 * guest and to the team, told apart by {@link messageRecipientEnum}.
 *
 * `balance-request` and `balance-reminder` are the quote flow's two chasers
 * (`.icm/intake/quote-flow/`) and have no sender yet. They are here because
 * adding a value to a Postgres enum later is a migration, and because a kind
 * is how a repeated message stays idempotent: a second chaser is its own kind,
 * never the same kind sent twice.
 */
export const messageKindEnum = pgEnum("message_kind", [
  "booking-confirmation",
  "booking-cancellation",
  "booking-moved",
  "enquiry-ack",
  "day-before-reminder",
  "thank-you-review",
  "balance-request",
  "balance-reminder",
]);

/**
 * Who a message went to — the guest it is about, or the team's own inbox.
 *
 * Part of the uniqueness key rather than folded into the kind: a confirmation
 * is one occasion that produces two mails, and "the guest's copy failed but the
 * team's went out" is a real state the Notifications page has to be able to
 * show.
 */
export const messageRecipientEnum = pgEnum("message_recipient", ["guest", "team"]);

/**
 * Where one send got to.
 *
 * `sending` is written *before* the provider is called, and that ordering is
 * the whole idempotency mechanism: the row is a claim, taken under a unique
 * index, so a second caller for the same message finds the claim and does not
 * send. A row stuck in `sending` means the process died between the claim and
 * the provider's answer — deliberately left claimed, because a duplicate
 * confirmation is worse than a missing one, and visible as exactly that on the
 * Notifications page.
 */
export const messageStatusEnum = pgEnum("message_status", [
  "sending",
  "sent",
  "failed",
]);

/**
 * Where a quote is in its life — the events and weddings side of the business,
 * which is quoted per job rather than sold off a price list (info PDF §2.3).
 *
 * The order is the flow: Rita builds a `draft`, sends it, the guest pays the
 * deposit that holds the date (`deposit_paid`), the balance lands 14 days
 * before the event (`paid`). `cancelled` can follow any of them.
 *
 * `deposit_paid` is a state and not a derived count for one reason: it is what
 * the date being *held* means, and the T−14 balance scheduler selects on it.
 * Deriving it from the payment rows on every scan would put the same predicate
 * in two places and make an index impossible.
 */
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "deposit_paid",
  "paid",
  "cancelled",
]);

/**
 * Which instalment of a quote a payment row is.
 *
 * Two are the agreement's own (§5): a 30% `deposit` that holds the date, and
 * the `balance` collected by a second link 14 days out. `other` is everything
 * a bespoke job actually produces — a late extra, an agreed surcharge, a
 * second partial payment — and exists so those do not have to masquerade as a
 * balance and overwrite it.
 */
export const quotePaymentKindEnum = pgEnum("quote_payment_kind", [
  "deposit",
  "balance",
  "other",
]);

/**
 * Where one instalment is.
 *
 * `pending` is the row a quote is created with: an amount and a due date that
 * nobody has been asked for yet. `issued` means a Stripe Checkout Session
 * exists and the link has gone to the guest — the flag the T−14 scheduler is
 * idempotent on, so a dispatcher that runs twice in a day does not email the
 * same balance link twice.
 *
 * `cancelled` is deliberately distinct from a cancelled quote: an instalment
 * can be written off (the couple paid the balance by transfer) while the quote
 * itself completes.
 */
export const quotePaymentStatusEnum = pgEnum("quote_payment_status", [
  "pending",
  "issued",
  "paid",
  "refunded",
  "cancelled",
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
export type CancelledVia = (typeof cancelledViaEnum.enumValues)[number];
export type CommissionBound = (typeof commissionBoundEnum.enumValues)[number];
export type QuoteStatus = (typeof quoteStatusEnum.enumValues)[number];
export type QuotePaymentKind = (typeof quotePaymentKindEnum.enumValues)[number];
export type QuotePaymentStatus = (typeof quotePaymentStatusEnum.enumValues)[number];
export type MessageKind = (typeof messageKindEnum.enumValues)[number];
export type MessageRecipient = (typeof messageRecipientEnum.enumValues)[number];
export type MessageStatus = (typeof messageStatusEnum.enumValues)[number];
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

  /**
   * The real price list (AGORA-002): public/private tiers, child rates,
   * partner minimums — the `ExperiencePricing` shape from `lib/pricing.ts`,
   * which owns the arithmetic. Supersedes `price_cents`, which one flat
   * number could never say. `null` still means unsellable: the checkout
   * refuses, the enquiry form takes over.
   */
  pricing: jsonb("pricing").$type<ExperiencePricing>(),

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
// Availability — the shared capacity of a departure
// ---------------------------------------------------------------------------

/**
 * The bookable calendar: one row per **departure** — a day and one of the two
 * daily slots — that Diogo & Rita have opened for sale.
 *
 * **Not per tour.** It used to be, and that was the bug AGORA-012 fixes: two
 * tours had two calendars and could sell the same morning twice over. The
 * constraint is two drivers across four cars for the whole business (info PDF
 * §1.5), so the row is the whole business's 10:00, and every tour draws on it.
 * What a route needs out of that pool — which class of vehicle, and always one
 * driver — is `lib/fleet.ts`; what has already been drawn is the `bookings`
 * table; what is left is `lib/availability.ts`.
 *
 * **No row means not bookable.** This is the load-bearing decision in the table
 * and it is deliberate: a calendar that defaults to "open" sells every day of
 * every year the moment the table exists, including the ones the car is at the
 * garage and the ones nobody has thought about yet. Availability is something a
 * human asserts, so the absence of an assertion is a no. The admin calendar
 * exists to make asserting it cheap — a day, a month or a whole season at a
 * time, from a phone.
 *
 * `date` is a plain SQL `date`, not a timestamp. A tour on the 15th of August is
 * on the 15th of August in Sintra whatever timezone the browser asking about it
 * is in, and the moment this becomes an instant it starts drifting a day for
 * somebody. Every date in the booking engine is a `YYYY-MM-DD` key — see
 * `lib/availability.ts`, which owns the conversion at the edges.
 *
 * The row is *supply*. Demand — the bookings placed against it — lives in its
 * own table and is counted, never subtracted from the roster in place: an
 * operator dropping to one driver must not be able to un-sell a tour that has
 * been paid for.
 */
export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** The calendar day, in Europe/Lisbon terms. `YYYY-MM-DD`. */
  date: date("date").notNull(),
  /** Which departure on that day — 10:00 or 14:00, per Diogo & Rita's answers. */
  slot: availabilitySlotEnum("slot").notNull().default("morning"),

  /**
   * How many drivers are on this departure — how many tours can leave at once,
   * across every route in the catalogue.
   *
   * Two is the roster (`DRIVERS_PER_SLOT`). Rita lowers it for a departure
   * somebody is missing; she cannot raise it, because a third driver is the
   * open question in AGORA-019 and a column that accepted 3 would be answering
   * it. Vehicles are the other half of the pool and are not a column at all —
   * the fleet is four cars and a touring vehicle, which is a fact about the
   * business rather than something to re-enter for every Tuesday.
   */
  drivers: integer("drivers").notNull().default(DRIVERS_PER_SLOT),

  /** `closed` keeps the row (and its note) while taking the departure off sale. */
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
  // One row per day per departure — the whole model depends on this being true,
  // and the upsert the admin calendar writes with resolves onto it.
  uniqueIndex("availability_date_slot_key").on(table.date, table.slot),
  // Every read is "the departures between these two dates".
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
 * booking must still say "the 15th of August, the 10:00 departure".
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
  slot: availabilitySlotEnum("slot").notNull().default("morning"),

  experienceSlug: text("experience_slug").notNull(),
  addOns: jsonb("add_ons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),

  /** Shared departure or the whole slot — decides everything about pricing. */
  mode: bookingModeEnum("mode").notNull().default("public"),
  /**
   * Who is coming, in the price list's own bands: adults (13+), children
   * (4–12, reduced rate), infants (under 4, free). The DEFAULT 1 on adults is
   * migration scaffolding for rows priced before the bands existed — every
   * insert states all three.
   */
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  infants: integer("infants").notNull().default(0),

  /**
   * The class of vehicle this booking took out of the pool, decided from the
   * route and the party by `lib/fleet.ts` at the moment of sale.
   *
   * This replaced the old `exclusive` flag, which said "this private booking
   * owns the whole slot" — a sentence that stopped being true when the slot
   * stopped belonging to one tour. Every booking now takes one driver and one
   * vehicle of this class, and the departure it left from can still take
   * another party in another car.
   */
  vehicleClass: vehicleClassEnum("vehicle_class").notNull().default("classic-small"),

  /** Everyone aboard — infants included — and therefore seats consumed. */
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

  /**
   * How this row was paid for — see {@link paymentMethodEnum}.
   *
   * `stripe` is the default so every row already in the table read as what it
   * was; only the manual "Nova reserva" path ever writes `cash`.
   */
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("stripe"),

  /** When a `pending` hold stops reserving the seat. */
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  /** Which path called it off. See {@link cancelledViaEnum}. */
  cancelledVia: cancelledViaEnum("cancelled_via"),

  /**
   * The guest's credential for this booking, hashed — the only thing that
   * authenticates a self-serve cancellation.
   *
   * This table holds no guest identity, so there is nobody to log in as: the
   * token in the emailed link *is* the authentication. What is stored is an
   * HMAC of it (`lib/cancellation-token.ts`), never the token, so a dump of
   * this table is not a stack of working cancel links.
   *
   * **Not personal data — a credential.** It stays out of the Art. 15 export
   * for the same reason a password hash would; `lib/subject-data.ts` exports
   * `tour_requests` only, so this is excluded by construction rather than by a
   * filter somebody has to remember.
   *
   * Nullable, and null is meaningful three ways: a row that predates this
   * column, a booking minted while `BOOKING_TOKEN_SECRET` was unset, or a token
   * that has been spent or revoked. All three mean the same thing to the cancel
   * route — no self-serve cancellation, talk to the team — which is why one
   * column carries all three rather than a separate revoked-at.
   */
  cancellationTokenHash: text("cancellation_token_hash"),

  /**
   * How much of {@link bookings.amountCents} has gone back to the guest, in the
   * same unit it was charged in.
   *
   * **An amount, not a flag**, because a refund is not a boolean: the team
   * refunds in full for weather, and part of a total when a party shrinks or
   * goodwill meets a late cancellation. A `refunded` status alone would say
   * "money went back" and leave "how much?" — the first question a guest asks —
   * answerable only from the Stripe dashboard.
   *
   * Cumulative, so a second partial refund adds to it rather than replacing it,
   * and `0` is the honest default for every row that has never been refunded.
   * `status = 'refunded'` and a non-zero value here always travel together; a
   * cancellation that returned nothing stays `cancelled`.
   */
  refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),
  /**
   * Stripe's handle for the most recent refund — `re_…`.
   *
   * The join between this row and the money, for the conversation that starts
   * "the bank says nothing arrived". Only the latest is kept: the full history
   * of refunds against a payment lives in Stripe, and duplicating it here would
   * be a second ledger to keep honest.
   */
  stripeRefundId: text("stripe_refund_id"),
  /** When money last went back. Null until any does. */
  refundedAt: timestamp("refunded_at", { withTimezone: true }),

  /**
   * How much of {@link bookings.applicationFeeCents} has gone back to the
   * client with the guest's money, in cents.
   *
   * The commission agreement (§6) returns commission "in proportion" to any
   * refund, and this is that proportion once it has actually moved: refund half
   * a €340 tour whose fee was €13.60, and €6.80 of commission goes back. It is
   * Stripe's figure — the application fee object's own `amount_refunded`, read
   * after the fee refund lands — for the same reason
   * {@link bookings.applicationFeeCents} is: §8 promises both sides can check
   * every number against the dashboard, and a column holding our intention
   * would agree with it right up until the once it mattered that it did not.
   *
   * `0` rather than null, and it is true rather than unknown: a booking with no
   * fee on it has no fee to return, and one refunded before this column existed
   * had none returned by anything that could have written here. The writer is
   * `lib/booking-refund.ts`, reconciling from the `charge.refunded` webhook —
   * one writer, so the admin action and a dashboard refund cannot disagree.
   */
  refundedFeeCents: integer("refunded_fee_cents").notNull().default(0),

  /**
   * The platform's commission on this booking, in cents — the application fee
   * Stripe actually routed out of the guest's payment.
   *
   * **Stripe's figure, not ours.** It is read back from the charge at
   * confirmation rather than copied from what checkout asked for, because the
   * agreement's promise is that both sides can check every fee against the
   * Stripe dashboard: a column holding our intention would agree with the
   * dashboard right up until the one time it mattered that it did not.
   *
   * Null is the ordinary state for most rows in this table and means "no fee
   * was taken", not "unknown": every booking sold before Connect was configured
   * was a plain platform charge with no application fee on it, and a deployment
   * with no connected account still takes none.
   */
  applicationFeeCents: integer("application_fee_cents"),
  /**
   * The rate that produced it, in basis points — 400 for a tour (§4), 600 for
   * an event (§5). Stored rather than inferred: §8 has the rates reviewed at 24
   * months, and a booking taken under today's rate must still explain itself
   * after they change.
   */
  commissionRateBps: integer("commission_rate_bps"),
  /** Why the fee is that number: the rate, or one of §4's two bounds. */
  commissionBound: commissionBoundEnum("commission_bound"),

  /**
   * Stripe's `ch_…` — the object the fee was actually taken out of.
   *
   * The payment intent above is the handle a refund is issued against; this is
   * the one a fee is reconciled against, and they are not interchangeable in
   * the dashboard. Recorded for every confirmed booking, fee or no fee.
   */
  stripeChargeId: text("stripe_charge_id"),
  /**
   * The connected account the charge lives on (`acct_…`), or null for a
   * platform charge.
   *
   * Stripe objects are not portable between accounts, so "which account was
   * this?" is the first question any later lookup has to answer — and the
   * answer cannot be re-read from the environment, which is a *current*
   * setting and says nothing about where a booking from last season was paid.
   */
  stripeConnectedAccountId: text("stripe_connected_account_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // "What is committed on these departures" — the query behind every calendar.
  index("bookings_date_slot_idx").on(table.date, table.slot, table.status),
  index("bookings_status_idx").on(table.status),
  index("bookings_tour_request_idx").on(table.tourRequestId),
  // The cancel link carries the token and nothing else, so "which booking is
  // this?" is a lookup by digest. Unique because two bookings sharing a token
  // would be a bug that hands one guest another's booking — Postgres allows
  // any number of nulls under a unique index, which is what makes the
  // untokenised rows above legal.
  uniqueIndex("bookings_cancellation_token_key").on(table.cancellationTokenHash),
]);

/**
 * One priced line of a booking, frozen at the moment of sale.
 *
 * Since the tiered price list (AGORA-002) this is `PricedLine` from
 * `lib/pricing.ts`: `unit` says whether the quantity counts adults, children
 * or one whole group. Rows priced before then lack `unit` and carried the old
 * catalogue kinds — renderers treat a missing `unit` as per-person, which is
 * what those rows meant.
 */
export type BookingLineItem = {
  slug: string;
  kind: ExperienceKind | "tour" | "addon";
  /** In cents, as the price list had it that day. */
  unitCents: number;
  quantity: number;
  unit?: "adult" | "child" | "group";
};

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// ---------------------------------------------------------------------------
// The message log
// ---------------------------------------------------------------------------

/**
 * Every automatic message this system sends: what it was, who it was for, and
 * whether it left.
 *
 * **The row is a claim, not a receipt.** It is written `sending` *before* the
 * provider is called and updated afterwards, under the partial unique indexes
 * below. That ordering is what makes a scheduled send idempotent: the daily
 * dispatcher can ask for the day-before reminder on every booking every day,
 * and the second attempt loses the insert instead of arriving in somebody's
 * inbox. Nothing here counts a send that has not been claimed first — see
 * `lib/message-log.ts`, which is the only writer.
 *
 * **This table is personal data, and holds no identifiers.** "Agorasim emailed
 * this person on this day" is data about that person (GDPR Art. 4(1)) even with
 * no address in it, which is why the log is in the export and the retention
 * scope from its first row rather than after somebody notices. What keeps it
 * *minimal* is that the identity is only ever borrowed:
 *
 * - **Linkage, not a copy.** `tour_request_id` is the person; the address, the
 *   name and the language live once on `tour_requests` and are read through the
 *   FK. A hash of the address would have been a second, quieter copy of the
 *   same identifier — pseudonymous, still personal data, and a second thing to
 *   erase.
 * - **`cascade`, not `set null`.** An Art. 17 erasure deletes the enquiry and
 *   takes its sends with it. `bookings` survives an erasure because a paid tour
 *   has record-keeping duties of its own; a log of emails has none, so nothing
 *   here outlives the person it is about.
 * - **No subject line.** The team's copy is subjected "Nova reserva paga —
 *   {date} · {name}" (`content/emails.ts`), so storing what an operator would
 *   most like to read back would put the guest's name in a second table. The
 *   kind says what the message was, which is what the Notifications page and
 *   the dispatcher actually ask.
 * - **The provider id expires.** `provider_message_id` resolves, in the Resend
 *   dashboard, to the whole message including the address and the body — so it
 *   is cleared by the retention job when the enquiry it belongs to is
 *   anonymised (`lib/retention.ts`). Keeping it would leave a working pointer
 *   to data this database had already given up.
 *
 * See the `tour_requests` note above for the same reasoning applied to the lead
 * itself, and `.icm/docs/data-protection.md`.
 */
export const messageLog = pgTable("message_log", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** Which message this was. See {@link messageKindEnum}. */
  kind: messageKindEnum("kind").notNull(),
  /** The guest it is about, or the team's inbox. */
  recipient: messageRecipientEnum("recipient").notNull(),

  /**
   * The person, borrowed from the enquiry rather than copied.
   *
   * Null only for a message with no lead behind it at all. `cascade` is the
   * erasure rule described in the table note — deleting the enquiry deletes
   * its sends.
   */
  tourRequestId: uuid("tour_request_id").references(() => tourRequests.id, {
    onDelete: "cascade",
  }),
  /**
   * The booking a message is *about*, and the subject its uniqueness is keyed
   * on for every booking-shaped kind (confirmation, reminder, thank-you).
   *
   * Null for the kinds that answer an enquiry rather than a booking.
   */
  bookingId: uuid("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),

  status: messageStatusEnum("status").notNull().default("sending"),

  /**
   * Resend's id for the message (`re_…`), for reading a delivery back out of
   * their dashboard. Null until the send is accepted — and null again once
   * retention has expired it, see the table note.
   */
  providerMessageId: text("provider_message_id"),
  /**
   * Why a `failed` row failed, in the provider's terms ("failed",
   * "no-recipient"). Never the provider's body text: that quotes the message,
   * which quotes the guest.
   */
  failureReason: text("failure_reason"),

  /** When the provider accepted it. Null on a `sending` or `failed` row. */
  sentAt: timestamp("sent_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  /**
   * One message of each kind per booking, per recipient — the index the
   * dispatcher's idempotency actually rests on.
   *
   * Partial in two ways, both load-bearing. `booking_id is not null` is what
   * makes this the booking-shaped rule and leaves enquiry-shaped sends to the
   * index below. `status <> 'failed'` is what lets a send be *retried*: a
   * failed attempt stays in the log as the record of an attempt, and stops
   * reserving the slot it did not fill.
   */
  uniqueIndex("message_log_booking_kind_key")
    .on(table.kind, table.recipient, table.bookingId)
    .where(sql`"booking_id" is not null and "status" <> 'failed'`),
  /**
   * The same rule for messages whose subject is the enquiry itself (the ack),
   * scoped to rows that name no booking so a booking's mails are never keyed
   * on the lead behind them.
   */
  uniqueIndex("message_log_enquiry_kind_key")
    .on(table.kind, table.recipient, table.tourRequestId)
    .where(
      sql`"booking_id" is null and "tour_request_id" is not null and "status" <> 'failed'`,
    ),
  // "What did we send about this booking / this lead?" — the Notifications page
  // and the admin's per-row history.
  index("message_log_booking_idx").on(table.bookingId),
  index("message_log_tour_request_idx").on(table.tourRequestId),
  // The log reads newest-first, like the audit trail it sits beside.
  index("message_log_created_at_idx").on(table.createdAt),
]);

export type MessageLogEntry = typeof messageLog.$inferSelect;
export type NewMessageLogEntry = typeof messageLog.$inferInsert;

// ---------------------------------------------------------------------------
// Quotes — the events and weddings side, priced per job
// ---------------------------------------------------------------------------

/**
 * One priced line of a quote, as Rita wrote it.
 *
 * Free text rather than a catalogue slug, unlike {@link BookingLineItem}: a
 * wedding is quoted "per event depending on location" (info PDF §2.3), so the
 * lines are "4 carros clássicos, 6 horas" and "deslocação Ericeira" — things
 * no catalogue holds and none should be invented for.
 *
 * The lines explain {@link quotes.totalCents}; they do not decide it. A quote
 * with no lines at all is legal and means a single agreed figure, which is how
 * most of them start on a phone call.
 */
export type QuoteLineItem = {
  /** What it is, in the language the quote is written in. */
  label: string;
  /** Per unit, in cents. */
  unitCents: number;
  quantity: number;
};

/**
 * A quote for an event: a hard date, a venue, a total, and the terms it was
 * offered under.
 *
 * **This table holds no personal data**, exactly as `bookings` does not. Who
 * the couple are lives on the `tour_requests` row this points at — one home for
 * names, emails and phone numbers, already covered by the retention job, the
 * subject-access export and the erasure path. What is here is commercial: what
 * was offered, for how much, on which day, and under what terms.
 *
 * **`eventDate` is a real `date`, and that is the point of the table.** An
 * event's only home until now was a `tour_requests` row whose `preferred_date`
 * is free text — "late August", "flexible" — which no scheduler can compute
 * against. The balance link is promised automatically 14 days out (proposal
 * §5), and "14 days before 'late August'" is not a query. Plain `date`, not a
 * timestamp, for the reason `availability.date` is: a wedding on the 15th of
 * August is on the 15th of August in Sintra whatever timezone is asking.
 *
 * **The money is frozen here, not derived.** `totalCents` is what was offered
 * and `depositPercent` is the split that was agreed; the instalments computed
 * from them are written into `quote_payments` rows at creation and are not
 * recomputed afterwards. Editing a sent quote is a re-quote, not a silent
 * re-price of an instalment somebody may already have paid.
 *
 * **Commission is the events rate (§5): 6%, proportionally on each payment.**
 * There is no kind column deciding that — a quote is an event by construction,
 * and whether it is a wedding or another kind of event is already on the
 * `tour_requests` row. The rate that was actually applied is recorded per
 * payment, where the fee is.
 */
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * The enquiry this quote was built from — the couple's side of it, and the
   * row the Sales board draws.
   *
   * `set null` rather than `cascade`, for the same reason `bookings` does it:
   * an Art. 17 erasure removes the person, and the financial record of an event
   * that was quoted, deposited and paid for has its own reasons to survive that
   * (tax, among others). What is left is a quote with no name on it, which is
   * the correct outcome of an erasure rather than an accident.
   */
  tourRequestId: uuid("tour_request_id").references(() => tourRequests.id, {
    onDelete: "set null",
  }),

  /** Who built it. Set from the signed-in account, never typed. */
  createdByUserId: uuid("created_by_user_id").references(() => adminUsers.id, {
    onDelete: "set null",
  }),

  /** The day of the event, `YYYY-MM-DD`. What T−14 is computed against. */
  eventDate: date("event_date").notNull(),
  /** Where it is, in the team's own words — "Quinta do Hespanhol, Mafra". */
  venue: text("venue"),

  /** The language the quote is written and sent in. */
  locale: localeEnum("locale").notNull().default("pt"),

  /** The lines behind the total, or `[]` for a single agreed figure. */
  lineItems: jsonb("line_items").$type<QuoteLineItem[]>().notNull().default(sql`'[]'::jsonb`),
  /**
   * What the event costs in total, in euro cents — the figure the deposit and
   * the balance are split out of.
   *
   * Integer cents for the reason everything else in this schema is: money in a
   * float is a rounding error waiting for a customer to find it, and cents are
   * the unit Stripe charges in.
   */
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("eur"),

  /**
   * The share taken up front to hold the date. 30 by default (proposal §5),
   * a whole percent because that is how it is negotiated — "metade" is 50, not
   * 50.0.
   */
  depositPercent: integer("deposit_percent").notNull().default(30),

  /**
   * How many days before the event the deposit stops being refundable.
   *
   * 30 by default (D9), and a column rather than a constant because the client
   * asked for the window and the lawyer has flagged the *sinal* regime around
   * it: the number is going to move, and a quote already accepted must keep
   * evidencing the window it was accepted under.
   */
  termsWindowDays: integer("terms_window_days").notNull().default(30),
  /**
   * Which wording the quote was sent under. Frozen at send; re-set if the quote
   * is re-sent. Null while it is still a draft.
   */
  termsVersion: text("terms_version"),
  /**
   * The version the guest actually agreed to, copied here when they accept, and
   * never written again.
   *
   * Two columns rather than one, and it is the marketing-consent discipline
   * from `tour_requests`: re-send a quote with reworded terms and
   * {@link quotes.termsVersion} moves, while what the couple agreed to before
   * that must not. Evidence of an agreement that can be edited by a later
   * action is not evidence.
   */
  acceptedTermsVersion: text("accepted_terms_version"),
  /** When they accepted — paying the deposit is the acceptance. */
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),

  status: quoteStatusEnum("status").notNull().default("draft"),

  /**
   * The guest's credential for the public quote page, hashed.
   *
   * The same shape and the same reasoning as `bookings.cancellation_token_hash`:
   * this table holds no identity, so there is nobody to log in as and the token
   * in the emailed link *is* the authentication. What is stored is a digest, so
   * a dump of this table is not a stack of working quote links.
   *
   * **Not personal data — a credential.** It stays out of the Art. 15 export
   * for the same reason a password hash would.
   *
   * Nullable: a draft has never been sent and has no link.
   */
  accessTokenHash: text("access_token_hash"),

  /** When it last went to the guest. */
  sentAt: timestamp("sent_at", { withTimezone: true }),
  /** When it was called off, by either side. */
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // The lead's own page lists the quotes built from it.
  index("quotes_tour_request_idx").on(table.tourRequestId),
  // The T−14 scan: "deposit-paid quotes whose event is on this date". Status
  // first, because it is the selective half — most rows are never deposit-paid
  // on any given morning.
  index("quotes_status_event_date_idx").on(table.status, table.eventDate),
  // The team's own calendar view of what is coming up, whatever its state.
  index("quotes_event_date_idx").on(table.eventDate),
  // The public page carries the token and nothing else, so "which quote is
  // this?" is a lookup by digest. Unique because two quotes sharing a token
  // would hand one couple another's event; Postgres allows any number of nulls
  // under a unique index, which is what keeps the drafts above legal.
  uniqueIndex("quotes_access_token_key").on(table.accessTokenHash),
]);

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

/**
 * One instalment of a quote: the 30% deposit, the balance, or an agreed extra.
 *
 * **A child table, not a pair of columns on `quotes`.** Two payments each need
 * their own Stripe session, their own application fee, their own due date and
 * their own status, and §5 takes the commission proportionally on each — none
 * of which survives being flattened into `deposit_*` and `balance_*` columns.
 * The concrete failure that shape produces is overwriting: a re-issued balance
 * link, or a second partial payment, would land on the same columns as the
 * first and erase the record of it.
 *
 * **`cascade` on the quote**, unlike the `set null` above. There is no erasure
 * pressure here — this row holds no person, only an amount belonging to a
 * quote — and an instalment of a quote that does not exist is not a record of
 * anything. Quotes are cancelled rather than deleted, so in practice the
 * cascade never fires; it is there so that a genuine delete cannot leave
 * orphans behind.
 *
 * The Stripe and refund columns mirror `bookings` deliberately, down to the
 * names: the same webhook machinery and the same `lib/booking-refund.ts`
 * reconciliation have to work over both, and a second vocabulary for the same
 * five facts is how the two drift apart.
 */
export const quotePayments = pgTable("quote_payments", {
  id: uuid("id").primaryKey().defaultRandom(),

  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),

  kind: quotePaymentKindEnum("kind").notNull(),
  /** What this instalment is for, in cents. Frozen when the quote is created. */
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("eur"),

  /**
   * When it is owed, `YYYY-MM-DD`. Null for the deposit, which is due on
   * acceptance rather than on a date; the balance carries the event date minus
   * 14 days (proposal §5).
   */
  dueDate: date("due_date"),

  status: quotePaymentStatusEnum("status").notNull().default("pending"),

  /** Stripe's Checkout Session. Unique: the webhook resolves a payment by it. */
  stripeSessionId: text("stripe_session_id").unique(),
  /** Set once payment succeeds — the handle a refund is issued against. */
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  /** Stripe's `ch_…` — the object the application fee was taken out of. */
  stripeChargeId: text("stripe_charge_id"),
  /** The connected account the charge lives on, or null for a platform charge. */
  stripeConnectedAccountId: text("stripe_connected_account_id"),

  /**
   * The platform's commission on *this instalment*, in cents — Stripe's own
   * figure, read back from the charge, as on `bookings`.
   *
   * Per payment rather than per quote because §5 says so: 6% of the deposit
   * when the deposit is paid, 6% of the balance when the balance is paid. The
   * two sum to exactly 6% of the whole, so nothing has to know that a payment
   * is part of a larger job.
   */
  applicationFeeCents: integer("application_fee_cents"),
  /** The rate that produced it, in basis points — 600 for an event (§5). */
  commissionRateBps: integer("commission_rate_bps"),

  /** Cumulative, in the unit it was charged in. See `bookings.refunded_amount_cents`. */
  refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),
  /** How much commission went back with it (§6, in proportion). */
  refundedFeeCents: integer("refunded_fee_cents").notNull().default(0),
  /** Stripe's handle for the most recent refund — `re_…`. */
  stripeRefundId: text("stripe_refund_id"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),

  /**
   * When the payment link last went to the guest.
   *
   * The T−14 scheduler's idempotency, and the reason it is a timestamp on the
   * row rather than a job-side ledger: "has this balance been asked for?" has
   * to be answerable from the payment itself, or a dispatcher that runs twice
   * in a morning emails the same link twice.
   */
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  /** When the money actually landed. */
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Every read of a quote wants its instalments with it.
  index("quote_payments_quote_idx").on(table.quoteId),
  // The scheduler's other half: "balances that are due and not yet issued".
  index("quote_payments_status_due_idx").on(table.status, table.dueDate),
]);

export type QuotePayment = typeof quotePayments.$inferSelect;
export type NewQuotePayment = typeof quotePayments.$inferInsert;

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
 * Blog posts. Localized title/excerpt plus a body modelled as
 * `Localized<string[]>` (paragraphs), matching how long-form copy is stored in
 * `src/content/pages.ts`.
 *
 * Named `_drafts` because a row arrives as one: `scripts/load-blog-drafts.ts`
 * upserts reviewed pipeline markdown here as `draft`, and the row only reaches
 * the public site when someone taps **Publicar** in `/admin/blog`. So this is
 * both the review queue and the published corpus — `status` says which, and
 * `lib/blog-posts.ts` is the only reader the website has.
 */
export const blogPostDrafts = pgTable("blog_post_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: jsonb("title").$type<Localized>().notNull(),
  excerpt: jsonb("excerpt").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized<string[]>>().notNull(),
  /**
   * Language-neutral keywords — places, themes ("Ericeira", "Colares"). Not
   * `Localized`, deliberately: they are shown to both audiences and fed to
   * `Article.keywords`, and a tag that needs translating is a section, not a tag.
   */
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  heroImage: text("hero_image"),
  /**
   * Alt text for {@link heroImage}, per locale. Nullable because a row may not
   * carry a photograph at all; when there is one, the public page refuses to
   * render it without this (WCAG 2.2 AA — D14).
   */
  heroImageAlt: jsonb("hero_image_alt").$type<Localized>(),

  status: contentStatusEnum("status").notNull().default("draft"),
  /**
   * The moment someone tapped **Publicar** — `datePublished` in the article's
   * JSON-LD, and the sort key of the public index. Cleared on unpublish, so a
   * post that goes back and comes out again is dated by its second outing.
   * Distinct from `status` only in that it answers *when*, but that is the
   * whole difference between an ordered blog and an arbitrary one.
   */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  /** The article's own freshness date — `dateModified` in its JSON-LD. */
  dateModified: date("date_modified"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("blog_post_drafts_status_idx").on(table.status),
  index("blog_post_drafts_updated_at_idx").on(table.updatedAt),
  // The public index reads exactly this: published rows, newest first.
  index("blog_post_drafts_published_at_idx").on(table.publishedAt),
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
