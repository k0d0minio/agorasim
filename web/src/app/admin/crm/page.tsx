import { GripVertical, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { CrmMoveMenu } from "@/components/admin/crm-move-menu";
import { previewPipeline } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";

const STAGES = previewPipeline.map((column) => column.title);

/**
 * CRM pipeline board (proposal Feature 8) — design preview. The live version
 * upgrades the existing lead lifecycle into a board fed by every website
 * enquiry and booking.
 *
 * Two interactions, one per input: a kanban board you drag from `md` up, and
 * below that a per-column list where each lead carries an explicit "move to…"
 * picker. Drag-and-drop has no touch equivalent, and the phone is this tool's
 * primary device — so the preview commits to both now.
 */
export default function AdminCrmPage() {
  return (
    <AdminShell title="CRM pipeline">
      <AdminInDevBanner note="This upgrades your current lead list into a board — every enquiry and booking will flow in automatically, with notes and next actions per person." />

      <div className="-mx-4 px-4 pb-4 sm:-mx-6 sm:px-6 md:overflow-x-auto">
        <div className="flex flex-col gap-4 md:min-w-max md:snap-x md:snap-mandatory md:flex-row">
          {previewPipeline.map((column) => (
            <section
              key={column.title}
              className="w-full rounded-xl border bg-muted/30 md:w-72 md:shrink-0 md:snap-start"
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
                    className="group rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-md md:cursor-grab"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{lead.name}</p>
                      {/* Drag handle is desktop-only — see the move picker below. */}
                      <GripVertical
                        className="hidden size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 md:block"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{lead.detail}</p>
                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      {lead.value && <span className="font-semibold text-primary">{lead.value}</span>}
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3" aria-hidden />
                        {lead.age} ago
                      </span>
                      {lead.nextAction && (
                        <Badge variant="outline" className="ml-auto">
                          {lead.nextAction}
                        </Badge>
                      )}
                    </div>
                    <CrmMoveMenu
                      leadName={lead.name}
                      stages={STAGES}
                      currentStage={column.title}
                      className="mt-3 md:hidden"
                    />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        On a phone, every lead carries a “move to…” picker; on a larger screen you drag cards
        between columns. Either way notes, contact history and reminders stay one tap away.
      </p>
    </AdminShell>
  );
}
