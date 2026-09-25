# Handoff: fix-uat-migration-ordering

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. PR open — smoke, then squash-merge from GitHub (https://github.com/k0d0minio/agorasim/pull/154). The merge redeploys UAT, whose build applies 0032_add_booking_move_seq and passes `pnpm db:verify`.

## Blockers

- none
- blocked on operator: the squash-merge of #154

## Do not

- renumber or restamp 0031_quote_one_draft_per_lead again — UAT has it applied at that stamp
- merge the PR or re-invoke the lane
