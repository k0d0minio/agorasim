/**
 * Phone-number helpers for the admin contact links.
 *
 * WhatsApp is how this business actually reaches guests, and `wa.me` needs a
 * bare international number — no `+`, spaces or punctuation. The form captures
 * whatever the guest typed, so normalisation is best-effort and deliberately
 * conservative: when the country can't be established we return `null` and the
 * UI simply omits the WhatsApp link rather than deep-linking to a wrong number.
 */

/** Portugal — the only country we infer for a bare national number. */
const PT_COUNTRY_CODE = "351";

/** `tel:` target — keep `+` and digits, drop everything a dialler ignores. */
export function toTelHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * Bare international number for `wa.me`, or `null` when we can't tell which
 * country it belongs to.
 *
 * Accepted: an explicit international prefix (`+351…`, `00351…`), or a nine
 * digit Portuguese mobile (`9xxxxxxxx`), which is the one national format this
 * business sees often enough to be worth inferring.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return digits.length >= 8 ? digits : null;
  }
  if (digits.startsWith("00")) {
    const rest = digits.slice(2);
    return rest.length >= 8 ? rest : null;
  }
  if (/^9\d{8}$/.test(digits)) {
    return `${PT_COUNTRY_CODE}${digits}`;
  }
  return null;
}

/** `https://wa.me/…` link for a captured phone number, or `null`. */
export function toWhatsAppHref(raw: string | null | undefined): string | null {
  const number = toWhatsAppNumber(raw);
  return number ? `https://wa.me/${number}` : null;
}
