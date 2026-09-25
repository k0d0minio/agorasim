# Bug: fix-uat-migration-ordering

- observed: the UAT deploy fails `pnpm db:verify` — `0031_add_booking_move_seq` (when 1790289025381) is not applied to the UAT database · expected: every journal entry applied, the UAT build green
- cause: #148 merged `0031_quote_one_draft_per_lead` (when 1790324401235) and the UAT build applied it; #150 then slotted its own older-stamped migration in front of it as 0031 and renumbered #148's to 0032. The journal stayed monotonic, so `migrations-journal.test.ts` passed, but the migrator only applies entries stamped after the newest applied row — on UAT, 1790324401235 — so `add_booking_move_seq` was skipped for good
- fix: web/drizzle: `quote_one_draft_per_lead` back at 0031 with its original stamp and #148's own snapshot; `add_booking_move_seq` moved to 0032 with `when` 1790338972837 (after every entry UAT has applied) and its snapshot re-chained onto the new 0031. SQL bytes untouched, so the hash UAT recorded for the quote migration still matches; the next UAT build applies only 0032. Production (last Release 87aab3e) has neither migration, so the promotion applies both in the new order
- changelog: not user-visible
- learned: see retrospective
