# Data protection — what was built, and what still needs a human

**Status: engineering notes. Nothing here is legal advice.** This change built
the *mechanisms* for data-subject rights. It did not — and could not — decide
the *policy* questions those mechanisms serve. Everything under
"[Needs a decision](#needs-a-decision)" must be answered by a person, ideally one
with Portuguese/EU data-protection knowledge, before the privacy policy goes
live.

## What personal data the site holds

One table: `tour_requests`. Per row — name, email, phone, free-text message,
locale, party size, preferred date, and now the marketing-consent fields. The
people behind those rows are mostly EU residents, so the GDPR applies.

`admin_users` holds operator names and work addresses. Those are staff records,
not enquiry data, and are out of scope for the subject-access flow below.

`audit_log` deliberately holds **no** guest identifiers — see below. It does
record the operator's IP address as evidence, which is personal data of the
staff, and which expires on its own schedule (also below).

## What was built

| Right / obligation | Where |
|---|---|
| Notice at the point of collection (Art. 13) | `components/tour-request-form.tsx`, copy in `content/privacy.ts` |
| Minimisation of internal notes | `tour_requests.internal_notes` is cleared by the same retention pass as the rest of the row (`ANONYMISED` in `lib/retention.ts`) |
| Privacy policy | `/pt/privacidade`, `/en/privacy` — **draft**, see below |
| Consent for marketing (Art. 6(1)(a), 7) | Unticked checkbox on the form; `marketing_consent`, `marketing_consent_at`, `marketing_consent_version` on `tour_requests` |
| Right of access (Art. 15) | Owner-only export on `/admin/sales` → `lib/subject-data.ts` |
| Right to erasure (Art. 17) | Owner-only erase on a lead's page (`/admin/sales/<id>`) and bulk delete on `/admin/sales` |
| Storage limitation (Art. 5(1)(e)) | `lib/retention.ts` + `/api/cron/retention`, scheduled in `vercel.json` |
| Accountability (Art. 5(2)) | `audit_log`, written by `lib/audit.ts` from every mutating admin action |
| Cookies / ePrivacy | See `cookies-and-third-parties.md` |

Three implementation choices worth knowing about, because they look like bugs
otherwise:

**Erasure writes the audit entry first.** `deleteTourRequest` records the
erasure *before* deleting, using the throwing writer. If the trail cannot record
that a deletion happened, the deletion does not happen. An untraceable erasure
is a worse outcome than a failed request the operator can retry.

**The audit log cannot re-identify anyone.** Entries about guest records store a
`redactSubject()` fingerprint — email domain, address length, first initial —
and never the address. It is deliberately *not* a hash: a SHA-256 of an email is
still personal data, because anyone holding a list of candidate addresses can
confirm a match. An erasure record that quoted the address it erased would
defeat the erasure.

**Retention anonymises rather than deletes.** Expired rows keep their party
size, locale, status and dates, and lose everything identifying. What remains
cannot identify anyone, so it is no longer personal data — and "how many
enquiries did we get in August 2026?" still has an answer. Deleting outright
would satisfy the same rule and destroy the business's own history.

**Audit-log IP addresses expire on their own, much shorter clock.** An IP is
personal data, and `audit_log.ip_address` was the one column in the schema with
no expiry: enquiries were anonymised on a schedule while the addresses of the
people who touched them accumulated indefinitely. The same job now nulls that
column on entries older than `AUDIT_IP_RETENTION_DAYS` (90 by default — the
usual security-log window, and unlike the enquiry period this one is a
recommendation rather than a placeholder). The entries themselves are untouched:
the trail still records every action, its actor and its time, and only a field of
corroborating evidence expires. That is minimisation applied to a log, not an
edit to its history — which is why it does not contradict the append-only rule
in `db/schema.ts`.

## Needs a decision

Nothing below is blocking the code. All of it is blocking **publication of the
privacy policy**.

### 1. The retention period — a number, not a default

`ENQUIRY_RETENTION_DAYS` defaults to **730 days (24 months)** if unset. That
number is a *proposal*, not a finding: it is common practice for warm sales
leads in EU tourism, and it is long enough that someone who enquires one summer
and returns the next is still recognised. **Nobody at Agorasim has agreed to
it.** It is stated as a proposal in the draft policy and it must be either
confirmed or replaced before that policy is published.

Two related questions the same decision has to answer:

- **Booked enquiries are excluded from the job.** A booking that happened may
  carry record-keeping obligations of its own (tax, in particular), and quietly
  shredding it to satisfy a marketing-lead rule would trade one compliance
  problem for another. What *is* the right period for those, and who tracks it?
- **The clock runs from `updated_at`**, i.e. from the last time anyone touched
  the record, not from when it arrived. That is the "last contact" reading. If
  the intended reading is "from collection", the job needs to key on
  `created_at` instead — a one-line change, but a different promise.

### 2. Drafted legal text needing review

All of it is in `web/src/content/privacy.ts`, and it is all marked `DRAFT` in
the file and rendered with a visible draft banner on the page. The specific
`TODO(legal)` items:

- **Controller identity.** The policy currently names "Agorasim" and an email
  address. It needs the full registered name, the NIF/company number and the
  postal address of the legal entity.
- **Lawful basis for the enquiry itself.** Drafted as Art. 6(1)(b), steps taken
  at the data subject's request prior to a contract. Plausible, but it is a
  choice, and it is the sentence a regulator reads first.
- **Retention wording**, per the section above.
- **Processors and transfers.** Drafted as Vercel (hosting), Neon (database) and
  FareHarbor (booking). Confirm the list is complete, confirm the hosting
  regions, and confirm the safeguard relied on for any transfer outside the EEA.
  The `.env.example` Neon URL suggests `eu-central-1`, which is not the same as
  having checked.
- **Marketing consent text.** `MARKETING_CONSENT_VERSION` in `content/privacy.ts`
  stamps every stored consent with the wording that was shown. **Bump it whenever
  the checkbox text changes** — the version is only evidence if it moves when the
  words do.

### 3. Gaps this change did not close

Listed so they are decisions rather than oversights:

- **No unsubscribe mechanism.** Consent is captured and provable; withdrawing it
  currently means emailing and having an owner change the row by hand. That is
  workable while the list is small and email marketing has not shipped, and it
  must be a real link in the first campaign that goes out.
- **No "change your cookie choices" link.** See `cookies-and-third-parties.md`.
- **The public tour-request form is not currently mounted on the site.**
  `components/tour-request-form.tsx` — the component that carries the notice and
  the consent checkbox — is not rendered by any page; `/[locale]/reservar`
  currently shows the in-development booking-flow preview. The notice and the
  consent capture are correct and in place for when it is mounted, but no
  visitor sees them today.
- **Erasure is not propagated to processors.** Deleting a row here does not tell
  FareHarbor to delete anything it holds about the same person. If a booking was
  made through them, an erasure request has to be forwarded manually.
- **No DPA/records-of-processing document.** Art. 30 records and processor
  agreements with Vercel/Neon/FareHarbor are a paperwork exercise nobody has
  started.

## Runbook: answering a request

**"Send me my data" (Art. 15).** Sign in as an owner → Sales → *Export
someone's data* (below the list) → enter the address → a JSON file downloads.
Send it. The export is recorded in the audit log. The file includes the team's
own notes on that person: they are notes *about* an identified individual, so
they are part of the answer.

**"Delete my data" (Art. 17).** Sign in as an owner → Sales → open the lead →
*Erase* → type `DELETE`. The record is gone; the audit log keeps a
non-identifying note that an erasure happened. Several at once: tick them in the
list and use *Erase* in the toolbar. If the person also booked through
FareHarbor, forward the request to them separately.

**"Stop emailing me."** Until there is an unsubscribe link, an owner has to clear
`marketing_consent` on the row directly. Note this is not yet a self-service
path.

Response deadline is one month from receipt (Art. 12(3)).
