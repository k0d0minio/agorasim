/**
 * The one rule we place on admin passwords, in a module both sides can import.
 *
 * It lives apart from `password.ts` because that module is `server-only` (it
 * uses `node:crypto`), while the forms that have to *state* the rule render in
 * the browser. A constant is not a secret; duplicating it so the hint and the
 * validation could disagree would be.
 *
 * Length is the only rule, deliberately. Composition requirements ("one capital,
 * one symbol") push people towards predictable mangling of short words and are
 * advised against by NIST SP 800-63B; a long passphrase is stronger and easier.
 */
export const MIN_PASSWORD_LENGTH = 12;

/** The rule, as shown under a password field. */
export const MIN_PASSWORD_LENGTH_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. A short phrase works well.`;
