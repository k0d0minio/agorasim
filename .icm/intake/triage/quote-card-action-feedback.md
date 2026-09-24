# Stub: The quote card's success messages vanish — the button that shows them unmounts on refresh

- lane: tweak
- found-by: admin-quote-builder (Release code review) · 2026-09-23

## Problem

`ConfirmedQuoteAction` (`web/src/components/admin/lead-quote-card.tsx`) holds the action's
result, but its own success refreshes the page, the quote changes state, and the block holding
the button unmounts — so «Orçamento enviado…», «…a versão anterior deixou de ser válida» and
the email-failed sentence are never seen. The card's state (badge, "O email não foi enviado",
Substituído) still tells the truth.

## Proposed change

Lift the last result to the card (one status line under the header, keyed by quote ref), or
show a toast that survives the refresh.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/quote-card-action-feedback.md`, keep the
last quote action's message visible after the refresh, and `git mv` this stub to `_done/` in the
PR.
