# Handoff: guest-calendar-polish

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: smoke the preview — https://agorasim-git-claude-bold-pasteur-qq33nf-kodominio.vercel.app/pt/reservar
   (and /en/reservar): crossed-out days, two months at 1024 px and up / one on a phone, the
   summary line for Rural Saloia and Óbidos, the enquiry form's calendar and its way out.
2. Operator: tick **Ready to merge** in the body of https://github.com/k0d0minio/agorasim/pull/172.
3. Then `release guest-calendar-polish`. Read `03_build/output/notes.md` → Notes for Release first.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/172

## Do not

- Do not tick Ready to merge; never merge before it is ticked.
- Do not touch the admin calendar (`web/src/components/admin/availability-calendar.tsx`) —
  that is `admin-block-days`.
- Do not change `departureUsable`'s rule or the server's availability checks.
