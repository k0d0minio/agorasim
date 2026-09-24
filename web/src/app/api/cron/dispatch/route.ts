import { secretsMatch } from "@/lib/admin-session";
import { recordAudit } from "@/lib/audit";
import { runAllJobs } from "@/lib/cron/jobs";
import { captureError } from "@/lib/observability";

// Side-effect imports: each job module registers itself with `register()`.
import "@/lib/cron/day-before-reminder";
import "@/lib/cron/thank-you-review";

/**
 * Daily dispatcher — one cron, every registered job.
 *
 * Scheduled by `vercel.json` (daily, early morning Europe/Lisbon). Runs every
 * job in the registry in sequence; a failure in one does not stop the others.
 * Each job is responsible for its own idempotency (the message-log claim/index
 * pattern for anything that sends mail).
 *
 * **Authorization.** Identical to the retention route: Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`. The route is a public URL, so it
 * checks that header itself and refuses without it. If `CRON_SECRET` is
 * unset the route refuses every request rather than running open.
 *
 * The run is recorded in the audit log with a null actor — nobody pressed
 * anything — using {@link recordAudit}, which throws on failure, so a run
 * that cannot be recorded surfaces as a failed cron rather than as silent
 * data loss.
 *
 * Failures reach the error tracker too (`lib/observability.ts`): each job
 * that threw is captured by {@link runAllJobs} where its stack still is, and
 * a run that failed as a whole is captured here. Anything thrown outside the
 * `try` reaches Sentry through Next's `onRequestError`
 * (`src/instrumentation.ts`).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[dispatch] CRON_SECRET is not set — refusing to run");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const presented = request.headers.get("authorization") ?? "";
  if (!(await secretsMatch(presented, `Bearer ${secret}`))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { results, errors } = await runAllJobs();

    await recordAudit({
      actorUserId: null,
      action: "cron.dispatch",
      entityType: "cron",
      after: {
        jobsRan: results.length,
        jobsFailed: errors.length,
        results: results.map((r) => `${r.name}: ${r.summary}`),
        errors: errors.map((e) => `${e.name}: ${e.error}`),
      },
      ipAddress: null,
    });

    const summary = results.map((r) => `${r.name}: ${r.summary}`).join("; ");
    const errorSummary = errors.length
      ? ` — ${errors.length} job(s) failed: ${errors.map((e) => e.name).join(", ")}`
      : "";
    console.info(`[dispatch] ran ${results.length} job(s)${errorSummary}${summary ? ` — ${summary}` : ""}`);

    if (errors.length > 0) {
      return Response.json({ results, errors }, { status: 207 });
    }
    return Response.json({ results });
  } catch (err) {
    console.error("[dispatch] run failed", err);
    captureError(err, { area: "cron", tags: { job: "dispatch" } });
    return Response.json({ error: "dispatch run failed" }, { status: 500 });
  }
}
