# Tasks: balance-scheduler

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] On the morning the event is 14 days away, a `deposit_paid` quote with an unpaid balance gets exactly one `balance-request` email in the quote's language. Its button opens the quote page, which offers "Pagar saldo". A second dispatcher run that morning, or on any later morning, sends nothing and does not change the quote's link
- [ ] A quote whose deposit is paid (by Stripe, or by transfer and written off) when the event is already fewer than 14 days away gets its request on the next morning's run. A quote 15 or more days out, a `sent` or `cancelled` quote, and a quote whose balance is paid or written off get nothing
- [ ] A quote whose balance is still unpaid when the event is 7 days or fewer away gets exactly one `balance-reminder` email, but only if its request was sent at least 3 days earlier. A balance paid before then gets no reminder, and a rerun sends none
- [ ] Each balance email's link works, and the links in that quote's earlier emails show the "no longer valid" page. Two runs racing on one quote send one email, and the link in that email is the one stored. A quote with no lead, no email address, an anonymised lead, or email unconfigured is skipped without a claim and without a link rotation
- [ ] From 3 days before the event, while the balance is unpaid and not written off, the Sales board shows the quote in a "Saldo por pagar" panel with its ref, couple, event date, venue, balance amount and request/reminder state, linking to the lead. The lead's quote card shows a matching badge. Paying the balance or writing it off removes both. The panel is absent when nothing is due
- [ ] Nothing is released, cancelled or re-stated automatically on or after the event date for an unpaid balance
- [ ] Unit tests cover the three windows and their edges (T−15, T−14, a late deposit, T−7 with and without the 3-day gap, T−3, a past event), the once-only rule across reruns, the compare-and-swap loser, the skip cases, and the email content in PT and EN. CI is green

## Queue

- [ ] <task — small enough for one commit; name the file or area>
