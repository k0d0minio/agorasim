# Stub: No way to find a named lead — the Sales board has nothing to search with

- lane: tweak
- found-by: admin-audit harvest (PR #6 `docs/admin-audit-2026-07.md` §3.3) · 2026-08-31
- priority: P2
- size: S

## Problem

The Sales board is the only lead surface — Submissions, CRM and Bookings were folded
into it (#12). Its columns *are* the status filter, and each column loads its newest
`SALES_STAGE_LIMIT = 50` records while the chip shows the true total
(`web/src/lib/sales.ts:174`, `:213`). So the 51st `booked` lead is visible only as a
number: no search box, no lookup by name, e-mail or phone, no date range, no "load
more" on a stage. "Find the Carter enquiry" (audit §3.3) is answerable only in the
database. Feature requests got pagination (`web/src/lib/admin-pagination.ts`); leads
never did.

## Proposed change

One search field above the board: a `q` search param, matched server-side against
name, e-mail and phone (`tour_requests` already indexes `email`), rendering matches
as the same cards across all stages with the count. That is the whole fix — a
per-stage "load more" is the alternative, and it answers the everyday question
("where is that couple's enquiry?") much less well. Portuguese strings (D4).

## Prompt

In the agorasim repo (`web/`), add lead search to the Sales board per
`.icm/intake/triage/sales-board-search.md`: a `q` search param on
`web/src/app/admin/sales/page.tsx`, matched in `listSalesBoard`
(`web/src/lib/sales.ts`) against name, e-mail and phone, with the board rendering
the matches and a result count, and an empty-result state. Keep the stage-capped
board as the no-query default. Portuguese strings — the admin is PT (D4 in
`.icm/project.md`). PR on a `claude/` branch; no local checks — CI is the source of
truth.
