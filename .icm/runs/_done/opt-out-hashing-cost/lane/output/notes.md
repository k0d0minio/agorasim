# Chore: opt-out-hashing-cost

- invariant: behaviour unchanged; only the crypto cost of checking and recording an email
  opt-out differs.
- change: `web/src/lib/email-opt-out-token.ts`: `hmacBytes` re-imported the raw secret into a
  `CryptoKey` on every call; the key is now cached per process, keyed by the secret string
  itself so a secret change (a test stub, or a real rotation) re-imports instead of signing
  under a stale key. Added `optOutTokenFromHash`, which mints the link token from an
  already-computed address hash.
  `web/src/lib/cron/thank-you-review.ts`: the dispatcher hashed each guest's address twice per
  booking (once via `isOptedOut`, again inside `optOutToken`); it now hashes once
  (`optOutAddressHash`) and reuses that hash for both `isAddressHashOptedOut` and
  `optOutTokenFromHash`.
- change (considered, not made): the triage stub also asked `recordOptOut`
  (`web/src/lib/email-opt-out.ts`) to skip its consenting-enquiry scan on a repeat press. That
  scan is what makes the module's documented "a retry after a failure between them finishes the
  job" property true — a genuine retry (the insert succeeds, the consent withdrawal fails, the
  caller calls `recordOptOut` again) is indistinguishable from a harmless repeat press using only
  the row's own existence, so gating the scan on "the suppression row already existed" would
  silently break that guarantee for the case it was written to cover. Nothing in
  `email_opt_outs` or `tour_requests` names whether the withdrawal step already ran, so there is
  no schema-free way to tell the two apart. The stub's own alternative — a consent-side hash
  column so the match is one indexed query — would fix this cleanly and is the right follow-up
  if the consenting list ever grows enough to matter, but it touches the schema and every write
  site that sets `marketingConsent`, well past a low-complexity chore's single-purpose PR. The
  cost this stub actually named ("`hmacBytes` imports the CryptoKey on every call") is fixed by
  the key cache above, which is what made the per-row hashing in this scan expensive in the
  first place; parked no new stub since the consenting list stays small (explicit opt-in only)
  and the fuller fix is a `triage` item the operator can raise if it's ever worth doing.
- rollback: revert the commit — both changes are internal refactors with no stored state and no
  migration.
- learned: none.
