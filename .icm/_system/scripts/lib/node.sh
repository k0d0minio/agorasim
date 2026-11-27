#!/usr/bin/env bash
# lib/node.sh — the package manager of a Node repo. Sourced, not run. Needs jq, or node.
#
#   node_pm              pnpm | yarn | npm, from the lockfile of this folder or one above
#   node_has <script>    0 when package.json names the script
#   node_run <script>    run the script with the package manager, when package.json names it
#   node_install         install the dependencies from the lockfile, with no change to it.
#                        With no package.json: nothing to install, exit 0 (rc26)

node_pm() {  # the lockfile of this folder or of a folder above it: a monorepo (rc37)
  local d="$PWD"
  while :; do
    if [ -f "$d/pnpm-lock.yaml" ]; then echo pnpm; return
    elif [ -f "$d/yarn.lock" ]; then echo yarn; return
    elif [ -f "$d/package-lock.json" ] || [ "$d" = / ]; then echo npm; return
    fi
    d="$(dirname "$d")"
  done
}

node_has() {  # a Vercel build has no jq (rc35)
  [ -f package.json ] || return 1
  if command -v jq >/dev/null 2>&1; then jq -e --arg s "$1" '.scripts[$s] // empty' package.json >/dev/null
  else node -e 'process.exit((require("./package.json").scripts || {})[process.argv[1]] ? 0 : 1)' "$1"; fi
}

node_run() {
  node_has "$1" || { echo "[node] package.json names no '$1': skipped"; return 0; }
  echo "[node] $(node_pm) run $*"
  "$(node_pm)" run "$@"
}

node_install() {
  [ -f package.json ] || { echo "[node] no package.json: nothing to install"; return 0; }
  case "$(node_pm)" in
    pnpm) corepack enable >/dev/null 2>&1 || true; pnpm install --frozen-lockfile ;;
    yarn) corepack enable >/dev/null 2>&1 || true; yarn install --frozen-lockfile ;;
    *) npm ci ;;
  esac
}
