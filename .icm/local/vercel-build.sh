#!/usr/bin/env bash
# vercel-build.sh
# The build's vercel-build. It migrates the deployment's own database, then runs the build
# command. package.json names it once and its line never changes:
#   "vercel-build": "bash .icm/local/vercel-build.sh next build"
# (from a package below the root: "bash ../.icm/local/vercel-build.sh next build").
# A monorepo calls it from each app's vercel.json, and it migrates before turbo starts:
#   "buildCommand": "bash ../../.icm/local/vercel-build.sh turbo run build"
# The rule is .icm/local/database.md § The migration rule. This file belongs to the repo since
# 2026-11-18: the BAXTER blueprint has no copy of it. It leaves at step 5 of the setup act
# .icm/setup/databases.md, when the workflow ci migrates the databases.
set -euo pipefail

[ "$#" -gt 0 ] || { echo "vercel-build.sh: give the build command, for example: next build" >&2; exit 2; }

target="${VERCEL_TARGET_ENV:-}"
[ -n "$target" ] || {
  echo "vercel-build.sh: VERCEL_TARGET_ENV is not set. Turn on \"Automatically expose System Environment Variables\" in the Vercel project" >&2
  exit 1
}
# The package manager: from npm_config_user_agent under a package script. A buildCommand runs
# with no package manager, so the nearest lockfile at or above this folder decides.
agent="${npm_config_user_agent:-}"
pm="${agent%%/*}"
dir="$PWD"
while [ -z "$pm" ]; do
  if [ -e "${dir}/pnpm-lock.yaml" ]; then pm=pnpm
  elif [ -e "${dir}/yarn.lock" ]; then pm=yarn
  elif [ -e "${dir}/bun.lock" ] || [ -e "${dir}/bun.lockb" ]; then pm=bun
  elif [ -e "${dir}/package-lock.json" ] || [ "$dir" = / ]; then pm=npm
  else dir="$(dirname "$dir")"
  fi
done
case "$pm" in
  pnpm|yarn|bun) run=("$pm" run) ;;
  *)             run=(npm run) ;;
esac

# Production migrates in promote.yml, after the client's sign-off. Its build runs at the merge
# to main, before the sign-off, so it never migrates.
if [ "$target" = production ]; then
  echo "[vercel-build] VERCEL_TARGET_ENV=production: promote.yml migrates production, so this build only builds"
  exec "$@"
fi
: "${DATABASE_URL:?vercel-build.sh: DATABASE_URL is not set, so nothing can migrate. Read .icm/local/database.md § Setup}"
echo "[vercel-build] VERCEL_TARGET_ENV=${target}: migrate, verify, then build"
DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" "${run[@]}" db:migrate
DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" "${run[@]}" db:verify
exec "$@"
