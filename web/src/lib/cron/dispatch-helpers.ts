/**
 * What the daily dispatcher jobs (`day-before-reminder.ts`,
 * `thank-you-review.ts`) share: the catalogue → guest-facing title lookup and
 * the sealed pass runner. Behaviour lives in the jobs; this is only the
 * scaffolding they would otherwise each restate.
 */
import "server-only";

import type { DateKey } from "@/lib/availability";
import { titleFromCatalogue, type TitleOf } from "@/lib/booking-emails";
import { listCatalogue } from "@/lib/experience-catalogue";
import { captureError } from "@/lib/observability";

export type { TitleOf };

/**
 * Reads the catalogue once and returns the title lookup. A retired route or
 * add-on still has to be nameable to the guest who took it; the slug is a poor
 * name but never a blank — same rule as the other mails.
 */
export async function catalogueTitleOf(): Promise<TitleOf> {
  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  return titleFromCatalogue(catalogue);
}

/**
 * One pass, sealed off from the other: a day whose bookings cannot be read is
 * reported (the log, the error tracker, the summary) and the other still runs.
 * `prefix` is the job's log tag (`reminder`, `thank-you`).
 */
export async function runSealedPass<Pass extends string>(
  job: string,
  prefix: string,
  pass: Pass,
  date: DateKey,
  run: () => Promise<string>,
): Promise<string> {
  try {
    return await run();
  } catch (err) {
    console.error(`[${prefix}] ${pass} ${date} — bookings could not be read`, err);
    captureError(err, { area: "cron", tags: { job, pass } });
    return `${pass} ${date}: not run — bookings could not be read`;
  }
}
