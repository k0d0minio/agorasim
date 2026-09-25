/**
 * Example data for the admin design-preview page that is left: the social
 * studio. It renders its final layout with this data until the feature behind
 * it is wired up, and carries an `AdminInDevBanner` saying so.
 *
 * Nothing here touches the database; delete entries freely as features go live.
 *
 * The CRM pipeline's example leads used to live here, and so did four example
 * bookings the Sales screen merged in beside real enquiries. Neither does now:
 * Sales is fed by `tour_requests` and `bookings`, so what it shows is what
 * happened. The Blog studio's four example drafts have gone the same way — it
 * reads `blog_post_drafts`, so what it lists is what the pipeline wrote. And
 * the Notifications page's example templates and sends: it reads `message_log`,
 * so what it lists is what the site sent.
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
