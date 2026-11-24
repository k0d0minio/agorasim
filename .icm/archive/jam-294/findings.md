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

## 3. The agent `review-shots` made no picture for #282

- Found: Build, 2026-11-24.
- Fact: the preview shows the Vercel login page before the admin sign-in. The contract of the
  agent permits only production as "before" (`https://prod.agorasim.pt`), and production has
  no deployment: `404 DEPLOYMENT_NOT_FOUND`. The pack has 0 pictures.
- Fact: step 6 of the contract says to remove the files. A hook blocked the `rm`, so 8 files
  are still in `~/baxter_live/workspace/scratch/shots/`. They show the Vercel login page and
  the 404 page only.
- Draft act: tell the owner of the blueprint. For a repo with UAT, "before" is the UAT
  address. An admin page needs a sign-in that the agent does not have.
