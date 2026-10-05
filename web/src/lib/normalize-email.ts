/**
 * The one canonical form of an email address — database-free, so both the
 * admin accounts (`lib/admin-users.ts`) and the opt-out hashes
 * (`lib/email-opt-out-token.ts`) fold addresses the same way. A change here
 * changes every stored opt-out hash's input: treat it as a migration.
 */

/** Fold an email to its canonical stored form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
