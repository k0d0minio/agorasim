import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceMonth } from "@/lib/booking-source";

/** `2026-11` as "novembro de 2026". */
function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/**
 * "Origem das reservas" — the paid bookings of each source, month by month
 * (JAM-506).
 *
 * A list and not a table: on a phone a table of six months by many sources
 * scrolls sideways, and the question asked of it is one month at a time
 * ("what did Google bring in November?"). Every month of the window shows,
 * also an empty one, so that a month with no booking reads as zero.
 */
export function SourceCountsPanel({ months }: { months: SourceMonth[] }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Origem das reservas</CardTitle>
        <CardDescription>
          Reservas pagas por origem, no mês em que foram feitas. Sem cookies: o site regista
          só o site que trouxe o visitante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {months.map((entry) => (
            <li key={entry.month} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
                <span className="first-letter:uppercase">{monthLabel(entry.month)}</span>
                <span className="shrink-0 text-muted-foreground">
                  {entry.total} {entry.total === 1 ? "reserva" : "reservas"}
                </span>
              </p>
              {entry.sources.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {entry.sources.map((source) => (
                    <li key={source.label} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 break-all text-muted-foreground">
                        {source.label}
                      </span>
                      <span className="shrink-0 tabular-nums">{source.bookings}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
