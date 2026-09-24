# Tweak: optional-marking-aria

- change: `quote-request-form.tsx` — every optional field (date, venue, hours, car, message) now
  carries the same `{label} (optional)` marking phone and party size already used; `name`/`email`
  gained `aria-invalid` + `aria-describedby` pointing at their error paragraph's new `id`.
  `booking-checkout-form.tsx` — `phone`/`message` moved off wording baked into
  `content/booking.ts` onto the same `{label} (optional)` span (a new `bookingContent.labels.optional`
  string), so both forms mark optional fields the same way; `name`/`email` gained the same
  aria-invalid/aria-describedby wiring as the quote form.
- changelog: announce: none (this repo keeps no changelog page)
- learned: none
