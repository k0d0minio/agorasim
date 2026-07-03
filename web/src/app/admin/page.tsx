import Link from "next/link";
import { Inbox, FileText, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATS = [
  { label: "New submissions", value: "—", hint: "Awaiting the form integration" },
  { label: "Drafts to review", value: "—", hint: "From the workspaces pipeline" },
  { label: "Published this month", value: "—", hint: "Content pushed live" },
];

const SECTIONS = [
  {
    href: "/admin/submissions",
    icon: Inbox,
    title: "Form submissions",
    description:
      "Booking enquiries and contact requests will land here for triage and follow-up.",
  },
  {
    href: "/admin/content",
    icon: FileText,
    title: "Generated content",
    description:
      "Review GEO/marketing drafts produced by the workspaces before publishing them to the site.",
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Dashboard">
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="sr-only">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(({ href, icon: Icon, title, description }) => (
              <Link key={href} href={href} className="group/section">
                <Card className="h-full transition-colors group-hover/section:ring-foreground/20">
                  <CardHeader>
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <CardTitle className="mt-2 flex items-center gap-1">
                      {title}
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
