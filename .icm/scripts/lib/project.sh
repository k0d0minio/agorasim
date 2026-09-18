#!/usr/bin/env bash
# lib/project.sh — the one reader of the project-owned manifest, .icm/project.json. Sourced, not run.
#
# The template-owned scripts and contracts carry no repo identity (template/README.md → "No
# substitutions"; decision D20). Whatever is specific to one repo — its name, where its docs
# live, where shipped runs are archived, which CI checks must be present — lives in
# `.icm/project.json`, which the repo owns and the sync never touches. This library is how a
# script reads it, with a default for every key so a repo that has not filled the manifest in
# still runs on the estate's own conventions (`.icm/runs/_done/`, `.icm/intake/_done/`).
#
# Keys (all optional except `name` and `profile`, which `env-check.sh` reports on):
#   name            the repo's short name (its folder name under projects/)
#   profile         "pipeline" — the same word `.icm/CONTEXT.md` declares
#   docs_path       root of the docs tree the stages read through _shared/knowledge-map.md
#   required_env    array of environment variable names the pipeline needs in this repo
#   required_checks array of check-run names ci-status.sh must see completed before GREEN
#                   (PIPELINE_REQUIRED_CHECKS in the environment overrides it)
#   personas        array of persona label keywords project-labels.sh may project (the repo's
#                   own vocabulary, matching its labels file); empty means no persona labels
#   runs_archive    where close-out.sh moves a shipped run      (default .icm/runs/_done)
#   intake_archive  where close-out.sh moves a finished epic    (default .icm/intake/_done)
#   smoke_check     object {name, workflow, preview_status} — a conditionally required preview
#                   walk (see ci-status.sh); absent means the repo has none
#
# Contract for callers (source after die() is defined; needs jq):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/project.sh"
#   project_field <jq-path> [<default>]   prints the scalar at <jq-path> (e.g. `.docs_path`),
#                                         or <default> when the file or the key is absent.
#   project_list  <jq-path>               prints one array element per line, nothing when absent.
#   project_json                          the manifest's path (may not exist).

declare -F die >/dev/null 2>&1 || die() { echo "error: $*" >&2; exit 1; }

# The repo root is two levels above .icm/scripts/lib/ — the same derivation every script uses.
_project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
project_json="$_project_root/.icm/project.json"

if [ -f "$project_json" ] && ! jq -e . "$project_json" >/dev/null 2>&1; then
  die ".icm/project.json is not valid JSON — fix it before running the pipeline scripts"
fi

project_field() {
  local path="$1" default="${2:-}" value=""
  if [ -f "$project_json" ]; then
    value="$(jq -r "$path // empty" "$project_json" 2>/dev/null || true)"
  fi
  printf '%s' "${value:-$default}"
}

project_list() {
  [ -f "$project_json" ] || return 0
  jq -r "($1 // [])[]?" "$project_json" 2>/dev/null || true
}

# Every script that archives or looks up archived runs reads these two — repo-relative, no
# trailing slash. The defaults are the estate's own convention (contracts/TICKETS.md).
runs_archive_rel="$(project_field '.runs_archive' '.icm/runs/_done')"
intake_archive_rel="$(project_field '.intake_archive' '.icm/intake/_done')"
runs_archive_rel="${runs_archive_rel%/}"
intake_archive_rel="${intake_archive_rel%/}"
