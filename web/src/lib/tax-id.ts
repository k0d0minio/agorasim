/**
 * The guest's tax number for the fatura (JAM-527).
 *
 * A consumer may ask for their NIF on the fatura, and then it must be there
 * (CIVA art. 36.º n.º 16). The field is optional everywhere it appears: the
 * booking checkout, the enquiry form and the quote payment step.
 *
 * The rule (Jamie, 2026-11-24, Q1 of the spec): a value of nine digits, with or
 * without a `PT` prefix, is a Portuguese NIF and its check digit must be right.
 * Any other value is a foreign tax number, kept as free text up to
 * {@link TAX_ID_MAX_LENGTH} characters. A foreign number of nine digits is thus
 * checked as a NIF — the price of not asking for a country.
 */

/** The longest foreign tax number kept. Longer is refused, not truncated. */
export const TAX_ID_MAX_LENGTH = 20;

export type TaxIdResult =
  /** `null` when the guest left the field empty. */
  | { ok: true; value: string | null }
  | { ok: false };

/** True when nine digits pass the NIF check digit (mod 11, weights 9 to 2). */
export function isValidNif(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(digits[i]) * (9 - i);
  const rest = sum % 11;
  const check = rest < 2 ? 0 : 11 - rest;
  return check === Number(digits[8]);
}

/**
 * Read a tax number as a form posted it.
 *
 * Spaces, dots and hyphens are dropped before the check, because a guest types
 * "123 456 789" as often as "123456789". A Portuguese NIF is stored as its nine
 * digits, without the prefix. A foreign number is stored upper-cased, as typed
 * less the separators.
 */
export function parseTaxId(raw: unknown): TaxIdResult {
  if (typeof raw !== "string") return { ok: true, value: null };
  const compact = raw.replace(/[\s.\-]/g, "").toUpperCase();
  if (compact === "") return { ok: true, value: null };

  const portuguese = /^(?:PT)?(\d{9})$/.exec(compact);
  if (portuguese) {
    return isValidNif(portuguese[1]) ? { ok: true, value: portuguese[1] } : { ok: false };
  }
  if (compact.length > TAX_ID_MAX_LENGTH) return { ok: false };
  return { ok: true, value: compact };
}
