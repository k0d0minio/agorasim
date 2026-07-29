import { History, MessageSquareShare } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewNotificationLog, previewTemplates } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Notifications (proposal Feature 7) — design preview. Automatic bilingual
 * messages at the right moments: confirmations and reminders for guests,
 * instant alerts for the team.
 */
export default function AdminNotificationsPage() {
  return (
    <AdminShell title="Notifications">
      <AdminInDevBanner note="Set-and-forget messages: guests get confirmations, reminders and thank-yous at the right moment; you get an instant alert the second a booking or hot lead arrives." />

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquareShare className="size-4" />
        <span>Message templates</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {previewTemplates.map((template) => (
          <Card key={template.name}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{template.name}</p>
                  <Badge variant={template.audience === "Team" ? "secondary" : "ghost"}>
                    {template.audience === "Team" ? "For you" : "For guests"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{template.trigger}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.channels.map((channel) => (
                    <Badge key={channel} variant="outline">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Decorative on/off switch — live toggles come with the feature. */}
              <span
                role="switch"
                aria-checked={template.enabled}
                aria-disabled
                className={cn(
                  "mt-0.5 inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full border transition-colors",
                  template.enabled ? "border-primary bg-primary" : "border-border bg-muted",
                )}
              >
                <span
                  className={cn(
                    "mx-0.5 size-4 rounded-full bg-background shadow-xs transition-transform",
                    template.enabled && "translate-x-4",
                  )}
                />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" />
        <span>Recently sent</span>
      </div>

      <Card className="p-0">
        <ul className="divide-y">
          {previewNotificationLog.map((entry) => (
            <li key={entry.what} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{entry.what}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.channel} · {entry.when}
                </p>
              </div>
              <Badge variant="ghost" className="w-fit">
                {entry.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Reminders cut no-shows; a well-timed thank-you drives reviews and referrals. All messages go
        out in the guest&apos;s language.
      </p>
    </AdminShell>
  );
}
