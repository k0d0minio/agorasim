# Tweak: quote-card-action-feedback

- change: web/src/components/admin/lead-quote-card.tsx: a quote action's success message lived in `ConfirmedQuoteAction`, whose button unmounts on the post-action refresh → now lifted to `LeadQuoteCard` and shown as one status line (quote ref · message) at the top of the card
- changelog: not warranted
- learned: none
