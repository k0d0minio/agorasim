/**
 * Subject access (GDPR Art. 15) and erasure (Art. 17) for a person, keyed by
 * their email address.
 *
 * **The registry below is the contract.** Answering "everything you hold about
 * me" correctly means enumerating every table that references the person — so
 * adding a table that stores an email address and forgetting to add it here
 * silently makes every future export wrong. The list is deliberately explicit
 * and deliberately short; keep it that way, and extend it in the same commit
 * that adds the table.
 *
 * Two tables are in scope. `tour_requests` holds the person — name, address,
 * phone, what they wrote. `message_log` holds no identifier at all, and is here
 * anyway: "you emailed me these five times" is data about that person (Art.
 * 4(1)) and is exactly the sort of thing an access request is asking for. It is
 * found through the enquiry rows rather than by address, because the log
 * deliberately keeps no copy of one (see its note in `db/schema.ts`) — so the
 * enquiries are the index into it, and a person with no enquiry has no sends.
 *
 * `bookings` is deliberately absent: it holds no guest identity (the table's own
 * note says so), and every booking reachable from these rows is reachable
 * through the enquiry that owns it. `admin_users` is not in scope either —
 * those are operators, not data subjects of the enquiry flow, and their records
 * are managed from the users screen.
 */
import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import {
  db,
  messageLog,
  tourRequests,
  type MessageLogEntry,
  type TourRequest,
} from "@/db";
import { normalizeEmail } from "@/lib/admin-users";

/** Everything the system holds about one person, ready to serialize as JSON. */
export type SubjectExport = {
  /** Marks the file as an Art. 15 response rather than an ad-hoc dump. */
  subjectEmail: string;
  generatedAt: string;
  /** Table name → the rows referencing this person. */
  records: {
    tourRequests: TourRequest[];
    /** Every automatic message sent about one of those enquiries. */
    messageLog: MessageLogEntry[];
  };
  /** Row counts, so an empty section is obviously empty rather than ambiguous. */
  counts: Record<string, number>;
};

/** Collect every record held about `email`. Returns empty sections, not null. */
export async function exportSubjectData(email: string): Promise<SubjectExport> {
  const subjectEmail = normalizeEmail(email);

  const requests = await db
    .select()
    .from(tourRequests)
    .where(eq(tourRequests.email, subjectEmail))
    .orderBy(desc(tourRequests.createdAt));

  // No enquiries, no query: `inArray` on an empty list is a SQL error in some
  // drivers and a full scan in others, and the answer is known either way.
  const messages = requests.length
    ? await db
        .select()
        .from(messageLog)
        .where(
          inArray(
            messageLog.tourRequestId,
            requests.map((request) => request.id),
          ),
        )
        .orderBy(desc(messageLog.createdAt))
    : [];

  return {
    subjectEmail,
    generatedAt: new Date().toISOString(),
    records: { tourRequests: requests, messageLog: messages },
    counts: { tourRequests: requests.length, messageLog: messages.length },
  };
}

/** A filename an operator can hand over without renaming it. */
export function subjectExportFilename(email: string, now: Date): string {
  const safeEmail = normalizeEmail(email).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const day = now.toISOString().slice(0, 10);
  return `agorasim-data-export-${safeEmail}-${day}.json`;
}
