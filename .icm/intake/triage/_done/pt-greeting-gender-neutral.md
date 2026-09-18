# Stub: Every Portuguese guest is greeted in the feminine

- lane: tweak
- found-by: copy lens (/project) · 2026-09-18
- priority: P1

## Problem

"Olá João, Bem-vinda… Será um prazer conhecê-la." — the confirmation and the enquiry
acknowledgement (`web/src/content/emails.ts:48` and `:374`) render the feminine for every
guest; the client's own §2.6 line is English and ungendered ("Olá, welcome to the countryside
area where we grow up"). No gender logic exists in `lib/booking-emails.ts`.

## Proposed change

A neutral PT rendering (e.g. plural "Sejam bem-vindos…" or a rephrase) in both emails; the
form is the client's voice — a register open question asks how they would say it; ship the
neutral default meanwhile.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/pt-greeting-gender-neutral.md` and
make the PT greeting in `src/content/emails.ts` gender-neutral in the confirmation and the
enquiry acknowledgement, keeping the client's §2.6 warmth. `git mv` the stub to `_done/` in
the PR, on a `claude/` branch; CI is the source of truth.
