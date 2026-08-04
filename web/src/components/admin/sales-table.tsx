import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit";
import type { CatalogueEntry } from "@/lib/experience-catalogue";
import type { SalesRecord } from "@/lib/sales";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactLinks } from "@/components/admin/contact-links";
import { RecordIcons } from "@/components/admin/experience-icons";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import { SubmissionCheckbox } from "@/components/admin/bulk-submission-actions";
import { LastChangedBy, Received } from "@/components/admin/record-meta";
import { requestStatusMeta } from "@/lib/admin-format";

/**
 * The merged Sales list as a table — the bookings layout, applied to every row.
 *
 * Submissions used to have its own wider table (contact, experience, add-ons,
 * party, preferred, received, status: eight columns, 940px, sideways scroll on
 * anything smaller than a laptop). Bookings had a tighter one built around what
 * a row *is*: a reference, a guest, a date, what they're doing, and the money.
 * That layout won: it survives a phone, and the long text it used to spend
 * columns on is now iconography plus a detail page one tap away.
 */
export function SalesTable({
  records,
  catalogue,
  lastChanged,
  now,
  caption,
}: {
  records: SalesRecord[];
  catalogue: Map<string, CatalogueEntry>;
  lastChanged: Map<string, AuditLogRow>;
  now: Date;
  caption: string;
}) {
  return (
    <>
      {/*
        Below md this is a stack of cards, not a wide table in a sideways
        scroller. The select-for-bulk checkbox is on the card too — putting it
        only in the desktop table would make triage-on-a-phone the weaker mode
        again, and the phone is this tool's primary device.
      */}
      <ul className="flex flex-col gap-3 md:hidden">
        {records.map((record) => (
          <li key={`${record.source}-${record.id}`}>
            <SalesCard
              record={record}
              catalogue={catalogue}
              audit={lastChanged.get(record.id)}
              now={now}
            />
          </li>
        ))}
      </ul>

      <Card className="hidden p-0 md:block">
        {/* `relative` matters: without a containing block of its own, the
            table's overflow escapes this scroller and scrolls the whole page
            sideways at widths where the table doesn't fit. */}
        <div className="relative overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableCaption>{caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={`${record.source}-${record.id}`} className="align-top">
                  <TableCell>
                    {/* Example bookings are not rows anything can be done to yet. */}
                    {record.example ? null : (
                      <SubmissionCheckbox
                        id={record.id}
                        label={`Select the lead from ${record.name}`}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {record.ref}
                    {record.example ? (
                      <Badge variant="outline" className="ml-1.5 font-sans">
                        Example
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {record.href ? (
                      <Link
                        href={record.href}
                        className="font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {record.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{record.name}</span>
                    )}
                    {record.email ? (
                      <ContactLinks email={record.email} phone={record.phone} />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {record.when ?? "—"}
                    <div className="text-xs">
                      {record.example ? "Booked" : <Received at={record.createdAt} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RecordIcons record={record} catalogue={catalogue} />
                  </TableCell>
                  <TableCell>{record.partySize ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {record.value ? (
                      <span className="font-medium">{record.value}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {record.payment ? (
                      <div className="text-xs text-muted-foreground">{record.payment}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {record.example ? (
                      <Badge variant={requestStatusMeta[record.status].variant}>
                        {requestStatusMeta[record.status].label}
                      </Badge>
                    ) : (
                      <div className="flex flex-col items-start gap-1.5">
                        <RequestStatusSelect
                          id={record.id}
                          status={record.status}
                          name={record.name}
                        />
                        <LastChangedBy audit={lastChanged.get(record.id)} now={now} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.href ? (
                      <Link
                        href={record.href}
                        aria-label={`Open ${record.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/** One record as a card: the phone layout of the same row. */
export function SalesCard({
  record,
  catalogue,
  audit,
  now,
}: {
  record: SalesRecord;
  catalogue: Map<string, CatalogueEntry>;
  audit: AuditLogRow | undefined;
  now: Date;
}) {
  return (
    <Card className="gap-3">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <div className="flex items-start gap-3">
          {record.example ? null : (
            <SubmissionCheckbox
              id={record.id}
              label={`Select the lead from ${record.name}`}
              className="mt-1.5"
            />
          )}
          <div className="min-w-0 flex-1">
            {record.href ? (
              <Link href={record.href} className="font-heading text-base font-medium hover:underline">
                {record.name}
              </Link>
            ) : (
              <p className="font-heading text-base font-medium">{record.name}</p>
            )}
            <p className="font-mono text-xs text-muted-foreground">
              {record.ref}
              {record.when ? <span className="font-sans"> · {record.when}</span> : null}
            </p>
          </div>
          {record.example ? <Badge variant="outline">Example</Badge> : null}
          {record.value ? <span className="font-medium">{record.value}</span> : null}
        </div>

        <RecordIcons record={record} catalogue={catalogue} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {record.partySize ? <span>{record.partySize} people</span> : null}
          {record.payment ? <span>{record.payment}</span> : null}
          {record.example ? null : <Received at={record.createdAt} />}
        </div>

        {record.email ? <ContactLinks email={record.email} phone={record.phone} /> : null}

        {record.example ? (
          <Badge variant={requestStatusMeta[record.status].variant} className="w-fit">
            {requestStatusMeta[record.status].label}
          </Badge>
        ) : (
          <>
            <RequestStatusSelect id={record.id} status={record.status} name={record.name} />
            <LastChangedBy audit={audit} now={now} />
          </>
        )}
      </div>
    </Card>
  );
}
