# Chore: next-rce-advisories

- invariant: no user-facing behaviour changed; only dependency versions differ (Next.js
  patched off the unauthenticated-RCE advisories, and the rest of the audit cleared with it).
- change:
  - `web/package.json`: `next` and `eslint-config-next` `16.2.12` → `16.3.4` (not the literal
    first `16.3.x` ≥ `16.3.3` — `16.3.3` still pinned `sharp@0.35.3`, unpatched; `16.3.4` is
    the first patch whose `optionalDependencies.sharp` actually moved to `^0.35.4`, so the
    stub's own "sharp should follow next" holds).
  - `package.json` (root `pnpm.overrides`): `sharp` floor `>=0.35.0` → `>=0.35.4` — the stale
    override was itself the reason `sharp` hadn't already followed `next`'s bump; raising it
    is the one override change this run needed.
  - `web/package.json` devDependencies: ran `pnpm update eslint @tailwindcss/postcss shadcn`
    (in-range, no majors — the stub's second step): `eslint` `9.39.4` → `9.39.5`,
    `shadcn` `4.16.1` → `4.21.0`, `@tailwindcss/postcss` unchanged (nothing newer in `^4.3.3`).
  - `pnpm-lock.yaml` regenerated throughout.
- resolved without an override: `brace-expansion`, `js-yaml`, `nanoid`, `browserslist` and
  `fast-uri` all showed high-severity findings after the updates above, but every one of them
  already had a patched version inside its consumer's existing semver range
  (`eslint`'s own `minimatch`/`@eslint/eslintrc`, `shadcn`'s `cosmiconfig`/`ajv`/`@babel/*`,
  `postcss` pulling `nanoid`) — pnpm's incremental resolver just hadn't picked them up because
  the earlier lockfile entries still satisfied their ranges. Touching the `pnpm.overrides`
  block momentarily (added, then reverted once confirmed unnecessary) forced a full
  re-resolution and every one of them settled on a patched version on its own:
  `brace-expansion@1.1.21`/`5.0.12`, `js-yaml@4.3.2`, `nanoid@3.3.19`, `browserslist@4.29.0`,
  `fast-uri@3.1.8`. **Deliberately not forced via `pnpm.overrides`**: a first attempt did
  override `brace-expansion` unscoped and it collapsed every resolution onto the 5.x line,
  including the one `minimatch@3.1.5` (an `eslint` transitive) still expects — `require()`d
  directly as a callable, which 5.x no longer is (it now exports `{ expand }`, not a bare
  function). Verified with a direct `require()` smoke before deciding against it; reverted, and
  the plain re-resolution above reached the same 0-high result without that risk.
- audit before: `pnpm audit --audit-level=high` — 17 high/critical (2 critical: Next.js
  unauthenticated RCE ×2; 15 high: `sharp`, `brace-expansion`, `js-yaml`, `browserslist`,
  `nanoid`, `fast-uri`).
- audit after: 0 critical, 0 high, 9 moderate (unchanged — below this gate's threshold).
  `security-check.sh <slug> --branch` audits at the same `--audit-level=high`, so it answers
  `RESULT: OK` on this branch.
- rollback: `git revert` the commit — no schema, no runtime code touched.
- learned: none (nothing that reads as a repo constraint rather than this run's own
  troubleshooting).
