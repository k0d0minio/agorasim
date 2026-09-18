# Tweak: pt-greeting-gender-neutral

- change: web/src/content/emails.ts: the PT `lead` of the booking confirmation and of the
  enquiry acknowledgement — "Bem-vinda à região do campo onde crescemos. Será um prazer
  conhecê-la." → "Boas-vindas à região do campo onde crescemos. Será um prazer conhecermo-nos."
  Neutral in both halves — the noun form "Boas-vindas" carries no agreement, and the reciprocal
  "conhecermo-nos" drops the gendered clitic — and the §2.6 warmth is the same sentence. EN
  untouched; no gender logic added anywhere.
- changelog: announce: none (this repo keeps no changelog — `_shared/project-rules.md` → Announcing)
- note: the form is the client's voice. `.icm/project.md` already carries the open question
  ("Voice: how the PT welcome addresses a guest"); this ships the neutral default meanwhile and
  the question stays theirs to answer.
