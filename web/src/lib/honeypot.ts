/**
 * The honeypot on the public forms: the tour enquiry, the wedding and event
 * quote forms and the booking checkout. Real people never see it — it is
 * rendered off-screen and skipped by tab order — so anything submitted in it
 * came from a bot that filled every field it found, and the action discards
 * the submission.
 *
 * The form (a client component) and the action (a server one) both need the
 * name, and it cannot live beside the action: a `"use server"` module may only
 * export async functions, so a plain constant exported from it fails the build
 * the moment the form is mounted. Hence this shared, environment-neutral file.
 *
 * Browser autofill must never fill it. The trap used to be `company_website`
 * under the label "Company website": Chrome matched both to the organisation
 * line of a saved address, ignored `autoComplete="off"`, filled the field, and
 * three real wedding enquiries were discarded on 2026-11-11. So the name, the
 * id and the label below hold no word that an autofill or password-manager
 * heuristic matches (no "company", "website", "name", "email", "phone",
 * "address", "org"…). Do not rename it to anything that reads like personal
 * data.
 */
export const HONEYPOT_FIELD = "hp_trap";

/** The trap's label: plain, and no word that autofill maps to a profile field. */
export const HONEYPOT_LABEL = "Leave this field empty";

/**
 * The attributes the trap input spreads, beside `id` and `name`. Off the tab
 * order, and opted out of autofill and of the common password managers
 * (1Password, LastPass, Bitwarden, Dashlane), which read these markers.
 */
export const HONEYPOT_INPUT_PROPS = {
  type: "text",
  tabIndex: -1,
  autoComplete: "off",
  defaultValue: "",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

/**
 * True when the submission filled the trap. The action then discards it and
 * logs one line, so a discard is never silent.
 */
export function isHoneypotHit(values: Record<string, unknown>): boolean {
  return String(values[HONEYPOT_FIELD] ?? "").trim() !== "";
}
