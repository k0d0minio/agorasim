# Findings jam-294

## 1. Rita cannot free a car on a departure that a tour quote holds

- Found: Define, 2026-11-24.
- Fact: the default of question 6 of `.icm/intake/seats-and-holds/breakdown.md` says "Rita
  frees a car by hand when the group is small". The admin has no tool for this.
- Effect: with the default of Q1, a paid tour quote closes its departure until the quote is
  cancelled. A small private group then closes the departure to the open group of the VW T3.
- Draft ticket: "agorasim · Rita gives a car back to a departure that a tour quote holds".
  It depends on JAM-294 and on the client's answer to question 6.

## 2. The run folder of JAM-506 is on `main`

- Found: Define, 2026-11-24.
- Fact: `.icm/runs/jam-506/` is on `main` at `83518a8`, and `.icm/archive/jam-506/` does not
  exist. Pull request #277 is merged.
- Effect: `close-out.sh` did not move the folder. The record of the run is not in the archive.
- Draft act: a chore that moves the folder to `.icm/archive/jam-506/`.
