/**
 * Example data for the admin design-preview pages: social studio and
 * notifications. Each renders its final layout with this data until the feature
 * behind it is wired up, and every one of them carries an `AdminInDevBanner`
 * saying so.
 *
 * Nothing here touches the database; delete entries freely as features go live.
 *
 * The CRM pipeline's example leads used to live here, and so did four example
 * bookings the Sales screen merged in beside real enquiries. Neither does now:
 * Sales is fed by `tour_requests` and `bookings`, so what it shows is what
 * happened. The Blog studio's four example drafts have gone the same way — it
 * reads `blog_post_drafts`, so what it lists is what the pipeline wrote.
 */

// ---------------------------------------------------------------------------
// Social studio (Feature 5)
// ---------------------------------------------------------------------------

export type PreviewSocialPost = {
  platform: "Instagram" | "Facebook";
  caption: string;
  slot: string;
  status: "Scheduled" | "Needs approval" | "Posted";
};

export const previewSocialPosts: PreviewSocialPost[] = [
  { platform: "Instagram", caption: "Golden hour over the Saloia vineyards, seen from the back seat of a 2CV. 🍇 #sintra #ericeira #classiccars", slot: "Tue 4 Aug · 18:00", status: "Scheduled" },
  { platform: "Facebook", caption: "New on the blog: a perfect day in Ericeira, away from the crowds — the route we take with first-time visitors.", slot: "Thu 6 Aug · 12:30", status: "Scheduled" },
  { platform: "Instagram", caption: "Some entrances are never forgotten. Wedding season in the Fiat 600 has begun. 💐", slot: "Sat 8 Aug · 10:00", status: "Needs approval" },
  { platform: "Instagram", caption: "Bread still warm from the wood-fired oven — the Saloia breakfast our guests talk about for weeks.", slot: "Fri 31 Jul · 09:00", status: "Posted" },
];

// ---------------------------------------------------------------------------
// Notifications (Feature 7)
// ---------------------------------------------------------------------------

export type PreviewTemplate = {
  name: string;
  trigger: string;
  channels: ("Email" | "SMS" | "WhatsApp")[];
  audience: "Guest" | "Team";
  enabled: boolean;
};

export const previewTemplates: PreviewTemplate[] = [
  { name: "Booking confirmation", trigger: "Immediately after payment", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "Tour reminder", trigger: "1 day before the tour", channels: ["Email", "SMS"], audience: "Guest", enabled: true },
  { name: "Thank you + review request", trigger: "1 day after the tour", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "Wedding deposit received", trigger: "When a deposit is paid", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "New booking alert", trigger: "When a booking is paid", channels: ["Email", "SMS"], audience: "Team", enabled: true },
  { name: "New lead alert", trigger: "When an enquiry arrives", channels: ["Email", "WhatsApp"], audience: "Team", enabled: false },
];

export const previewNotificationLog = [
  { what: "Tour reminder → Laura Bianchi", channel: "Email + SMS", when: "Fri 14 Aug · 09:00", status: "Delivered" },
  { what: "New booking alert → Diogo, Rita", channel: "SMS", when: "Thu 13 Aug · 16:42", status: "Delivered" },
  { what: "Thank you + review → Hans Weber", channel: "Email", when: "Mon 13 Jul · 10:00", status: "Opened" },
];
