# Client status — checkpoints and a film for Diogo and Rita

> Spike JAM-474, 2026-11-23, time box 0.5 day. Source: process guide §9 ("a simple running
> status": which feature is in build, which waits on your review, which is signed off).
> The merge of this page's pull request records Jamie's decision.

## The question

What is the cheapest way to show the client what is in build, what is on UAT to test, and
what waits on them?

## The decision

Jamie said on 2026-11-23: "we don't need to give them read only view over linear with a
built in module that is crazy. Let's just set checkpoints where we checktest then create a
film for them to review."

Thus the status is **a checkpoint film**. At each checkpoint, Jamie does a checktest of UAT
and records it as a short film. The client watches the film, tests on UAT, and answers in
one batch. Nothing is built. No Linear setting changes.

## What is true today (2026-11-23)

- A merge to `main` deploys `https://uat.agorasim.pt`, and the ticket goes to **To test**
  in Linear. The client tests only on UAT (`.icm/_system/features/uat.md`).
- The release pull request (#214, v1.1.0) holds the batch: the work on UAT that is not in
  production.
- The client cannot open Linear or GitHub. They use the site and the admin console on the
  phone.
- The open client questions of seats-and-holds are in
  `.icm/intake/seats-and-holds/breakdown.md`.
- The repo has no film tool. The agent `review-shots` makes still pictures of a preview, and
  it never signs in. A film of the admin console needs a signed-in person.

## The options

| Option | Cost | Verdict |
|---|---|---|
| A. Shared Linear view (guest seat) | A Linear plan change. It shows other clients' work, in English | Rejected |
| B. "Progresso" page in the admin console, read from Linear | About 1.5 days of build, a Linear API key, a new field on each ticket | Rejected by Jamie, 2026-11-23 |
| C. Weekly email from BAXTER | About 1 day of build, and an approval for each send | Rejected |
| D. Page fed from the release pull request | About 1 day. Commit titles in English | Rejected |
| **E. Checkpoint film** | About 1 hour of Jamie's time for each checkpoint. No build | **Chosen** |

## The checkpoint

A checkpoint is one batch on UAT that the client must test. The gap between two
checkpoints is one week or less. A week with no new batch still has a short film: what is
in build and what waits on the client.

1. **Batch.** `promote.sh status` lists the batch on UAT. The tickets in To test are the
   same work.
2. **Checktest.** Jamie tests each change of the batch on UAT, on a phone, in PT and in EN.
   A fault is a bug ticket. It is fixed before the film, or the film says it is known.
3. **Film.** Jamie records the screen of the same run on the phone, with voice. Length:
   5 minutes or less. The film follows the outline below.
4. **Send.** Jamie sends the film, the UAT link and the list "what waits on you" in one
   message.
5. **Review.** The client watches, tests the same steps on UAT, and answers in one batch
   (process guide §7). A yes is the sign-off of the batch (`promote.sh approve`).

## The film outline (the mock-up)

| Part | Time | Shows |
|---|---|---|
| 1. The six features | 20 s | One line for each feature: signed off, on UAT to test, in build, or next |
| 2. New on UAT | 2 to 3 min | Each change of the batch, on the phone, as the client will test it |
| 3. What waits on you | 1 min | The tests of this batch, the open questions, the missing content |
| 4. The next date | 20 s | The next checkpoint, and what it will hold |

An example with the facts of 2026-11-23:

```
1  Site + GEO          on UAT, to test
   Booking             in build: only a paid booking takes a seat (JAM-291)
   Payment links       on UAT, to test
   Email and SMS       email on UAT, SMS next
   Blog                next
   Social              next
2  The calendar shows the seats left (JAM-293)
   The quote form keeps what the guest typed (JAM-487)
   The Sales board shows the event date in words (JAM-486)
3  Test the three changes above on uat.agorasim.pt
   Answer the seats-and-holds questions (breakdown questions 1 to 4 and 6)
   Send the drawing of each car (JAM-485)
4  Next checkpoint: seats-and-holds on UAT, 2026-12-04 if the answers come this week
```

## Follow-up

| Ticket | Scope | Size |
|---|---|---|
| JAM-543 | Checkpoint 1: the checktest of the v1.1.0 batch on UAT, and its film for Diogo and Rita | 1 |

JAM-534, JAM-535 and JAM-536 (the Progresso page and its inputs) are canceled.

## Questions for Jamie

1. Which language for the film? Default: the language that Jamie and the client use today.
   The site's own text is in PT on the film.
2. Where does the film go? Default: the channel that the client uses today, for example
   WhatsApp. A file larger than that channel permits goes as a link.
3. A fixed day for each checkpoint? Default: Friday.

## Still unknown at the end of the time box

- If the client wants a film for each feature (process guide §4) or one film for each
  batch. This page says one for each batch, because the batch is what UAT holds.
- If a recording of the admin console can show the personal data of a guest. The checktest
  uses test bookings only.
