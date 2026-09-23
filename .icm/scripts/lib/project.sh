#!/usr/bin/env bash
# lib/project.sh — the one reader of the project-owned manifest, .icm/project.json. Sourced, not run.
#
# The template-owned scripts and contracts carry no repo identity (template/README.md → "No
# substitutions"; decision D20). Whatever is specific to one repo — its name, where its docs
# live, where shipped runs are archived, which CI checks must be present, where it deploys, how
# it reports — lives in `.icm/project.json`, which the repo owns and the sync never touches. This
# library is how a script reads it, with a default for every key so a repo that has not filled
# the manifest in still runs on the estate's own conventions (`.icm/runs/_done/`,
# `.icm/intake/_done/`, a GitHub Release on every merge).
#
# Keys (all optional except `name`, which `env-check.sh` reports on):
#   name            the repo's short name (its folder name under projects/)
#   complexity      how much of the pipeline this project leans on: "standard" (the default —
#                   absent reads as standard) or "micro" (a one-page site, a script repo: the
#                   knowledge-map check returns 0 at once; the support section prints
#                   `micro: no support line`). There is no `profile` key any more — every repo
#                   carries the one pipeline; an old `"profile"` value is ignored.
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
#   models          object {sonnet, opus, fable} → the model id this repo's harness wants for
#                   each alias select-model.sh prints; absent means the alias is all it prints
#   deploy          object — where the repo deploys (agency brief §4.2). `platform` ("vercel"),
#                   `team_slug`, `token_env` (the NAME of the variable holding the Vercel token;
#                   lib/vercel.sh falls back to plain VERCEL_TOKEN), `projects[]` each
#                   {name, path, status_context, class: product|quiet, production_url}.
#                   Absent, or an empty `projects` array, reads as "not declared" — never an
#                   error: deploy-status.sh, env.sh and rollback.sh say so and stop.
#   reporting       object — message kinds → channels (agency brief §4.0). `announce_from`
#                   ("session" default — Release step 9 calls report.sh; "ci" — the reference
#                   release workflow calls it and the session records `deferred to CI`);
#                   `announce`, `alert`, `economics`: arrays of channel names (the seeded default
#                   is announce ["github-release"], the rest empty — an empty `alert` means a red
#                   CI job is the alert); `channels`: per-channel config carrying only the NAMES
#                   of environment variables, never a value.
#   migrations      object {path, reversible, stamp, tool, out_of_order}. `path` is where
#                   timestamped migrations live (check-migrations.sh; a string or an array — the
#                   old top-level `migrations_path` is still read); `reversible` false (the
#                   default) scopes Release stop class 3 and makes rollback.sh warn that the
#                   schema moved forward; `stamp` "millis" (the default — this branch's own
#                   migrations must carry a UTC millisecond stamp, `V<17 digits>__<name>.sql`) or
#                   "seconds" (the legacy `<14 digits>_<name>.sql`; both forms are always READ);
#                   `tool` flyway|prisma|drizzle|sql (default sql — what the out-of-order note is
#                   phrased for); `out_of_order` true (the default — parallel runs merge in any
#                   order; check-migrations.sh prints the tool's setting, `flyway.outOfOrder=true`).
#   database        object {url_env, isolation, image, name} — the run-scoped database
#                   db-branch.sh binds a run to. `url_env` is the NAME of the variable holding the
#                   connection string (default DATABASE_URL; the value is never in this file);
#                   `isolation` "none" (the default — no isolated database, the script says SKIP),
#                   "schema" (one Postgres schema per run, `run_<slug>`, on the database the
#                   variable names) or "container" (one local Postgres container per run,
#                   `icm-db-<slug>`, from `image`, default postgres:16, database `name`, default app).
#   security        object {audit_command} — security-check.sh's dependency audit for an
#                   ecosystem it does not detect itself (npm/pnpm/yarn lockfiles are detected):
#                   a shell command that exits non-zero on a high/critical finding, e.g.
#                   "pip-audit" or "cargo audit". Empty (the default) means: detect, else skip.
#   support         object {tier: none|basic|retainer, failsafe_page, monitoring.sentry_dsn_env}
#                   — the after-handover line the deal agreed. setup.sh's Support section checks
#                   the fail-safe page and the Sentry key exist when tier is basic or retainer;
#                   Release step 4 stops (class 3) when they do not.
#   uat             object {branch, url} — OPTIONAL: the persistent client UAT environment
#                   (decision D31; `.icm/uat/CONTEXT.md`). Declared only by `/setup`, never
#                   seeded filled. `branch` is the long-lived integration branch every run's PR
#                   targets instead of main once declared (`uat` by convention); `url` is the one
#                   fixed address the client opens — a domain assigned to that branch in Vercel,
#                   or the branch alias — the same every day, never a per-batch preview. Absent,
#                   or an empty `branch`, reads as "not declared": every run merges into main and
#                   ships on the merge, exactly as before. `promote-uat.sh` and `client-status.sh`
#                   read it; `new-run.sh`, `close-out.sh`, `deploy-status.sh --uat` and
#                   `check-migrations.sh` change their base branch on it.
#   health_endpoint the URL (or an array of URLs) that answers 200 when production is up —
#                   health-check.sh GETs it once after the merge (Release step 9a). A project
#                   may carry its own as deploy.projects[].health_endpoint instead, or as well.
#                   Absent or empty reads as "not declared": health-check.sh says SKIP.
#
# Contract for callers (source after die() is defined; needs jq):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/project.sh"
#   project_field <jq-path> [<default>]   prints the scalar at <jq-path> (e.g. `.docs_path`),
#                                         or <default> when the file or the key is absent.
#   project_list  <jq-path>               prints one array element per line, nothing when absent.
#   project_json                          the manifest's path (may not exist).
#   project_has   <jq-path>               returns 0 when the key exists and is neither null nor
#                                         an empty string/array/object — the "declared?" test.
#   deploy_projects                       prints one JSON object per line from deploy.projects[]
#                                         (empty when not declared).
#   deploy_token_env · deploy_platform · deploy_team
#                                         the deploy block's scalars with their defaults.
#   reporting_channels <kind>             the channel names mapped to announce|alert|economics,
#                                         one per line; the seeded default for announce is
#                                         github-release when the block is absent entirely.
#   reporting_channel_field <channel> <key> [<default>]
#                                         one value from reporting.channels.<channel>.
#   migrations_paths                      one path per line: migrations.path (string or array),
#                                         else the legacy migrations_path, else nothing.
#   migrations_reversible                 prints true|false (default false).
#   migrations_stamp · migrations_tool · migrations_out_of_order
#                                         the naming form (millis|seconds), the tool word, and
#                                         true|false (default true) — read as booleans, so an
#                                         explicit `false` is false (jq's `//` would read it as absent).
#   database_url_env · database_isolation · database_image · database_name
#                                         the database block's scalars with their defaults.
#   security_audit_command                the audit override, or nothing.
#   support_tier · support_failsafe · support_sentry_env
#                                         the support block's scalars with their defaults.
#   uat_declared                          returns 0 when uat.branch is set — the repo has a
#                                         persistent client UAT environment.
#   uat_branch · uat_url                  the uat block's scalars ('' when not declared).
#   pipeline_base_branch                  the branch a run's PR targets and a run branch is cut
#                                         from: uat.branch when declared, else main. A hotfix
#                                         ignores it (production is wrong now — lanes/hotfix).
#   health_endpoints                      one URL per line: the top-level health_endpoint (string
#                                         or array), then every deploy.projects[].health_endpoint,
#                                         in that order, de-duplicated; nothing when none declared.
#   pipeline_lanes                        the lane vocabulary, space-separated — the one list
#                                         new-run.sh, resolve-run.sh, project-labels.sh,
#                                         close-out.sh, validate-intake.sh and triage-report.sh
#                                         read (bug tweak chore hotfix handover promote). Not a
#                                         manifest key: the lanes are the template's, not the
#                                         repo's. `promote` is the one lane with no contract
#                                         folder: promote-uat.sh runs it end to end (a UAT
#                                         batch's promotion PR into main), .icm/uat/CONTEXT.md
#                                         is its contract, and it never starts from a stub.
#   is_lane <word>                        returns 0 when <word> is one of pipeline_lanes.

declare -F die >/dev/null 2>&1 || die() { echo "error: $*" >&2; exit 1; }

# The repo root is two levels above .icm/scripts/lib/ — the same derivation every script uses.
_project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# A caller may point this at another repo's manifest before sourcing (setup.sh, run from the
# template's copy against a bare repo); otherwise it is this repo's own.
project_json="${project_json:-$_project_root/.icm/project.json}"

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

project_has() {
  [ -f "$project_json" ] || return 1
  jq -e "($1) as \$v | \$v != null and (\$v | if type == \"string\" or type == \"array\" or type == \"object\" then length > 0 else true end)" \
    "$project_json" >/dev/null 2>&1
}

# --- deploy ------------------------------------------------------------------------------------------

deploy_platform()  { project_field '.deploy.platform' 'vercel'; }
deploy_team()      { project_field '.deploy.team_slug' ''; }
deploy_token_env() { project_field '.deploy.token_env' 'VERCEL_TOKEN'; }
deploy_projects() {
  [ -f "$project_json" ] || return 0
  jq -c '(.deploy.projects // [])[]?' "$project_json" 2>/dev/null || true
}

# --- reporting ---------------------------------------------------------------------------------------

reporting_channels() { # announce|alert|economics
  local kind="$1"
  if [ -f "$project_json" ] && jq -e '.reporting' "$project_json" >/dev/null 2>&1; then
    jq -r "(.reporting[\"$kind\"] // [])[]?" "$project_json" 2>/dev/null || true
  else
    # No reporting block at all: the seeded default — a Release on every merge, nothing else.
    [ "$kind" = "announce" ] && echo "github-release"
  fi
}
reporting_channel_field() { # <channel> <key> [<default>]
  project_field ".reporting.channels[\"$1\"][\"$2\"]" "${3:-}"
}

# --- migrations --------------------------------------------------------------------------------------

migrations_paths() {
  [ -f "$project_json" ] || return 0
  jq -r '
    (.migrations.path // .migrations_path // empty)
    | if type == "array" then .[] else . end
    | select(. != "")' "$project_json" 2>/dev/null || true
}
migrations_reversible() {
  local v; v="$(project_field '.migrations.reversible' 'false')"
  case "$v" in true) echo true ;; *) echo false ;; esac
}
migrations_stamp() {
  local v; v="$(project_field '.migrations.stamp' 'millis')"
  case "$v" in seconds) echo seconds ;; *) echo millis ;; esac
}
migrations_tool() {
  local v; v="$(project_field '.migrations.tool' 'sql' | tr '[:upper:]' '[:lower:]')"
  case "$v" in flyway|prisma|drizzle|sql) echo "$v" ;; *) echo sql ;; esac
}
migrations_out_of_order() {
  # A boolean read as a boolean: `false // empty` is empty in jq, so project_field cannot tell an
  # explicit false from an absent key. Default true — parallel runs merge in any order.
  local v="true"
  if [ -f "$project_json" ]; then
    v="$(jq -r 'if (.migrations.out_of_order | type) == "boolean" then .migrations.out_of_order else "true" end' "$project_json" 2>/dev/null || echo true)"
  fi
  case "$v" in false) echo false ;; *) echo true ;; esac
}

# --- database ----------------------------------------------------------------------------------------

database_url_env()   { project_field '.database.url_env' 'DATABASE_URL'; }
database_isolation() {
  local v; v="$(project_field '.database.isolation' 'none')"
  case "$v" in schema|container) echo "$v" ;; *) echo none ;; esac
}
database_image()     { project_field '.database.image' 'postgres:16'; }
database_name()      { project_field '.database.name' 'app'; }

# --- security ----------------------------------------------------------------------------------------

security_audit_command() { project_field '.security.audit_command' ''; }

# --- support -----------------------------------------------------------------------------------------

support_tier()       { project_field '.support.tier' 'none'; }
support_failsafe()   { project_field '.support.failsafe_page' ''; }
support_sentry_env() { project_field '.support.monitoring.sentry_dsn_env' 'SENTRY_DSN'; }

# --- uat ---------------------------------------------------------------------------------------------
# The persistent client UAT environment, where the repo declares one (D31). Not declared → every
# helper answers as the pipeline always did: base branch main, no batch, no promotion.

uat_declared() { project_has '.uat.branch'; }
uat_branch()   { project_field '.uat.branch' ''; }
uat_url()      { project_field '.uat.url' ''; }
pipeline_base_branch() {
  if uat_declared; then uat_branch; else printf '%s' "main"; fi
}

# --- health ------------------------------------------------------------------------------------------

health_endpoints() {
  [ -f "$project_json" ] || return 0
  jq -r '
    [ (.health_endpoint // empty | if type == "array" then .[] else . end),
      ((.deploy.projects // [])[]? | .health_endpoint // empty) ]
    | map(select(type == "string" and . != ""))
    | reduce .[] as $u ([]; if index($u) then . else . + [$u] end)
    | .[]' "$project_json" 2>/dev/null || true
}

# --- lanes -------------------------------------------------------------------------------------------
# The one vocabulary list. bug/tweak/chore open draft; hotfix opens READY (an incident wants the
# full gate and the previews at once); handover is the deal's last lane (lanes/handover/CONTEXT.md);
# promote is script-run — promote-uat.sh opens a UAT batch's promotion PR into main, READY
# (.icm/uat/CONTEXT.md) — and is never picked by hand or from a stub.
pipeline_lanes() { printf '%s' "bug tweak chore hotfix handover promote"; }
is_lane() {
  local w
  for w in $(pipeline_lanes); do [ "$w" = "$1" ] && return 0; done
  return 1
}

# Every script that archives or looks up archived runs reads these two — repo-relative, no
# trailing slash. The defaults are the estate's own convention (contracts/TICKETS.md).
runs_archive_rel="$(project_field '.runs_archive' '.icm/runs/_done')"
intake_archive_rel="$(project_field '.intake_archive' '.icm/intake/_done')"
runs_archive_rel="${runs_archive_rel%/}"
intake_archive_rel="${intake_archive_rel%/}"
