/**
 * The address-level suppression list — the database half (the crypto half is
 * `lib/email-opt-out-token.ts`; the table's note is in `db/schema.ts`).
 *
 * **One check, one write.** {@link isOptedOut} is the question every
 * marketing-basis send asks before it claims a message — today only the
 * post-tour thank-you (D24), and any future sender that is not about one of
 * the guest's own bookings must ask it too. It is never asked of booking mail:
 * the confirmation, the day-before reminder, a cancellation or a move are the
 * contract, and an opt-out does not stop them. {@link recordOptOut} is the one
 * write, reached from the opt-out page's button and the one-click endpoint.
 *
 * **Opting out also withdraws consent.** A guest who once ticked the marketing
 * box and now says "stop" has withdrawn that consent too (Art. 7(3)), so every
 * enquiry with the address loses its `marketing_consent`. The enquiries hold
 * the address in the clear and the list holds only its hash, so the match is
 * made here, over the (few) enquiries that currently carry consent — never by
 * putting the secret in SQL.
 *
 * No transaction: the HTTP driver has none, and neither step needs one. The
 * suppression row goes first because it is the objection itself; both steps
 * are idempotent, so a retry after a failure between them finishes the job.
 */
import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db, emailOptOuts, tourRequests, type OptOutVia } from "@/db";
import { recordAuditOrWarn } from "@/lib/audit";
import { optOutAddressHash } from "@/lib/email-opt-out-token";

/** Whether an address hash is on the list. */
export async function isAddressHashOptedOut(addressHash: string): Promise<boolean> {
  const rows = await db
    .select({ addressHash: emailOptOuts.addressHash })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.addressHash, addressHash))
    .limit(1);
  return rows.length > 0;
}

/**
 * Whether an address has opted out of every email that is not about one of its
 * bookings. Throws when `EMAIL_OPT_OUT_SECRET` is unset — a sender that cannot
 * ask must not send.
 */
export async function isOptedOut(email: string): Promise<boolean> {
  return isAddressHashOptedOut(await optOutAddressHash(email));
}

/** When an address opted out, or `null` — the Art. 15 export's question. */
export async function optedOutAt(email: string): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: emailOptOuts.createdAt })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.addressHash, await optOutAddressHash(email)))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

export type OptOutResult = {
  /** False when the address was already on the list — the repeat press. */
  recorded: boolean;
  /** Enquiries whose marketing consent this call withdrew. */
  consentWithdrawn: number;
};

/**
 * Put an address hash on the list and withdraw marketing consent on every
 * enquiry with that address. Idempotent: pressing twice records nothing new.
 *
 * The audit entry names the path and the counts, never the address or the
 * hash — the log is read by people who have no business knowing who asked.
 */
export async function recordOptOut(addressHash: string, via: OptOutVia): Promise<OptOutResult> {
  const inserted = await db
    .insert(emailOptOuts)
    .values({ addressHash, via })
    .onConflictDoNothing()
    .returning({ addressHash: emailOptOuts.addressHash });

  const consenting = await db
    .select({ id: tourRequests.id, email: tourRequests.email })
    .from(tourRequests)
    .where(eq(tourRequests.marketingConsent, true));

  const matching: string[] = [];
  for (const row of consenting) {
    if (row.email && (await optOutAddressHash(row.email)) === addressHash) {
      matching.push(row.id);
    }
  }

  if (matching.length > 0) {
    await db
      .update(tourRequests)
      .set({ marketingConsent: false, marketingConsentAt: null, marketingConsentVersion: null })
      .where(inArray(tourRequests.id, matching));
  }

  const result: OptOutResult = { recorded: inserted.length > 0, consentWithdrawn: matching.length };

  if (result.recorded || result.consentWithdrawn > 0) {
    await recordAuditOrWarn({
      actorUserId: null,
      action: "email.opted_out",
      entityType: "email_opt_out",
      entityId: null,
      after: { via, consentWithdrawn: result.consentWithdrawn },
    });
  }

  return result;
}
