# Spec: The thank-you — their Google review link finally gets used

- slug: thankyou-review-email
- personas: guest, team
- touches: web/src/content/site.ts, web/src/content/emails.ts, web/src/lib/booking-emails.ts, web/src/lib/email.ts, web/src/lib/bookings.ts, web/src/lib/cron, web/src/lib/subject-data.ts, web/src/db/schema.ts, web/drizzle, web/src/app/[locale]/reserva, web/src/app/api, web/src/app/admin/sales, web/src/app/admin/actions.ts, web/src/content/privacy.ts, .icm/docs/data-protection.md
- complexity: complex

## Problem

Diogo & Rita wrote three automatic messages (info PDF §2.6). The third, "Olá, thank you so
much… Please leave your review… https://g.page/r/CWIk-M6uFZMdEBM/review", is the one that
brings the next guest, and it is never sent. The review URL exists only in the PDF. The
dispatcher (#85) already runs the day-before reminder (#124), and the message log already has
a `thank-you-review` kind with no sender. The privacy policy says every email is about a
booking and that marketing rests "exclusively" on consent. A review ask is neither, so the
policy has to change in the same PR as the send. D24 settled the basis: soft opt-in (an
existing customer, Agorasim's own service, one send, an opt-out line in the email). The team
also has no way to say a guest never turned up, so today a no-show would be thanked for a
tour they never took. This completes contracted feature ⑤ (proposal §2.6). The objective is
that the post-tour thank-you with the review link goes out by itself.

## Proposed change

- **The review link.** `site.ts` gains `reviews.google =
  "https://g.page/r/CWIk-M6uFZMdEBM/review"` beside `social`. The email reads it from there
  and never hard-codes it.
- **Who is thanked.** A new query in `lib/bookings.ts` returns every booking that:
  - has `status = 'confirmed'`, for both Stripe and cash/manual bookings;
  - is **not** marked as a no-show (`no_show_at is null`, below);
  - is dated **yesterday or the day before**, as calendar days in `Europe/Lisbon`
    (`BUSINESS_TIME_ZONE`), computed from the run's clock.

  Each row is joined to its enquiry for the guest's name, email and locale, and carries the
  booking id, ref, enquiry id, date, tour slug and mode. The query uses the booking's
  **current** date, so a booking moved (weather or otherwise) is thanked only after its new
  date and never after the old one. Pending, expired, cancelled and refunded bookings are
  never returned.
- **When.** A second job registered on the daily dispatcher (06:00 UTC, `vercel.json`
  unchanged) runs next to `day-before-reminder`, under the job name `thank-you-review`. The
  2-day lookback is the catch-up: a morning the dispatcher missed, or a send that failed, is
  retried once, a day late. After that the thank-you is dropped.
- **Once only.** Every send goes through `sendLoggedEmail` with
  `{ kind: "thank-you-review", recipient: "guest", bookingId, tourRequestId }`. There is no
  `subjectDate`: the kind is booking-shaped, keyed on `message_log_booking_kind_key`, so a
  booking is thanked at most once, ever.
  - A booking thanked yesterday is still inside today's lookback. It loses the claim and is
    counted `already`.
  - A failed send releases its claim (the index excludes `failed`), so the next run retries
    it while the booking is still inside the window.
  - Two bookings by the same address get one thank-you each. This is not deduplicated by
    address (see Out of scope).
- **Skipped, never an error, never claimed:**
  - a booking with no enquiry or no email (erased): counted `skipped`;
  - an address on the opt-out list: counted `opted out`.

  Per-booking failures follow the reminder's pattern: counted, logged by booking ref and
  never by address, and one failure never costs the others their send. A lookback day whose
  bookings cannot be read is reported to the log, the error tracker and the summary. The
  dispatcher's audit row names `thank-you-review` with sent / already / skipped / opted out /
  failed counts.
- **The message.** New copy goes in `content/emails.ts` and is rendered by
  `lib/booking-emails.ts` in HTML and plain text, in the enquiry's locale, with the same
  branded layout as the reminder. The client wrote it for both tours ("same for both"),
  so there is no per-tour variant. EN is the client's §2.6 text with the grammar lightly
  mended. PT is a translation in their voice, gender-neutral towards the guest (the rule
  on `bookingEmails.guest.lead`):
  - Subject: "Muito obrigado, {name}" / "Thank you so much, {name}". If there is no name,
    the subject drops ", {name}".
  - Lead, PT: "Olá {name}, muito obrigado! Esperamos que tenha gostado mesmo desta
    experiência pela zona rural onde crescemos."
  - Lead, EN: "Olá {name}, thank you so much. We hope you really enjoyed this experience
    around the rural area where we grew up!"
  - Review ask, PT: "Deixe a sua avaliação para que outras pessoas saibam como se sentiu —
    ajuda-nos a chegar a mais almas como a sua." Button: "Deixar uma avaliação no Google".
  - Review ask, EN: "Please leave your review so other people know how you felt — it helps
    us reach more souls like you." Button: "Leave a Google review".
  - In both locales the button links `site.reviews.google`, and the plain-text part puts
    the URL on its own line.
  - Close, PT: "Muito obrigado, foi mesmo bom estar consigo. Conte-nos mais sobre si:
    encontra-nos no Instagram em agorasim.pt e mantemo-nos em contacto. Boas viagens e viva
    o momento presente! — Diogo e Rita, Agorasim". The handle links `site.social.instagram`.
  - Close, EN: "Thank you so much, it was really nice to meet you. Let us know more about
    you: you can find us on Instagram at agorasim.pt and we can keep in touch. Enjoy your
    travels and live in the present moment! — Diogo and Rita, Agorasim".
  - Opt-out line in the footer:
    - PT: "Não quer receber mais emails destes? Deixar de receber: {link}".
    - EN: "Don't want emails like this one? Unsubscribe: {link}".
  - The email has **no** money line, **no** cancellation link and **no** booking details
    beyond the tour name.
- **The opt-out — an address-level suppression list.**
  - **The table.** A new `email_opt_outs` table holds one row per address: a keyed hash
    (HMAC-SHA-256) of the trimmed, lowercased address, when it was recorded, and how
    (`page` or `one-click`). It never stores the address itself. The hash key is a new,
    dedicated secret, `EMAIL_OPT_OUT_SECRET`. It is never rotated, because rotating it
    orphans every recorded opt-out; the module comment and `data-protection.md` both say so.
    Without the secret the job **fails closed**: it sends nothing, reports "not run —
    EMAIL_OPT_OUT_SECRET unset" in its summary and to the error tracker, and the opt-out
    page renders a neutral error.
  - **The helper.** `isOptedOut(email)` is the one check. The thank-you job calls it, and so
    must any future marketing-basis sender. It is never applied to booking mail:
    confirmation, reminder, cancellation and moved notices are contract performance and
    still go out.
  - **The link.** Each thank-you carries a signed link. It holds no address and no booking
    id in the clear, it cannot be forged without the secret, and it stays valid after the
    enquiry is erased. It opens `/[locale]/reserva/deixar-de-receber/[token]`: a bilingual,
    `force-dynamic`, `noindex` page, shaped like the cancel page. The page explains that the
    guest will stop getting the thank-you and any other email that is not about one of their
    bookings, and that booking emails continue. It has one button (a Server Action POST):
    "Deixar de receber" / "Unsubscribe".
    - GET never records anything, so a mail scanner that prefetches links cannot opt a
      guest out.
    - A second POST, or a visit after opting out, shows the done state. It is idempotent
      and never an error.
    - A bad or forged token shows a neutral "link not valid" page (not a 500) and reveals
      nothing.
  - **One-click.** The thank-you also sends `List-Unsubscribe: <https://…/api/…/{token}>` and
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). The route handler
    accepts POST only, records the opt-out as `one-click` and answers 200. `lib/email.ts`
    gains a `headers` passthrough on `EmailMessage` to carry them.
  - **What opting out does.** It inserts the suppression row if one is missing and records
    an audit entry that names no address. It also withdraws explicit consent: every
    `tour_requests` row with that address gets `marketingConsent = false` and
    `marketingConsentAt` / `marketingConsentVersion` set to null.
  - **What keeps the row.** The row survives the retention sweep and an Art. 17 erasure, so
    an erased guest who books again is still not thanked. The Art. 15 export
    (`lib/subject-data.ts`) reports whether the subject's address is opted out, and since
    when.
- **The no-show mark.**
  - **The column.** `bookings` gains a nullable `no_show_at` timestamp.
  - **The action.** On the Sales board detail page (`app/admin/sales/[id]`), each booking
    panel shows **"Marcar falta"** when the booking is confirmed, dated today or earlier
    (Lisbon) and not yet marked. A marked booking shows a **"Faltou"** badge and a **"Retirar
    falta"** action that clears the mark. The vocabulary is "falta" (`admin-pt-inventory.md`:
    "os lembretes reduzem as faltas").
  - **The hint.** Beside the action, a one-line hint: "Marque no próprio dia — o
    agradecimento sai na manhã seguinte."
  - **Rules.** Both actions are admin-only Server Actions, audited with who and when, and
    call `revalidatePath` like the other Sales-board writes. The mark only stops the
    thank-you. It changes no money, no status and no capacity.
- **Policy and register of processing, in this PR.**
  - **`content/privacy.ts`, both locales:**
    - The lawful-basis section says marketing rests on consent **except** one thank-you
      after a completed experience. That email is sent to customers under the soft opt-in
      (legitimate interest, Art. 6(1)(f)), with a link in the email to opt out, and the
      guest may object at any time.
    - The Resend paragraph lists "o agradecimento depois do passeio" / "the thank-you after
      the tour" and stops calling every email transactional.
    - The retention and rights text says an opt-out is kept, in hashed form, after erasure,
      so the objection can be honoured.
    - `privacyContent.marketing.label` is untouched, so `MARKETING_CONSENT_VERSION` does not
      move.
  - **`.icm/docs/data-protection.md`:**
    - The Resend row's purpose gains the thank-you, with its basis.
    - Open item 5 gains the Art. 6(1)(f) soft-opt-in wording for counsel.
    - The erasure notes gain `email_opt_outs` as the one thing an erasure deliberately
      keeps, and why.
    - The rules of thumb say `EMAIL_OPT_OUT_SECRET` is never rotated.
- **Environment.** `EMAIL_OPT_OUT_SECRET` is added to `.env.example` and to the repo's env
  documentation as required in Production, UAT and Preview.

## Acceptance criteria

- [ ] The 06:00 dispatch sends one thank-you per confirmed, non-no-show booking dated yesterday (Europe/Lisbon), Stripe and cash alike, in the enquiry's locale, carrying the review link from `site.ts`, the Instagram line and the opt-out line; pending, expired, cancelled, refunded and no-show-marked bookings get none
- [ ] A booking dated the day before yesterday that has no thank-you yet (missed run or failed send) is thanked; one already thanked is counted `already`; a rerun the same morning sends nothing; a booking moved to a new date is thanked only after the new date
- [ ] An address on the opt-out list is skipped (counted `opted out`, no log row); a booking with no enquiry or no email is skipped without failing the job; the day-before reminder and every booking email still go to an opted-out address
- [ ] Opening the opt-out link records nothing; pressing its button records the opt-out, withdraws `marketingConsent` on every enquiry with that address, and shows the done state in the link's locale; repeating it is idempotent; a forged or malformed token shows a neutral invalid-link page
- [ ] A POST to the `List-Unsubscribe` URL with a valid token records a `one-click` opt-out and answers 200; the thank-you carries both `List-Unsubscribe` and `List-Unsubscribe-Post` headers
- [ ] The opt-out row stores no address in the clear, survives an Art. 17 erasure and the retention sweep, and the Art. 15 export reports it; with `EMAIL_OPT_OUT_SECRET` unset the job sends nothing and says so in its summary and the error tracker
- [ ] On the Sales board detail page an admin can mark a past or same-day confirmed booking as "Faltou" and clear it again; both are audited; a marked booking is not thanked
- [ ] The dispatcher's audit row names `thank-you-review` with sent / already / skipped / opted out / failed counts
- [ ] The privacy policy (PT + EN) states the thank-you, its soft-opt-in basis, the opt-out and the hashed record kept after erasure; `data-protection.md` is updated in the same PR; `MARKETING_CONSENT_VERSION` is unchanged
- [ ] Unit tests cover the Lisbon lookback window, the status and no-show filter, the opt-out skip, the once-only rule, token sign/verify/forgery, the opt-out action (row + consent withdrawal + idempotence), both locales of the template, and the no-show actions' authorization; CI green

## Out of scope

- An on-site Google reviews widget (register open question); Instagram follow tracking; any
  SMS or WhatsApp.
- Re-sends, a second nudge, or deduplicating thank-yous for two bookings by one address.
- A team copy of the thank-you. Showing thank-yous or opt-outs on the Notifications page
  belongs to `lifecycle-messages/notifications-page-real`.
- What a no-show means for money, capacity, reports or refunds. The mark only suppresses the
  thank-you.
- A collection-time notice of the thank-you in the booking confirmation email or at
  checkout. The policy linked at checkout carries it. Whether counsel wants a line in the
  confirmation too is noted for data-protection open item 5, not built.
- Changing the confirmation, reminder or cancellation copy, or the dispatcher's schedule.
- An admin view of the opt-out list, or re-subscribing an address. An opt-out is permanent
  from this PR.

## Open questions

- none. Decided with the operator in Define on 2026-09-24:
  - the opt-out is an address-level list keyed by HMAC;
  - a no-show mark ships in this run;
  - the lookback is 2 days;
  - the opt-out UX is a confirm page plus the one-click header.

  D24 is honoured as written. `[LAWYER]` certainty on the soft-opt-in wording rides
  data-protection open item 5 and does not block the build.

Context budget: read `web/src/db/schema.ts` (enums, `message_log` indexes), `lib/message-log.ts`,
`lib/cron/*`, `content/privacy.ts` excerpts and the info PDF §2.6. That is past Define's usual
slice, and it was needed to settle the opt-out, catch-up and no-show questions.
