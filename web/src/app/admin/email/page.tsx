import { Mail, Sparkles, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewCampaigns, previewSegments } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant = {
  Sent: "default",
  Scheduled: "secondary",
  Draft: "outline",
} as const;

/**
 * Email marketing (proposal Feature 9) — design preview. Segments your guest
 * list (including archived guests) and sends AI-drafted bilingual campaigns,
 * reviewed before every send. GDPR-compliant, with open/click tracking.
 */
export default async function AdminEmailPage() {
  // Authorized here, not by `proxy.ts` — see the note at the top of
  // `lib/admin-auth.ts`. The page renders example data today, so this guards
  // the shape of the area rather than the rows; it is the call that has to
  // already be here on the day the preview is wired to real data.
  await requireAdmin();

  return (
    <AdminShell>
      <AdminInDevBanner note="Bring past guests back with bilingual campaigns drafted in your voice — you review every send, and opens, clicks and unsubscribes are tracked automatically." />

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" />
        <span>Audience segments</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {previewSegments.map((segment) => (
          <Card key={segment.name} size="sm">
            <CardHeader>
              <CardDescription>{segment.name}</CardDescription>
              <CardTitle className="text-3xl">{segment.count}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{segment.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4" />
          <span>Campaigns</span>
        </div>
        <Button disabled>
          <Sparkles className="size-4" />
          Draft a campaign
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {previewCampaigns.map((campaign) => (
          <Card key={campaign.name}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant[campaign.status]}>{campaign.status}</Badge>
                  <span className="text-xs text-muted-foreground">→ {campaign.segment}</span>
                </div>
                <p className="mt-1.5 font-heading text-base font-semibold">{campaign.name}</p>
                <p className="truncate text-sm text-muted-foreground">“{campaign.subject}”</p>
                {campaign.stats && (
                  <p className="mt-1 text-xs font-medium text-primary">{campaign.stats}</p>
                )}
              </div>
              <div className="shrink-0">
                <Button size="sm" variant="outline" disabled>
                  {campaign.status === "Draft" ? "Review & schedule" : "View report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Re-selling to someone who already loved a tour is far cheaper than finding a new customer —
        this turns your guest list into a recurring channel.
      </p>
    </AdminShell>
  );
}
