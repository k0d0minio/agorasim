/**
 * Placeholder job for the daily dispatcher.
 *
 * Removed as soon as the first real job (day-before-reminder or
 * thankyou-review) registers itself.
 */
import "server-only";

import { register, type CronJobResult } from "@/lib/cron/jobs";

async function noop(): Promise<CronJobResult> {
  return { name: "noop", summary: "no-op — no jobs registered yet" };
}

register(noop);
