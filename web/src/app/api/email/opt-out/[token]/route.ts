import { recordOptOut } from "@/lib/email-opt-out";
import { verifyOptOutToken } from "@/lib/email-opt-out-token";
import { OPT_OUT_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

/**
 * RFC 8058 one-click unsubscribe — the target of the thank-you's
 * `List-Unsubscribe` header, which Gmail and Apple Mail turn into their own
 * "Unsubscribe" button and POST to with `List-Unsubscribe=One-Click`.
 *
 * **POST only.** No GET is exported, so a crawler or a link scanner gets a 405
 * and changes nothing; the human-facing page is `/[locale]/reserva/
 * deixar-de-receber/<token>`. The signed token in the path is the whole of the
 * authorisation (`lib/email-opt-out-token.ts`); the body is not needed to act
 * and is not read.
 *
 * Answers carry no detail: 200 when recorded (or already recorded — it is
 * idempotent), 400 for a malformed or forged token, 429 when throttled, 503
 * when this deployment cannot verify or store anything.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const ip = await clientIp();
  const throttle = await rateLimit(`opt-out:${ip}`, OPT_OUT_RATE_LIMIT);
  if (!throttle.allowed) {
    return new Response(null, {
      status: 429,
      headers: { "retry-after": String(throttle.retryAfterSeconds) },
    });
  }

  let addressHash: string | null;
  try {
    addressHash = await verifyOptOutToken(token);
  } catch (err) {
    console.error("[opt-out] one-click token could not be verified", err);
    return new Response(null, { status: 503 });
  }
  if (!addressHash) return new Response(null, { status: 400 });

  try {
    await recordOptOut(addressHash, "one-click");
  } catch (err) {
    console.error("[opt-out] one-click opt-out failed", err);
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 200 });
}
