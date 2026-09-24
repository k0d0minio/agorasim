# Tasks: thankyou-review-email

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] The 06:00 dispatch sends one thank-you per confirmed, non-no-show booking dated yesterday (Europe/Lisbon), Stripe and cash alike, in the enquiry's locale, carrying the review link from `site.ts`, the Instagram line and the opt-out line; pending, expired, cancelled, refunded and no-show-marked bookings get none
- [x] A booking dated the day before yesterday that has no thank-you yet (missed run or failed send) is thanked; one already thanked is counted `already`; a rerun the same morning sends nothing; a booking moved to a new date is thanked only after the new date
- [x] An address on the opt-out list is skipped (counted `opted out`, no log row); a booking with no enquiry or no email is skipped without failing the job; the day-before reminder and every booking email still go to an opted-out address
- [x] Opening the opt-out link records nothing; pressing its button records the opt-out, withdraws `marketingConsent` on every enquiry with that address, and shows the done state in the link's locale; repeating it is idempotent; a forged or malformed token shows a neutral invalid-link page
- [x] A POST to the `List-Unsubscribe` URL with a valid token records a `one-click` opt-out and answers 200; the thank-you carries both `List-Unsubscribe` and `List-Unsubscribe-Post` headers
- [x] The opt-out row stores no address in the clear, survives an Art. 17 erasure and the retention sweep, and the Art. 15 export reports it; with `EMAIL_OPT_OUT_SECRET` unset the job sends nothing and says so in its summary and the error tracker
- [x] On the Sales board detail page an admin can mark a past or same-day confirmed booking as "Faltou" and clear it again; both are audited; a marked booking is not thanked
- [x] The dispatcher's audit row names `thank-you-review` with sent / already / skipped / opted out / failed counts
- [x] The privacy policy (PT + EN) states the thank-you, its soft-opt-in basis, the opt-out and the hashed record kept after erasure; `data-protection.md` is updated in the same PR; `MARKETING_CONSENT_VERSION` is unchanged
- [x] Unit tests cover the Lisbon lookback window, the status and no-show filter, the opt-out skip, the once-only rule, token sign/verify/forgery, the opt-out action (row + consent withdrawal + idempotence), both locales of the template, and the no-show actions' authorization; CI green

## Queue

- [x] Schema + migration: `email_opt_outs`, `bookings.no_show_at` (5dd402b)
- [x] Opt-out core: `lib/email-opt-out-token.ts`, `lib/email-opt-out.ts`, audit actions (731cef6)
- [x] Template: `site.ts` review link, `email.ts` headers, `emails.ts` copy, `guestThankYouEmail` (7085d22)
- [x] Job: `thankableOnSql`, `bookingsToThankOn`, `cron/thank-you-review.ts`, dispatcher import (a3a50cc)
- [x] Opt-out page + actions + panel, one-click route (ab91ada)
- [x] No-show mark: `lib/booking-no-show.ts`, `setBookingNoShow`, toggle, Sales detail (3b305d9)
- [x] Art. 15, backup registry, privacy PT+EN, data-protection.md, `.env.example` (cf799b7)
- [x] Merge main, flip ready, full-gate GREEN (fb20201)
