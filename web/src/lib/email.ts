/**
 * Transactional email, through Resend.
 *
 * **One POST, no SDK.** Resend's send endpoint is a single JSON request, and
 * this codebase already reaches for `fetch` over a client library where the
 * surface is one call (Neon's HTTP driver, the Vercel Blob usage). A dependency
 * earns its place by doing something hard; formatting one JSON body is not it.
 * Stripe *is* in the dependency list, because verifying a webhook signature and
 * getting the API right is exactly the hard thing worth buying.
 *
 * **Never throws.** Every caller here is downstream of something that has
 * already succeeded — a payment has been taken, a booking is recorded — and
 * failing that operation because a mail server was slow would turn a missing
 * email into a lost booking. Sends return a result the caller can log; the
 * webhook logs it and moves on.
 *
 * **Unconfigured is a supported state.** With no `RESEND_API_KEY` the send is
 * skipped and said so in the logs. A deployment mid-setup should still be able
 * to take a booking; the team learns about it from the admin, which is where
 * they would look anyway.
 */
import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailMessage = {
  to: string[];
  subject: string;
  /** Plain text. Every mail this app sends is short enough to read as text. */
  text: string;
  /** Optional HTML alternative. */
  html?: string;
  replyTo?: string;
};

export type EmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "unconfigured" | "no-recipient" | "failed" };

/** Whether this deployment can send mail at all. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && senderAddress());
}

/**
 * The `From:` address. Must be on a domain verified in Resend, or the API
 * refuses the send — which is why it is configuration rather than a constant.
 */
export function senderAddress(): string | null {
  return process.env.BOOKING_EMAIL_FROM?.trim() || null;
}

/**
 * Where the team's copy of a booking goes.
 *
 * Comma-separated, because there are two of them and there will be a third.
 * Falls back to nothing rather than to a guessed address: mailing a booking to
 * an inbox nobody reads is worse than not mailing it, because it looks handled.
 */
export function teamRecipients(): string[] {
  return (process.env.BOOKING_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/** Send one message. Logs and reports failure; never throws. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = senderAddress();

  if (!apiKey || !from) {
    console.warn(
      `[email] not configured — skipping "${message.subject}" to ${message.to.length} recipient(s)`,
    );
    return { sent: false, reason: "unconfigured" };
  }
  if (message.to.length === 0) return { sent: false, reason: "no-recipient" };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // The body carries Resend's reason (unverified domain, suppressed
      // address). Logged, because the alternative is "email didn't arrive" with
      // nothing to go on.
      console.error(
        `[email] Resend refused "${message.subject}" (${response.status}): ${await response
          .text()
          .catch(() => "<no body>")}`,
      );
      return { sent: false, reason: "failed" };
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    return { sent: true, id: body?.id ?? null };
  } catch (err) {
    console.error(`[email] failed to send "${message.subject}"`, err);
    return { sent: false, reason: "failed" };
  }
}
