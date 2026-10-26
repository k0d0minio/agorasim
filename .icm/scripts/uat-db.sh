#!/usr/bin/env bash
# uat-db.sh — the UAT environment's database: the Neon branch `uat`, and its connection string
# on the Vercel custom environment `uat`.
#
# Usage: .icm/scripts/uat-db.sh [status|create|reset --yes|delete --yes]
#
#   status   the default branch, the UAT branch, the preview/* branches, and whether DATABASE_URL
#            and DATABASE_URL_UNPOOLED are set on the UAT environment. Reads only.
#   create   a schema-only branch named UAT_DB_BRANCH (`uat`) from the default branch: the tables,
#            none of the rows. Then DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct) on the
#            custom environment. Refuses when the branch exists.
#   reset    delete, then create. The client's test data is gone. Needs --yes.
#   delete   the UAT branch and its two variables on the environment. Needs --yes.
#
# Reads: NEON_API_KEY, NEON_PROJECT_ID, VERCEL_TOKEN, and VERCEL_TEAM, VERCEL_PROJECT,
# UAT_ENVIRONMENT, UAT_DB_BRANCH when set. The default branch is never written. No connection
# string reaches a terminal or a command line. The contract is .icm/uat/CONTEXT.md.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
die() { echo "error: $*" >&2; exit 1; }

verb=status; yes=0
while [ $# -gt 0 ]; do
  case "$1" in
    status|create|reset|delete) verb="$1"; shift ;;
    --yes) yes=1; shift ;;
    -h|--help) sed -n '2,17p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) die "unknown argument: $1 (usage: uat-db.sh [status|create|reset --yes|delete --yes])" ;;
  esac
done

# shellcheck source=lib/neon.sh
source "$here/lib/neon.sh"
# shellcheck source=lib/vercel.sh
source "$here/lib/vercel.sh"

uat_name="${UAT_DB_BRANCH:-uat}"
env_slug="${UAT_ENVIRONMENT:-uat}"

default_branch() { neon_default_branch; }

show_status() {
  local branches default uat previews
  branches="$(neon_branches)"
  default="$(printf '%s' "$branches" | jq -c '[.[] | select(.default == true)] | first // empty')"
  uat="$(printf '%s' "$branches" | jq -c --arg n "$uat_name" '[.[] | select(.name == $n)] | first // empty')"
  previews="$(printf '%s' "$branches" | jq '[.[] | select(.name | startswith("preview/"))] | length')"
  echo "production: $(printf '%s' "$default" | jq -r '"\(.name) (\(.id)), protected: \(.protected // false)"') — never written here"
  if [ -n "$uat" ]; then
    echo "uat:        $(printf '%s' "$uat" | jq -r '"\(.name) (\(.id)), \(.current_state), created \(.created_at)"')"
  else
    echo "uat:        absent — uat-db.sh create makes it"
  fi
  echo "previews:   $previews preview/* branch(es) — neon-cleanup.yml deletes one when its pull request closes"
  if [ -n "${VERCEL_TOKEN:-}" ]; then
    local env env_id k
    env="$(vercel_custom_env)"
    if [ -z "$env" ]; then
      echo "vercel:     no custom environment '$env_slug' on project $(vercel_project_name) — Setup step 1"
    else
      env_id="$(printf '%s' "$env" | jq -r '.id')"
      for k in DATABASE_URL DATABASE_URL_UNPOOLED; do
        if [ -n "$(vercel_env_find "$k" "$env_id")" ]; then echo "vercel:     $k set on '$env_slug'"; else echo "vercel:     $k not set on '$env_slug'"; fi
      done
    fi
  else
    echo "vercel:     VERCEL_TOKEN is not set — the environment's variables were not read"
  fi
  echo "RESULT: NEON uat $( [ -n "$uat" ] && echo present || echo absent ) · previews $previews"
}

do_create() {
  local env env_id default_id new new_id db role
  env="$(vercel_custom_env)"
  [ -n "$env" ] || die "no custom environment '$env_slug' on project $(vercel_project_name): Setup step 1 in .icm/uat/CONTEXT.md"
  env_id="$(printf '%s' "$env" | jq -r '.id')"
  [ -z "$(neon_branch "$uat_name" | jq -r '.id // empty')" ] || die "branch $uat_name exists: uat-db.sh reset --yes replaces it"
  default_id="$(default_branch | jq -r '.id // empty')"
  [ -n "$default_id" ] || die "the project has no default branch"
  echo "creating $uat_name from the default branch, schema only"
  new="$(neon_create_schema_only "$uat_name" "$default_id")"
  new_id="$(printf '%s' "$new" | jq -r '.branch.id')"
  neon_wait_ready "$new_id" 180 || die "branch $new_id is not ready after 180 s: read it in the Neon console, then run uat-db.sh status"
  IFS=$'\t' read -r db role < <(neon_branch_database "$new_id")
  [ -n "$db" ] && [ -n "$role" ] || die "branch $new_id has no database to connect to"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  neon_connection_uri "$new_id" "$db" "$role" true > "$tmp/pooled"
  neon_connection_uri "$new_id" "$db" "$role" false > "$tmp/direct"
  [ -s "$tmp/pooled" ] && [ -s "$tmp/direct" ] || die "Neon returned no connection string for $new_id"
  vercel_env_upsert DATABASE_URL "$tmp/pooled" "$env_id"
  vercel_env_upsert DATABASE_URL_UNPOOLED "$tmp/direct" "$env_id"
  rm -rf "$tmp"
  echo "created $uat_name ($new_id): database $db, role $role. Both variables are set on '$env_slug'."
  echo "next: redeploy the UAT environment (Vercel → Deployments → the newest '$env_slug' deployment → Redeploy). The variables apply to the next build."
}

do_delete() {
  local id env env_id k vid
  id="$(neon_branch "$uat_name" | jq -r '.id // empty')"
  if [ -z "$id" ]; then
    echo "branch $uat_name is absent: nothing to delete"
    return 1
  fi
  neon_delete_branch "$id" "$uat_name"
  echo "deleted $uat_name ($id)"
  env="$(vercel_custom_env)"
  if [ -n "$env" ]; then
    env_id="$(printf '%s' "$env" | jq -r '.id')"
    for k in DATABASE_URL DATABASE_URL_UNPOOLED; do
      vid="$(vercel_env_find "$k" "$env_id")"
      [ -z "$vid" ] || vercel_env_delete "$vid"
    done
  fi
  return 0
}

case "$verb" in
  status)
    neon_require "reading the branches"
    show_status ;;
  create)
    neon_require "creating the UAT branch"
    vercel_require "setting the connection string on the UAT environment"
    do_create
    echo "RESULT: CREATED $uat_name" ;;
  reset)
    [ "$yes" -eq 1 ] || die "reset deletes the client's test data: add --yes"
    neon_require "resetting the UAT branch"
    vercel_require "setting the connection string on the UAT environment"
    do_delete || true
    do_create
    echo "RESULT: RESET $uat_name" ;;
  delete)
    [ "$yes" -eq 1 ] || die "delete removes the UAT database: add --yes"
    neon_require "deleting the UAT branch"
    vercel_require "removing the connection string from the UAT environment"
    if do_delete; then echo "RESULT: DELETED $uat_name"; else echo "RESULT: ABSENT $uat_name"; fi ;;
esac
