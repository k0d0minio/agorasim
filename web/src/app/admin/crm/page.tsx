import { GripVertical, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewPipeline } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";

/**
 * CRM pipeline board (proposal Feature 8) — design preview. The live version
 * upgrades the existing lead lifecycle into a drag-and-drop board fed by every
 * website enquiry and booking.
 */
export default function AdminCrmPage() {
  return (
    <AdminShell title="CRM pipeline">
      <AdminInDevBanner note="This upgrades your current lead list into a drag-and-drop board — every enquiry and booking will flow in automatically, with notes and next actions per person." />

      {/* Board — columns scroll horizontally on small screens, kanban-style. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-4 snap-x snap-mandatory">
          {previewPipeline.map((column) => (
            <section
              key={column.title}
              className="w-72 shrink-0 snap-start rounded-xl border bg-muted/30"
              aria-label={column.title}
            >
              <header className="flex items-center justify-between px-4 pt-4 pb-2">
                <div>
                  <p className="font-heading text-sm font-semibold">{column.title}</p>
                  <p className="text-xs text-muted-foreground">{column.hint}</p>
                </div>
                <Badge variant="secondary">{column.leads.length}</Badge>
              </header>
              <div className="flex flex-col gap-2 p-3">
                {column.leads.map((lead) => (
                  <article
                    key={lead.name}
                    className="group cursor-grab rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{lead.detail}</p>
                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      {lead.value && <span className="font-semibold text-primary">{lead.value}</span>}
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3" />
                        {lead.age}
                      </span>
                      {lead.nextAction && (
                        <Badge variant="outline" className="ml-auto">
                          {lead.nextAction}
                        </Badge>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Drag cards between columns to update a lead&apos;s status — with notes, contact history and
        reminders one tap away. Nothing falls through the cracks.
      </p>
    </AdminShell>
  );
}
