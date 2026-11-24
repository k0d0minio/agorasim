# Findings jam-294

## 1. The run folder of JAM-506 is on `main`

- Found: Define, 2026-11-24.
- Fact: `.icm/runs/jam-506/` is on `main` at `83518a8`, and `.icm/archive/jam-506/` does not
  exist. Pull request #277 is merged.
- Effect: `close-out.sh` did not move the folder. The record of the run is not in the archive.
- Draft act: a chore that moves the folder to `.icm/archive/jam-506/`.

## 2. The client did not answer question 6 of the epic `seats-and-holds`

- Found: Define, 2026-11-24.
- Fact: Jamie decided in chat on 2026-11-24. A paid tour quote without a car holds the whole
  departure, and Rita can pick the one car that the group uses (Q1, Q3 and Q6 of #282).
- Draft act: tell Diogo and Rita the decision at the UAT hand-over. The operator sends the
  message. This run does not contact the client.
