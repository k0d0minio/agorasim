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
 * Today exactly one table holds guest personal data: `tour_requests`.
 * `admin_users` is not in scope here — those are operators, not data subjects of
 * the enquiry flow, and their records are managed from the users screen.
 */
import "server-only";

import { desc, eq } from "drizzle-orm";

import { db, tourRequests, type TourRequest } from "@/db";
import { normalizeEmail } from "@/lib/admin-users";

/** Everything the system holds about one person, ready to serialize as JSON. */
export type SubjectExport = {
  /** Marks the file as an Art. 15 response rather than an ad-hoc dump. */
  subjectEmail: string;
  generatedAt: string;
  /** Table name → the rows referencing this person. */
  records: {
    tourRequests: TourRequest[];
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

  return {
    subjectEmail,
    generatedAt: new Date().toISOString(),
    records: { tourRequests: requests },
    counts: { tourRequests: requests.length },
  };
}

/** A filename an operator can hand over without renaming it. */
export function subjectExportFilename(email: string, now: Date): string {
  const safeEmail = normalizeEmail(email).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const day = now.toISOString().slice(0, 10);
  return `agorasim-data-export-${safeEmail}-${day}.json`;
}
