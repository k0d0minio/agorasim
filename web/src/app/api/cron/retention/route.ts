import { secretsMatch } from "@/lib/admin-session";
import { recordAudit } from "@/lib/audit";
import { runRetention } from "@/lib/retention";

/**
 * Scheduled retention job, in two passes: anonymise enquiries that never
 * converted and have passed `ENQUIRY_RETENTION_DAYS`, and clear the IP address
 * off audit entries older than `AUDIT_IP_RETENTION_DAYS`. Scheduled by
 * `vercel.json`.
 *
 * **Authorization.** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The
 * route is a public URL, so it checks that header itself and refuses without it.
 * If `CRON_SECRET` is unset the route refuses every request rather than running
 * open: an unauthenticated endpoint that deletes personal data on demand is a
 * denial-of-service tool pointed at the business's own sales pipeline.
 *
 * The run is recorded in the audit log with a null actor — nobody pressed
 * anything — using {@link recordAudit}, which throws on failure, so a run that
 * cannot be recorded surfaces as a failed cron rather than as silent data loss.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[retention] CRON_SECRET is not set — refusing to run");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  // `secretsMatch` rather than `!==`: it hashes both sides to a fixed length
  // before comparing in constant time, so neither the value nor the length of
  // `CRON_SECRET` leaks through how long the comparison takes. This is a public
  // URL an attacker can call as often as they like, which is exactly the setting
  // where a timing side channel is worth the two lines it costs to close.
  const presented = request.headers.get("authorization") ?? "";
  if (!(await secretsMatch(presented, `Bearer ${secret}`))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRetention();

    await recordAudit({
      actorUserId: null,
      action: "tour_request.anonymised_by_retention",
      entityType: "tour_request",
      // A count, a cutoff and a policy — never the rows themselves.
      after: { ...result },
      ipAddress: null,
    });

    console.info(
      `[retention] anonymised ${result.anonymised} enquiry(ies) older than ${result.days} days (cutoff ${result.cutoff}); ` +
        `cleared the IP from ${result.auditIpsCleared} audit entry(ies) older than ${result.auditIpDays} days (cutoff ${result.auditIpCutoff}); ` +
        `relabelled ${result.holdsExpired} lapsed booking hold(s)`,
    );

    return Response.json(result);
  } catch (err) {
    console.error("[retention] run failed", err);
    return Response.json({ error: "retention run failed" }, { status: 500 });
  }
}
