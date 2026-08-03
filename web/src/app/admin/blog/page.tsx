import { CalendarClock, Eye, PenLine, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewBlogDrafts } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusVariant = {
  Draft: "outline",
  "In review": "secondary",
  Approved: "default",
  Published: "default",
} as const;

/**
 * Blog studio (proposal Feature 2) — design preview. The pipeline drafts
 * articles in your brand voice; each one waits here for a one-click review
 * before it publishes to the public blog.
 */
export default async function AdminBlogPage() {
  // Authorized here, not by `proxy.ts` — see the note at the top of
  // `lib/admin-auth.ts`. The page renders example data today, so this guards
  // the shape of the area rather than the rows; it is the call that has to
  // already be here on the day the preview is wired to real data.
  await requireAdmin();

  return (
    <AdminShell>
      <AdminInDevBanner note="The AI pipeline will draft articles in your voice on a schedule (2–4 a month) — each waits here for your one-click approval before going live, in both languages." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4" />
          <span>Publishing rhythm: 2 posts / month · next slot 8 Aug</span>
        </div>
        <Button disabled>
          <Sparkles className="size-4" />
          Draft a new article
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {previewBlogDrafts.map((draft) => (
          <Card key={draft.title}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant[draft.status]}>{draft.status}</Badge>
                  <span className="text-xs text-muted-foreground">{draft.note}</span>
                </div>
                <p className="mt-1.5 truncate font-heading text-base font-semibold">{draft.title}</p>
                <p className="text-xs text-muted-foreground">{draft.scheduled}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Eye className="size-4" />
                  Preview
                </Button>
                <Button size="sm" disabled>
                  <PenLine className="size-4" />
                  {draft.status === "Published" ? "Edit" : "Review & publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Every post ships GEO-ready: structured data, PT + EN in sync, and internal links pointing
        readers at your tours.
      </p>
    </AdminShell>
  );
}
