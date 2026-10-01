# Handoff: admin-block-days

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: smoke the preview https://agorasim-git-claude-cool-heisenberg-4ejx82-kodominio.vercel.app/admin/calendar
   on a phone (or 320px devtools): a week in three taps + confirm; a stretch across a month
   (tap, arrow, tap); "Só manhã" on a day whose only booking is at 14:00 (no warning) vs
   "Bloquear dia inteiro" (warning); "Ver dia" → "Mais opções" → Guardar on a blocked day stays
   blocked. Then tick criteria 1, 2 and 11 and **Ready to merge** on
   https://github.com/k0d0minio/agorasim/pull/173.
2. Then `release admin-block-days`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on PR #173.

## Do not

- Do not tick Ready to merge or any acceptance box on the operator's behalf.
- Do not touch the guest picker on `/reservar` — `guest-calendar-polish` owns it.
- Do not remove the `availability.cleared` audit label — historical log lines use it.
- After merge: `.icm/docs/admin-pt-inventory.md` needs the new verbs — a separate
  `knowledge edit`, not this PR.
