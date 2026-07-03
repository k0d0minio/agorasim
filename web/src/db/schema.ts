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
 * Keep enum/column changes in sync with the admin dashboard and the pipeline
 * publish stages (`workspaces/geo-content/stages/03_publish`).
 */
import { sql } from "drizzle-orm";
import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export type AppLocale = (typeof localeEnum.enumValues)[number];
export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type SocialPlatform = (typeof socialPlatformEnum.enumValues)[number];

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
// Inbound leads
// ---------------------------------------------------------------------------

/**
 * Public onboarding form submissions — customers requesting a tour. Written by
 * the `submitTourRequest` server action, read by the admin Submissions page.
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

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TourRequest = typeof tourRequests.$inferSelect;
export type NewTourRequest = typeof tourRequests.$inferInsert;

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
});

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
});

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
});

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
});

export type EmailCampaignDraft = typeof emailCampaignDrafts.$inferSelect;
export type NewEmailCampaignDraft = typeof emailCampaignDrafts.$inferInsert;
