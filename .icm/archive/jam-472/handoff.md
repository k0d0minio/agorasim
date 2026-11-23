# Handoff jam-472

## Next action

The operator reads `.icm/docs/stripe-connect-proof.md` and ticks Ready to merge on PR #267.
The follow-ups are filed: JAM-499 (D1), JAM-501 (D2), JAM-503 (D3).

## How to test

Open the page `.icm/docs/stripe-connect-proof.md` in the pull request. Check that the
expected fees are €10, €18.80, €50, €14.40 plus €33.60, and €18.80 back on the refund.

## Page and change

- `add` `.icm/docs/stripe-connect-proof.md`: the code verdict, the answers to the
  ticket's known unknowns, the expected fees, what is not proven, and the steps for Diogo.

## Blockers

- The test-mode run is not done. It needs a test connected account (JAM-499).

## Do not touch

- none
