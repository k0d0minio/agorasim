# Handoff: quote-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview: https://agorasim-git-claude-trusting-bardeen-xda9m9-kodominio.vercel.app — open a sent quote's link (`/pt/orcamento/<token>`, `/en/…`), tap pay, check the form mounts in the page (no stripe.com navigation), "back", pay again (same session), test card 4242…, lands back on the quote page paid; 375px; devtools-block `js.stripe.com` for the failure block.
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/195, then `release quote-embedded-checkout`.
3. Release merges main in (step 7): after #196 merges, that brings the webhook test fix and the advisory goes green.

## Blockers

- none for Release's gate. The advisory red is main's (#196).

## Do not

- Do not port #196's test change into this PR — it is that lane's diff.
- Do not tick Ready to merge — the operator's.
