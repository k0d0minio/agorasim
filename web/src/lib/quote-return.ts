/**
 * A return from Stripe whose quote link died while the couple paid.
 *
 * The session's `return_url` carries the token the quote page had when the
 * couple tapped pay (`lib/quote-checkout.ts`). A balance email or a "Reenviar"
 * in that window rotates the link (`rotateQuoteLink`, `markQuoteSent`), and
 * only the new digest is stored, so the old token can no longer be tied to any
 * quote. The webhook still records the money. Without this, the couple who
 * just paid would land on "Este link já não é válido".
 *
 * The session id is the credential here instead, and only for a session that
 * is unguessable *and* finished: one of our stored instalments' sessions, on a
 * live quote, that Stripe says is complete — paid, or waiting on a delayed
 * method — carries that instalment's metadata, and was created inside
 * {@link RETIRED_RETURN_HOURS}.
 *
 * Its own module, apart from `lib/quote-checkout.ts`, because `proxy.ts` asks
 * it before it turns a dead link into a 404: the proxy carries the quote
 * queries and the Stripe client, not the receipts and their emails. The page
 * asks again before it renders.
 */
import "server-only";

import { getPaymentBySessionId } from "@/lib/quotes";
import { isStripeConfigured, onOwningAccount, stripe } from "@/lib/stripe";

/**
 * How long a return URL still opens its quote after a later email retired the
 * link it carries. A day covers a slow return from Stripe and a reload the
 * morning after, and a saved return URL does not open the quote forever.
 */
export const RETIRED_RETURN_HOURS = 24;

/** The id of the quote behind a retired link's return, or `null`. Never throws. */
export async function resolveRetiredQuoteReturn(
  sessionId: string,
  options: { now?: Date } = {},
): Promise<string | null> {
  const { now = new Date() } = options;
  // The shape `reconcileQuoteReturn` accepts: the query string is the
  // visitor's to type, and nothing else is worth a query.
  if (!/^cs_[A-Za-z0-9_]{8,250}$/.test(sessionId) || !isStripeConfigured()) return null;

  try {
    const found = await getPaymentBySessionId(sessionId);
    if (!found) return null;
    const { status } = found.quote;
    if (status !== "sent" && status !== "deposit_paid" && status !== "paid") return null;

    const session = await onOwningAccount((account) =>
      stripe().checkout.sessions.retrieve(sessionId, undefined, account),
    );
    // Compared with the stored row, not shape-checked: nothing here queries
    // with these values.
    if (
      session.metadata?.quoteId !== found.quote.id ||
      session.metadata?.paymentId !== found.payment.id ||
      session.status !== "complete"
    ) {
      return null;
    }
    if (now.getTime() - session.created * 1000 > RETIRED_RETURN_HOURS * 60 * 60 * 1000) {
      return null;
    }
    return found.quote.id;
  } catch (err) {
    console.error(`[quote-return] couldn't resolve a return for ${sessionId}`, err);
    return null;
  }
}
