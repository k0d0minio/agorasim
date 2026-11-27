#!/usr/bin/env bash
# code.sh — the code checks of the job code in the workflow ci. Only CI runs it.
#
# In order, each only when package.json names the script:
#   1. install the dependencies from the lockfile
#   2. check:migrations --base origin/<base>, on a pull request
#   3. with DATABASE_URL (a new, empty Postgres of the job): db:migrate and db:verify.
#      Each migration applies from zero, and the tests then read that database
#   4. lint, typecheck, test
#   5. build (rc35), by CODE_BUILD, the copier answer code_build of ci.yml (rc40):
#      all (or empty): the script build. none: no build. Else a list of packages: only
#      those, each with the packages that it needs (turbo.json: turbo run build --filter)
#   6. with db.sh and db:migrate, in each mode: a package.json names vercel-build, and each
#      vercel-build runs db.sh build (Postgres rc35, MongoDB rc37)
# A repo with no package.json has nothing to check: exit 0.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. .icm/_system/scripts/lib/node.sh
[ -f package.json ] || { echo "code.sh: no package.json: nothing to check"; exit 0; }
node_install
[ -z "${BASE_REF:-}" ] || ! node_has check:migrations || node_run check:migrations --base "origin/$BASE_REF"
if [ -n "${DATABASE_URL:-}" ] && node_has db:migrate; then
  echo "code.sh: the migrations from zero, on the database of the job"
  node_run db:migrate
  node_run db:verify
fi
for s in lint typecheck test; do node_run "$s"; done
# build_some <package>...: the build of the named packages only (rc40).
build_some() {
  local pm f args=(); pm="$(node_pm)"
  for f in "$@"; do args+=("--filter=$f"); done
  if [ -f turbo.json ]; then
    case "$pm" in pnpm) pnpm exec turbo run build "${args[@]}" ;;
      yarn) yarn run turbo run build "${args[@]}" ;; *) npx --no-install turbo run build "${args[@]}" ;; esac
  elif [ "$pm" = pnpm ]; then
    args=(); for f in "$@"; do args+=("--filter=$f..."); done; pnpm "${args[@]}" run build
  else
    for f in "$@"; do if [ "$pm" = yarn ]; then yarn workspace "$f" run build; else npm run build --workspace="$f"; fi; done
  fi
}
case "${CODE_BUILD:-all}" in
  all) node_run build ;;
  none) echo "code.sh: code_build none: no build (the Vercel previews build the apps)" ;;
  *) read -ra some <<<"$CODE_BUILD"
     echo "code.sh: code_build: the build of ${some[*]} only"
     build_some "${some[@]}" ;;
esac
if [ -f .icm/_system/scripts/db.sh ] && node_has db:migrate; then
  . .icm/_system/scripts/lib/project.sh
  e="$(pkg_all_have vercel-build .icm/_system/scripts/db.sh\ build)" \
    || { echo "::error::$e: the script vercel-build of each Vercel project must run 'bash <path>/.icm/_system/scripts/db.sh build' (rc35, rc37)"; exit 1; }
fi
echo "RESULT: OK"
