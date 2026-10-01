# Plan: guest-calendar-polish

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Client-safe business day** — a small pure helper (no `server-only` import) that gives
   today's `YYYY-MM-DD` in Europe/Lisbon and the first online-bookable day (today + 2), reusing
   the arithmetic of `lib/availability.ts` rather than re-deriving it; unit-tested across a
   midnight and a DST change — done when: the helper and `availability.ts` agree on the same
   instants in a test.
2. **Picker: crossed-out days + browser notice check** — `booking-date-picker.tsx`: a day is
   usable only if the payload offers it *and* it is on or after the browser's first bookable
   day; unusable days render struck through and disabled; a chosen day the check rules out is
   dropped (initial value and on mount) — done when: the stale-payload case in the spec's AC 5
   is covered by a component test.
3. **Picker: two months from `lg`** — render `months[i]` and, from `lg`, `months[i+1]` side by
   side under one pager; pager steps one month and clamps so the pair never runs past the last
   month; single month below `lg` — done when: both widths render the right months and the arrows
   disable at the ends.
4. **Summary line** — replace the "Escolhido" line with "Weekday, D month" (no year) plus the
   short time: clock time from the tour's departure label where it has one, "manhã/tarde" /
   "morning/afternoon" where `departureTimeFollowsByEmail`; day alone with no slot and in the
   enquiry form. New strings in `content/tour-request.ts` (and a short-time accessor in
   `content/logistics.ts`), PT + EN — done when: the four summary variants in AC 4 render in a
   test.
5. **Wire-up + parity** — `booking-checkout-form.tsx` passes the tour slug / short-time data the
   summary needs; `tour-request-form.tsx` unchanged except what the shared picker requires;
   existing picker/checkout tests updated — done when: CI green and the "offers exactly what the
   server accepts" criterion still holds (`departureUsable` untouched as the one rule).

## Risks

- Crossing out by the browser clock could disagree with the server near midnight in the other
  direction (browser clock wrong/ahead): the check only ever removes days, never adds them, so
  the worst case is a guest seeing one fewer day — never a refused checkout.
- The checkout form owns the chosen day (`departureUsable` is shared for that reason); the
  browser-notice drop must go through the same path or the grid and the form disagree.
- Two months side by side inside the checkout's `lg:grid-cols-[1fr_360px]` column may be
  cramped at exactly 1024 px — check the preview at 1024 and 1280.
