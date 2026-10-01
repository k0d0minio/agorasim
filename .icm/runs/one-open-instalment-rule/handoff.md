# Handoff: one-open-instalment-rule

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: decide the dependency audit — waive it for this run (main's Next/undici advisories, not this branch's) or merge the chore `triage/deps-next-undici-advisories.md` first.
2. Then `/pipeline release one-open-instalment-rule` resumes at step 4: re-read with `security-check.sh one-open-instalment-rule --branch --no-audit` (waiver) or `--branch --audit` (after the chore), then docs, record, close-out, merge.

Done so far in Release: gate ticked · CI GREEN on 0cadb9d · env.sh audit --changed OK · /code-review low: no findings · /security-review: no findings.

## Blockers

- blocked on operator: waive the dependency audit for this run, or merge the Next/undici dependency chore first

## Do not

- Do not merge around the BLOCKED; the waiver is the operator's, never the agent's.
- Do not park another dependency stub — it is already in triage.
