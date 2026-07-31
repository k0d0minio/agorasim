import { CalendarDays, Check, Sparkles } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/brand-icons";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewSocialPosts } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusVariant = {
  Scheduled: "secondary",
  "Needs approval": "outline",
  Posted: "default",
} as const;

/**
 * Social studio (proposal Feature 5) — design preview. Captions are generated
 * in your voice; approved posts auto-publish through the platforms' official
 * APIs, starting with Instagram + Facebook.
 */
export default function AdminSocialPage() {
  return (
    <AdminShell>
      <AdminInDevBanner note="Captions and a posting calendar are generated for you; once you approve, posts publish automatically through Instagram's and Facebook's official APIs." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            <InstagramIcon className="size-3" />
            Instagram
          </Badge>
          <Badge>
            <FacebookIcon className="size-3" />
            Facebook
          </Badge>
          <Badge variant="ghost">TikTok · YouTube — later</Badge>
        </div>
        <Button disabled>
          <Sparkles className="size-4" />
          Generate this week&apos;s posts
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        <span>Posting queue</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {previewSocialPosts.map((post) => (
          <Card key={post.caption}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  {post.platform === "Instagram" ? (
                    <InstagramIcon className="size-4 text-primary" />
                  ) : (
                    <FacebookIcon className="size-4 text-primary" />
                  )}
                  {post.platform}
                </span>
                <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{post.caption}</p>
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground">{post.slot}</span>
                {post.status === "Needs approval" ? (
                  <Button size="sm" disabled>
                    <Check className="size-4" />
                    Approve
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Only official platform APIs are used — never bots that put your accounts at risk. Other
        networks join after their per-platform approval.
      </p>
    </AdminShell>
  );
}
