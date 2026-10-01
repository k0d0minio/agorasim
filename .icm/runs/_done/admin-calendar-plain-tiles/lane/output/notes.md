# Tweak: admin-calendar-plain-tiles

- change: web/src/components/admin/availability-calendar.tsx: day tile with two 10h/14h state chips and a driver count → plain tile (number only when free), gray when every upcoming departure is blocked, a small corner slash when one is, a dot per live booking (max 4, then "+n") and a dark square for an event; legend footnote rewritten. Settled with Jamie in session: partial = open tile + mark; full and event days get no state of their own (dots only); driver counts leave the tile.
- changelog: announce: none (UAT repo — the promotion announces the batch)
- learned: none
