import { secretsMatch } from "@/lib/admin-session";
import { recordAudit } from "@/lib/audit";
import { backupBlobToken, runBackup, summarize } from "@/lib/backup-job";

/**
 * Nightly database backup — every business table as gzipped NDJSON in a
 * private Vercel Blob store, kept 30 days. Scheduled by `vercel.json` at
 * 02:30 UTC, clear of the Monday 03:00 retention pass and the 06:00 dispatch.
 * Neon's free plan keeps six hours of history and no snapshots, so from the
 * first real payment this export is the only restore path beyond that window
 * (see `lib/backup.ts`; restore with `pnpm db:restore-backup`).
 *
 * **Authorization.** Identical to the retention route: Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` — the one secret, shared by all three
 * cron routes. The route is a public URL, so it checks that header itself and
 * refuses without it. If `CRON_SECRET` is unset the route refuses every
 * request rather than running open: an unauthenticated endpoint that copies
 * the whole database somewhere on demand is not one to leave lying around,
 * even when "somewhere" is our own store.
 *
 * Likewise refused, as "not configured", when there is no Blob token to write
 * with — better a 503 in the cron log than a run that appears to succeed.
 *
 * The run is recorded in the audit log with a null actor — nobody pressed
 * anything — using {@link recordAudit}, which throws on failure, so a run
 * that cannot be recorded surfaces as a failed cron.
 */
export const dynamic = "force-dynamic";

/** Fourteen selects, fifteen uploads and a prune — well over the 10 s default. */
export const maxDuration = 120;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[backup] CRON_SECRET is not set — refusing to run");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const presented = request.headers.get("authorization") ?? "";
  if (!(await secretsMatch(presented, `Bearer ${secret}`))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!backupBlobToken()) {
    console.error(
      "[backup] neither BACKUP_BLOB_READ_WRITE_TOKEN nor BLOB_READ_WRITE_TOKEN is set — refusing to run",
    );
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  try {
    const result = await runBackup();

    await recordAudit({
      actorUserId: null,
      action: "cron.backup",
      entityType: "cron",
      // Counts and sizes — never the rows themselves.
      after: {
        date: result.date,
        tables: result.tables,
        totalRows: result.totalRows,
        totalBytes: result.totalBytes,
        pruned: result.pruned,
        retentionDays: result.retentionDays,
      },
      ipAddress: null,
    });

    console.info(summarize(result));

    return Response.json(result);
  } catch (err) {
    console.error("[backup] run failed", err);
    return Response.json({ error: "backup run failed" }, { status: 500 });
  }
}
