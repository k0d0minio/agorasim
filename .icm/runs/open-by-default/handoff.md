# Handoff: open-by-default

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview: https://agorasim-git-claude-friendly-goodall-vk8b5z-kodominio.vercel.app
   — `/pt/reservar` (untouched days 2+ days out bookable; today/tomorrow and blocked days not;
   the enquiry form refuses the same days), `/admin/calendar` (untouched days green with a
   driver count, today/tomorrow included; "Nova reserva" on a blocked day), the Sales board's
   manual booking and the move picker (blocked and next-day departures offered).
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/168.
3. Then `/pipeline release open-by-default`. Release owes: the launch-runbook line (Diogo &
   Rita block their known days off on production before the promotion), and the
   `dependency-audit` finding from `security-check.sh --branch` (main's, not this run's —
   `notes.md` → Notes for Release).

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/168

## Do not

- Do not tick Ready to merge; never merge outside Release.
- Do not touch the admin Calendar's controls or the guest picker's look — `admin-block-days`
  and `guest-calendar-polish` own them.
- Do not park another dependency-advisory stub — two already exist in `intake/triage/`.
