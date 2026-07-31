import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { count, inArray, eq } from "drizzle-orm";
import {
  db,
  tourRequests,
  featureRequests,
  geoContentDrafts,
  blogPostDrafts,
  socialPostDrafts,
  emailCampaignDrafts,
} from "@/db";
import type { ContentStatus, FeatureRequestStatus } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_AREAS } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Reads live counts — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const review: ContentStatus[] = ["draft", "in_review"];
  const published: ContentStatus[] = ["published"];
  const openFeature: FeatureRequestStatus[] = ["new", "planned", "in_progress"];

  const [
    [newSubmissions],
    [openFeatureRequests],
    [geoReview],
    [blogReview],
    [socialReview],
    [emailReview],
    [geoPublished],
    [blogPublished],
    [socialPublished],
    [emailPublished],
  ] = await Promise.all([
    db.select({ n: count() }).from(tourRequests).where(eq(tourRequests.status, "new")),
    db
      .select({ n: count() })
      .from(featureRequests)
      .where(inArray(featureRequests.status, openFeature)),
    db.select({ n: count() }).from(geoContentDrafts).where(inArray(geoContentDrafts.status, review)),
    db.select({ n: count() }).from(blogPostDrafts).where(inArray(blogPostDrafts.status, review)),
    db.select({ n: count() }).from(socialPostDrafts).where(inArray(socialPostDrafts.status, review)),
    db
      .select({ n: count() })
      .from(emailCampaignDrafts)
      .where(inArray(emailCampaignDrafts.status, review)),
    db
      .select({ n: count() })
      .from(geoContentDrafts)
      .where(inArray(geoContentDrafts.status, published)),
    db.select({ n: count() }).from(blogPostDrafts).where(inArray(blogPostDrafts.status, published)),
    db
      .select({ n: count() })
      .from(socialPostDrafts)
      .where(inArray(socialPostDrafts.status, published)),
    db
      .select({ n: count() })
      .from(emailCampaignDrafts)
      .where(inArray(emailCampaignDrafts.status, published)),
  ]);

  const draftsToReview =
    (geoReview?.n ?? 0) + (blogReview?.n ?? 0) + (socialReview?.n ?? 0) + (emailReview?.n ?? 0);
  const publishedCount =
    (geoPublished?.n ?? 0) +
    (blogPublished?.n ?? 0) +
    (socialPublished?.n ?? 0) +
    (emailPublished?.n ?? 0);

  const STATS = [
    {
      label: "New submissions",
      value: String(newSubmissions?.n ?? 0),
      hint: "Awaiting first contact",
    },
    {
      label: "Drafts to review",
      value: String(draftsToReview),
      hint: "Across all content pipelines",
    },
    { label: "Published", value: String(publishedCount), hint: "Content pushed live" },
    {
      label: "Open feature requests",
      value: String(openFeatureRequests?.n ?? 0),
      hint: "In the toolkit backlog",
    },
  ];

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="sr-only">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.label} size="sm">
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Areas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ADMIN_AREAS.map(({ href, icon: Icon, label, cardTitle, description, dev }) => (
              <Link key={href} href={href} className="group/section">
                <Card className="h-full transition-colors group-hover/section:ring-foreground/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      {dev && (
                        <Badge variant="outline" className="text-muted-foreground">
                          In development
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-2 flex items-center gap-1">
                      {cardTitle ?? label}
                      <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover/section:translate-x-0 group-hover/section:opacity-100" />
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
