/**
 * Drizzle schema for the Agorasim operations database (Neon Postgres).
 *
 * Two concerns live here:
 *
 * 1. **Inbound leads** — `tourRequests` captures the public onboarding form
 *    (customers requesting a tour). These surface on the admin "Submissions"
 *    page for the team (Diogo & Rita) to triage and follow up.
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

/** Review lifecycle shared by every generated-content draft table. */
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "approved",
  "published",
]);

/** Social networks the social pipeline targets (see social-media-automation.md). */
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
 * See `docs/data-protection.md`.
 */
export const tourRequests = pgTable("tour_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Who
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  locale: localeEnum("locale").notNull().default("pt"),

  // What they want
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
   * Stops the proposal catalogue filing the same item twice when two clicks are
   * in flight. Postgres treats NULLs as distinct, so this only binds rows that
   * carry a category — free-form requests can still share a title.
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
