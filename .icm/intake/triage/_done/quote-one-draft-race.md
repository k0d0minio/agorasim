# Stub: Two phones can each create a draft quote for the same lead at once

- lane: chore
- found-by: admin-quote-builder (Release code review) · 2026-09-23
- complexity: medium

## Problem

`createDraftForLead` and `startNewVersion` (`web/src/lib/quote-builder.ts`) check "no draft yet"
with a read, then insert; `quotes` has no constraint behind the rule, so two simultaneous
«Criar rascunho» / «Nova versão» taps both insert. The card then offers neither action and
shows two drafts.

## Proposed change

A partial unique index on `quotes (tour_request_id) where status = 'draft'` (new migration),
and map the unique violation in `createQuote` / `copyQuoteAsDraft` to the existing
`already-quoted` / `not-editable` outcomes.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/quote-one-draft-race.md`, add the index
through `pnpm db:generate` (database-migration skill), map the violation, add a test, and
`git mv` this stub to `_done/` in the PR.
