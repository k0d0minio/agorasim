# Stub: A deposit-paid event takes its drivers and cars out of the pool

- feature-slug: event-holds-capacity
- scope: quote-flow
- personas: team, guest
- initiative: contracted feature ⑥ complete after launch / objective: "the deposit holds the date" is true on the Calendar and the public availability
- priority: P1
- size: M
- depends-on: quote-page-and-deposit-link
- sequence: 5 of 6
- blocked: client — what a deposit-paid wedding or event takes out of the pool (the whole day, one departure, N specific cars) is unanswered (register open question)
- sources: data lens 2026-09-18 — `countSlotOccupancy` reads only `bookings` (`web/src/lib/bookings.ts:130-143`); `quotes` carries `event_date` and `venue` but no slot, vehicle class or driver count (`schema.ts:1249-1252`); product lens — the Calendar and public availability read `bookingsBetween` only (`web/src/app/admin/calendar/page.tsx:81`), `preferredCar` lives on `tour_requests` not on the quote; the register: "capacity is drivers and cars, not seats — 2 drivers across 4 cars"

## Problem

A Saturday wedding with Diogo in the 4L still sells both tour departures that day. The
deposit "holds the date" only in the terms; nothing in the pool knows about the event.

## Proposed change

Shape follows the client's answer. Whole day: on deposit paid, an audited close of that
date's availability rows with the quote as the reason, reopened on refund or cancellation.
One departure and a car: columns on the quote for slot(s), vehicle class and driver count,
and a union of paid quotes into the occupancy query the calendar and the checkout share.
Either way the Calendar's day sheet shows the event with its venue and hours, and the
public availability stops offering what the event takes.

## Acceptance criteria (rough)

- [ ] After a deposit is paid, the Calendar shows the event on its date and the public availability no longer offers the capacity it takes (per the client's rule); a refund or cancellation releases it
- [ ] The occupancy rule is tested in both the calendar and the checkout path; CI green

## Out of scope (this feature)

- Multi-day events; events without a paid deposit (a sent quote holds nothing).

## Notes for Define

- Blocked on the client's answer; Define does not guess the rule. If the answer arrives as
  "whole day", the cheap close-the-date shape is preferred.
- Open for Define: whether `preferredCar` on the enquiry becomes the quote's vehicle.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/event-holds-capacity.md` and the
breakdown. First confirm with Jamie that the client has answered the capacity question
(the stub's `blocked:` line is gone or the register says so). Then implement the chosen
shape in `src/lib/{bookings,availability}.ts`, the calendar day sheet and the checkout's
occupancy check, with tests for hold and release. PR on a `claude/` branch; no local
checks — CI is the source of truth.
