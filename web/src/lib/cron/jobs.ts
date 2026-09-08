/**
 * The daily job registry — every scheduled job the dispatcher runs lives here.
 *
 * Each job is a plain async function that returns a summary object. The
 * dispatcher runs them in sequence; a failure in one does not stop the others.
 * Idempotency is each job's own concern — the message-log claim/index pattern
 * (`lib/message-log.ts`) is the idempotency mechanism for anything that sends
 * mail.
 *
 * **Adding a job.** Import your job function and call `register()` in this
 * module. The dispatcher picks it up on the next deploy. The route itself
 * never needs to change.
 */
import "server-only";

export type CronJobResult = {
  /** Stable machine name for logging and audit. */
  name: string;
  /** Human-readable summary of what the job did. */
  summary: string;
};

export type CronJob = () => Promise<CronJobResult>;

const jobs: CronJob[] = [];

/**
 * Register a job to run on every daily dispatch. Call once per job, typically
 * at module scope in the file that defines it — the import side-effect
 * registers the job.
 */
export function register(job: CronJob): void {
  jobs.push(job);
}

/**
 * Run every registered job in sequence. A job failure is caught and reported
 * but does not abort the rest. Returns the collected results.
 */
export async function runAllJobs(): Promise<{
  results: CronJobResult[];
  errors: { name: string; error: string }[];
}> {
  const results: CronJobResult[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const job of jobs) {
    try {
      results.push(await job());
    } catch (err) {
      const name = job.name || "anonymous";
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron] job "${name}" failed`, err);
      errors.push({ name, error: message });
    }
  }

  return { results, errors };
}
