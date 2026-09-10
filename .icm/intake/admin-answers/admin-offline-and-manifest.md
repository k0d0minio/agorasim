# Stub: An offline read floor for the installed admin — and a Portuguese manifest

- feature-slug: admin-offline-and-manifest
- epic: admin-answers
- priority: P2
- size: M
- depends-on: admin-dashboard-what-needs-me
- sequence: 5 of 5
- blocked: scope — the service-worker half is a gift, not one of the six contracted
  features, and needs Jamie's call. The manifest half is a D4 correction and is not
  gated — see the note in this stub
- sources: admin audit §4.4, harvested 2026-08-31;
  `web/public/admin-manifest.webmanifest` (`"lang": "en"`, English `name`,
  `"orientation": "portrait"`); no service worker anywhere in the repo against every
  `/admin` route being `force-dynamic`; D4
- note: the manifest half (pt-PT `lang`, Portuguese name/short_name/description and
  shortcuts, `orientation` dropped) landed in PR `claude/admin-accounts-and-phones`
  (launch-cutover, 2026-09-10) — only the service-worker half remains here

## Problem

The admin is a real installed PWA — `web/public/admin-manifest.webmanifest`, maskable
icons, standalone display, shortcuts into the board and the catalogue. There is no
service worker anywhere in the repo, and every admin page is `force-dynamic` against
Neon, so a dead spot between Sintra and Ericeira gives Rita the browser's offline
page from an icon on her home screen. For a tool whose whole premise is *used in a
car between tours*, the read-only case (today's departures, today's leads and their
phone numbers) is the reason to install it at all.

Two smaller things in the same file: `"lang": "en"` and `"name": "Agorasim
Operations"` on a console that is being made Portuguese-only (D4), and
`"orientation": "portrait"` — a lock inherited from the days of horizontally-scrolled
tables, which the `xl:` card/table split has since removed.

## Proposed change

A minimal service worker: app shell precached, an offline fallback page, and a
stale-while-revalidate cache of the two GET routes worth reading cold (the board and
today's calendar), with anything stale visibly marked as such — a cached lead list
that doesn't say it is cached is worse than none. Nothing writes offline; a queued
mutation is a different, much larger ticket. Manifest fixed in the same pass:
Portuguese `name`/`short_name`/`description`, `"lang": "pt"`, and the orientation
lock dropped unless Jamie wants it kept.

Worth Jamie's call on scope first — the service worker is a gift, not one of the six
contracted features. **The manifest half is not gated**: an English `name` and
`"lang": "en"` on a Portuguese-only console is a D4 defect, and the `portrait` lock
is dead weight since the `xl:` card/table split. If the scope call goes against the
service worker, ship the manifest fix on its own and move this stub to `_done/` with
the service worker recorded as dropped.

## Prompt

In the agorasim repo (`web/`), give the admin PWA an offline floor per
`.icm/intake/admin-answers/admin-offline-and-manifest.md`: a service worker registered only
under `/admin` that precaches the shell and serves an offline fallback, plus a
stale-while-revalidate read cache for the Sales board and the calendar with a
visible "dados em cache" marker on stale content. No offline writes. In the same PR,
fix `web/public/admin-manifest.webmanifest`: Portuguese name/short_name/description,
`"lang": "pt"`, and drop `"orientation": "portrait"`. Portuguese strings — the admin
is PT (D4 in `.icm/project.md`). PR on a `claude/` branch; no local checks — CI is
the source of truth.
