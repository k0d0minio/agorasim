# Chore: braces-advisory-eslint-chain

- invariant: no runtime or build behaviour changes — no dependency, version or lockfile moves;
  only the security gate's audit verdict differs: it no longer blocks on GHSA-vfj7-8cjw-p6xm
  (`braces` <=3.0.3), and still blocks on every other high/critical advisory.
- change: `package.json` (root): `pnpm.auditConfig.ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm"]` — the
  recorded waiver, Jamie's call (2026-10-05). `braces` 3.0.3 is its latest release and the
  advisory lists no patched version; every path is dev tooling (`eslint-config-next` →
  `@next/eslint-plugin-next` → `fast-glob@3.3.1`, and `shadcn`, `ts-morph` → `fast-glob@3.3.3`,
  all → `micromatch@4.0.8` → `braces`), and the latest `@next/eslint-plugin-next` (16.3.8) still
  pins `fast-glob@3.3.1`, so no bump removes it.
- change: `.icm/project.json` → `security.audit_command: "pnpm audit --audit-level=high"`. Without
  it, `security-check.sh` reads pnpm's `--json` `metadata.vulnerabilities.high`, which still
  counts an ignored advisory (measured: `high: 1` with the ignore in place, while pnpm itself
  prints "1 high (1 ignored)" and exits 0). With it, the gate judges the exit code: 0 with the
  ignore, 1 without (both measured on this tree). `security-check.sh` is template-owned, so the
  project-owned override is the lever, not an edit.
- change: `.icm/_shared/project-rules.md` → The factory: the gate line says what the override
  does, whose the list is, and when to drop the entry.
- rollback: revert the PR — the gate returns to the `metadata` count and blocks on `braces` again.
- learned: none
