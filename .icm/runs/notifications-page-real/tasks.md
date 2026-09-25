# Tasks: notifications-page-real

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] The page lists real `message_log` rows of the last 30 days, newest first, grouped by Lisbon day — every kind that is logged, including cancellations, date moves and the quote messages; nothing from `admin-preview.ts` renders
- [ ] Each row shows the kind's label, the recipient (guest name from the pedido, or "Equipa"), the reference (`BK-…` for booking rows, else `EN-…`) linked to the pedido in Vendas, the status badge and the time; no provider id
- [ ] "Precisa de atenção" lists failed sends and sends `sending` for more than 1 hour, and is absent when there are none
- [ ] One card per kind with a sender on `main` (ten, not the two balance kinds) gives when it goes out, to whom, and its sent count for the last 30 days, 0 included
- [ ] No switch, toggle or on/off control of any kind; the word SMS appears nowhere on the page
- [ ] Every rendered string is Portuguese in the `.icm/docs/admin-pt-inventory.md` vocabulary and register (singular *você* implicit, sentence case, no exclamation marks); no English remains on the page
- [ ] `AdminInDevBanner` is gone from the page, `dev` is `false` on the `/admin/notifications` nav entry, and the Início card no longer carries the "em construção" marker
- [ ] The notifications fixtures and their type are deleted from `web/src/lib/admin-preview.ts`; nothing imports them
- [ ] Tap targets on the page are ≥44px and no text is below 12px, at phone width
- [ ] Unit tests cover the Lisbon-day grouping (a send at 23:30 UTC in summer lands on the next Lisbon day), the status→badge mapping including the 1-hour stuck threshold, the per-kind counts, and that every `MessageKind` has a label
- [ ] CI green

## Queue

- [ ] <task — small enough for one commit; name the file or area>
