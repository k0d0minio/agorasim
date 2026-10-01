# Tasks: guest-calendar-polish

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] An unavailable day shows its number struck through, is not focusable as a choice and does
- [ ] At 1024 px wide and above the picker shows two consecutive months side by side; below
- [ ] In the checkout, after a day is picked its departures appear as chips; a departure the
- [ ] The summary line reads "Quarta, 14 de outubro · 10h00" (PT) / "Wednesday, 14 October ·
- [ ] With the browser clock set to 00:30 Lisbon time on day D and a payload built on day D−1,
- [ ] "None of these days work?" still swaps to the text box in the enquiry form and links to
- [ ] The picker offers exactly what the server accepts: every day/departure it lets the guest
- [ ] Every new or changed guest-facing string exists in PT and EN.

## Queue

- [ ] <task — small enough for one commit; name the file or area>
