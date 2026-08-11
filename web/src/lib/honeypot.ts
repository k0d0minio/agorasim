/**
 * Name of the honeypot input on the public tour-request form. Real people never
 * see it — it is rendered off-screen and skipped by tab order — so anything
 * submitted in it came from a bot that filled every field it found, and
 * `submitTourRequest` discards the submission.
 *
 * The form (a client component) and the action (a server one) both need the
 * name, and it cannot live beside the action: a `"use server"` module may only
 * export async functions, so a plain constant exported from it fails the build
 * the moment the form is mounted. Hence this shared, environment-neutral file.
 */
export const HONEYPOT_FIELD = "company_website";
