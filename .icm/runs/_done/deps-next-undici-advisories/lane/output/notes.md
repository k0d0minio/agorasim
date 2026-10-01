# Chore: deps-next-undici-advisories

- invariant: behaviour unchanged; only dependency versions differ — `next`/`eslint-config-next` 16.3.4 → 16.3.8 (past the `next/og` RCE, patched >=16.3.6), undici behind `@vercel/blob` 6.28.0 → 6.29.0 and behind `shadcn` 7.29.0 → 7.30.0 (patched >=6.28.1 / >=7.29.1)
- change: web/package.json: `next` and `eslint-config-next` pinned 16.3.8; pnpm-lock.yaml regenerated with pnpm (`pnpm update -r --lockfile-only --depth Infinity undici`) — the parents' ranges (`^6.23.0`, `^7.29.0`) already admit the patched undici, so no `pnpm.overrides`; `pnpm audit --audit-level=high` in web/ now reports 0 high/critical (9 moderate remain, out of scope); lockfile also refreshed a few transitive deps (browserslist, caniuse-lite, baseline-browser-mapping…) that next 16.3.8 re-resolved
- rollback: revert the PR (restores the previous lockfile; no schema or data involved)
- learned: none
