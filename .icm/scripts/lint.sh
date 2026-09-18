#!/usr/bin/env bash
# lint.sh — lint the web/ files THIS BRANCH changed, and nothing else (PROJECT-OWNED).
#
# Changed-files-only FEEDBACK before a push, never the full sweep and never the verdict — CI's
# `Lint, typecheck, test, build` job is the verdict (estate decision D21; `.icm/_shared/ci.md`).
# Wired to this repo's own linter: ESLint 9 with the `eslint.config.mjs` in `web/`
# (`eslint-config-next`), run from inside `web/` exactly as `pnpm lint` runs it in
# `.github/workflows/ci.yml`, with no `--fix`. CI's `eslint` call fails on errors only, so a
# warning here is reported and passes — the same bar. Files outside `web/` are listed and skipped:
# nothing lints them, in CI or here.
#
# Usage: .icm/scripts/lint.sh [--base <ref>]     (default base: origin/main)
# Verdict (stdout, last line): RESULT: OK 0 · RESULT: SKIP 0 (no lintable change, or no
#   node_modules) · RESULT: PROBLEMS n exit 2 (n errors — fix them, or leave CI to say the same)
#   · RESULT: INVALID exit 2 (the linter itself failed)
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"
die() { echo "error: $*" >&2; exit 1; }
command -v jq >/dev/null || die "jq not found"

base="origin/main"
while [ $# -gt 0 ]; do
  case "$1" in
    --base) base="${2:-}"; [ -n "$base" ] || die "--base needs a ref"; shift 2 ;;
    *) die "unknown argument: $1 (usage: lint.sh [--base <ref>])" ;;
  esac
done

# shellcheck source=lib/changed-files.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/changed-files.sh"
fork="$(fork_point "$base")" || exit 1
mapfile -t files < <(changed_files "$fork" | filter_ext js jsx mjs cjs ts tsx)

if [ "${#files[@]}" -eq 0 ]; then
  echo "no changed .js/.jsx/.mjs/.cjs/.ts/.tsx files vs $base"
  echo "RESULT: OK"; exit 0
fi

# Only web/ has a lint config; everything else is listed so nobody expects it to have been checked.
web_files=(); skipped=()
for f in "${files[@]}"; do
  case "$f" in
    web/*) web_files+=("${f#web/}") ;;
    *) skipped+=("$f") ;;
  esac
done
if [ "${#skipped[@]}" -gt 0 ]; then
  echo "skipped (outside web/ — nothing lints these, in CI or here):"
  printf '  %s\n' "${skipped[@]}"
fi
if [ "${#web_files[@]}" -eq 0 ]; then
  echo "no changed files inside web/"
  echo "RESULT: OK"; exit 0
fi

linter="$repo_root/web/node_modules/.bin/eslint"
if [ ! -x "$linter" ]; then
  echo "web/node_modules/.bin/eslint not found — run 'pnpm install' first; CI will lint regardless"
  echo "RESULT: SKIP"; exit 0
fi

echo "linting ${#web_files[@]} changed file(s) in web/ vs $base"
errfile="$(mktemp)"; trap 'rm -f "$errfile"' EXIT
set +e
report="$(cd web && "$linter" --format json --no-warn-ignored "${web_files[@]}" 2>"$errfile")"
status=$?
set -e
if [ "$status" -ge 2 ] || ! printf '%s' "$report" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "the linter failed (exit $status)" >&2
  cat "$errfile" >&2
  echo "RESULT: INVALID"; exit 2
fi

errors="$(printf '%s' "$report" | jq '[.[].errorCount] | add // 0')"
warnings="$(printf '%s' "$report" | jq '[.[].warningCount] | add // 0')"
printf '%s' "$report" | jq -r --arg root "$repo_root/" '
  .[] | (.filePath | ltrimstr($root)) as $f | .messages[]
  | "  \($f):\(.line // 0):\(.column // 0)  \(if .severity == 2 then "error" else "warn " end)  \(.ruleId // "-")  \(.message)"'
echo "$errors error(s), $warnings warning(s) in ${#web_files[@]} changed file(s) — CI fails on errors only (ci.yml → pnpm lint)"

if [ "$errors" -gt 0 ]; then
  echo "RESULT: PROBLEMS $errors"; exit 2
fi
echo "RESULT: OK"; exit 0
