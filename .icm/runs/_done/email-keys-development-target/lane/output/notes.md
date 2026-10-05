# Chore: email-keys-development-target

- invariant: behaviour unchanged; only the declared Vercel scope of RESEND_API_KEY, BOOKING_EMAIL_FROM and BOOKING_NOTIFICATION_EMAILS differs (production, preview — no development).
- change: web/.env.example: added a `# [production,preview]` targets line above each of the three keys, the route #142 and #152 took. Unset keys already degrade safely in development (emails skipped and logged, nobody mailed).
- rollback: revert the commit; the declaration returns to all three targets and the audit reports the gap again. No runtime or schema effect.
- learned: none
- audit: `env.sh audit` — the three keys now `[OK]`. The remaining 17 gaps are other keys (admin seed, retention, Sentry, Stripe, DB … development/preview) and predate this chore; out of scope.
