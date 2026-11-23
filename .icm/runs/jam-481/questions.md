### Q1. Which colour is the page background?
- type: single
- options: Off-white #F3E9D5 | Paper #FAF6EE
- default: Off-white #F3E9D5, with Paper for the cards
- answer: Off-white #F3E9D5, with Paper for the cards
- note: the default, not chosen. The token map of `.icm/docs/brand.md` (merged in #266) has this value. Jamie said "Start the next set of parallel tickets please" in chat on 2026-11-23: the run starts on the defaults. Jamie can change it at the Spec approved gate.

### Q2. Does the admin console take the new colours?
- type: single
- options: yes, same tokens | no, it keeps the green
- default: yes, same tokens
- answer: yes, same tokens
- note: the default, not chosen. `.icm/docs/brand.md` says that the admin console shares `globals.css` and takes the same colours. Jamie can change it at the Spec approved gate.

### Q3. Are teal, sand and terracotta the three main colours (the green marks on the designer's card)?
- type: single
- options: yes | no
- default: yes
- answer: yes
- note: the default, not chosen. `.icm/docs/brand.md` records this as decided on 2026-11-23 (Q2 of pull request #266). Diogo has not confirmed it. Jamie can change it at the Spec approved gate.

### Q4. Red text on a red notice measures 4.16:1 on Off-white with the red of today. Does the red get darker?
- type: single
- options: yes, darken the red to oklch(0.49 0.19 27) | no, keep the red and make the notice fill lighter
- default: yes, darken the red to oklch(0.49 0.19 27)
- answer: yes, darken the red to oklch(0.49 0.19 27)
- note: the default, not chosen. `.icm/docs/brand.md` says "no change" for `--destructive`, with the condition of 4.5:1. The condition fails on Off-white (4.16:1). The darker red measures 4.86:1 on Off-white and 5.40:1 on Paper. Jamie can change it at the Spec approved gate.
