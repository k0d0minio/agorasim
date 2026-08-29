# Stub: The auto-poster — scheduled publishing via the Meta Graph API

- feature-slug: meta-autoposter
- epic: social-engine
- priority: P2
- size: L
- depends-on: social-generator-path
- sequence: 2 of 2
- blocked: client — IG/FB admin access + Business-account link not granted (open-questions pack item 4); Meta app review takes weeks after that
- sources: proposal feature ④ ("scheduled automatically"); D12; purged AGORA-017 ("start Meta app review immediately"); the §3 answers gave only the handle (agorasim.pt) — no access

## Problem

The sold promise is scheduled, automatic posting. It needs: the client's Facebook
Page + linked Instagram Business account with admin access granted to a Meta app,
that app through Meta's review (weeks), tokens stored safely, and a scheduler.

## Proposed change

When access lands: Meta app with `instagram_content_publish` / pages permissions,
token storage in env/Neon (never in git), a "scheduled" state + time on
`social_post_drafts`, publishing job on the daily dispatcher (or a finer schedule if
the plan allows), per-post result + error surfaced in the Social studio, and a kill
switch. Approving a post for scheduling stays a human act in the studio — automation
is the *posting*, not the deciding.

## Acceptance criteria (rough)

- [ ] A scheduled draft posts to IG + FB at its time, result recorded
- [ ] Tokens never in git; failure states visible in the studio; kill switch works
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), build the Meta auto-poster per
`.icm/intake/social-engine/meta-autoposter.md` — but first verify the blocker has
lifted: the icm-board deal folder (`workspaces/deals/diogo-rita/`) must record that
IG/FB admin access was granted and the Meta app review passed. If not, stop; this
stub stays blocked. When unblocked: Graph API publishing for the linked
Page/Business account, scheduling fields on `social_post_drafts`, a dispatcher job
(see `.icm/intake/lifecycle-messages/daily-dispatcher.md` registry), studio
scheduling UI + result states, env-only tokens. PR on a `claude/` branch; no local
checks — CI is the source of truth.
