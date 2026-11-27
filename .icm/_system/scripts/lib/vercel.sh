#!/usr/bin/env bash
# lib/vercel.sh — the Vercel transport of promote.sh and rollback.sh. Sourced, not run.
# Needs lib/project.sh and lib/gh.sh. The contract is .icm/_system/features/uat.md.
#
# Reads VERCEL_TOKEN (required), VERCEL_TEAM (the team slug; empty is the personal scope)
# and UAT_ENVIRONMENT (the custom environment; default uat). The token goes to curl in a
# file that only this process can read, never on a command line or in a trace. No variable
# names a project: a project of the repo has its git link here; a UAT project has the custom environment too.
#   vc_auth  not in a workflow: an empty VERCEL_TEAM gets the repo variable, an empty
#            VERCEL_TOKEN the keyring of BAXTER (account = the team). Call it in the main shell
#   vc_get|vc_post <path>  the body, or stop      vc_projects  "<id>\t<name>" of each one
#   vc_uat_projects        the same, UAT only     vc_domains <id>  its production domains
#   vc_deps <id> <target>  the 20 newest deployments: production, or the slug of UAT
#   vc_pick <id> <target> <sha>    the newest READY deployment of a commit at or before <sha>
#   vc_dep_of <id> <target> <sha>  the newest deployment of exactly <sha>, in any state
#   vc_current <id>  the deployment that the first production domain serves

uat_slug() { printf '%s' "${UAT_ENVIRONMENT:-uat}"; }

vc_helper="${HOME:-}/baxter_live/system/bin/baxter_secret.sh"
vc_auth() {
  [ -z "${GITHUB_ACTIONS:-}" ] || return 0
  [ -n "${VERCEL_TEAM:-}" ] || VERCEL_TEAM="$(gh api "repos/$(gh_repo)/actions/variables/VERCEL_TEAM" 2>/dev/null | jq -r '.value // empty' || true)"
  [ -z "${VERCEL_TOKEN:+1}" ] && [ -x "$vc_helper" ] || return 0
  local x="$-"; set +x  # no trace, no export, no output of the token
  VERCEL_TOKEN="$("$vc_helper" get vercel_token ${VERCEL_TEAM:+"$VERCEL_TEAM"} 2>/dev/null || true)"; case "$x" in *x*) set -x ;; esac
}

vc_call() {  # <method> <path>
  local cfg url="${VERCEL_API:-https://api.vercel.com}$2" rc=0 x="$-"
  [ -n "${VERCEL_TOKEN:+1}" ] || { echo "RESULT: STOP VERCEL_TOKEN is not set" >&2; exit 1; }
  [ -z "${VERCEL_TEAM:-}" ] || { case "$url" in *\?*) url+="&" ;; *) url+="?" ;; esac; url+="slug=$VERCEL_TEAM"; }
  cfg="$(umask 077 && mktemp)"; set +x  # the trace never shows the token
  printf 'url = "%s"\nrequest = "%s"\nheader = "Authorization: Bearer %s"\nmax-time = 60\nsilent\nshow-error\nfail-with-body\n' \
    "$url" "$1" "$VERCEL_TOKEN" > "$cfg"; case "$x" in *x*) set -x ;; esac
  curl --config "$cfg" || rc=$?
  rm -f "$cfg"
  return "$rc"
}
# A refusal goes to the error output: the callers read the output of these functions.
vc_get() { vc_call GET "$1" || { echo "RESULT: STOP Vercel refused GET ${1%%\?*}" >&2; exit 1; }; }
vc_post() { vc_call POST "$1" || { echo "RESULT: STOP Vercel refused POST ${1%%\?*}" >&2; exit 1; }; }

vc_projects() {
  local repo body
  repo="$(gh_repo)" || stop "the repo is not known"
  body="$(vc_get "/v10/projects?repoUrl=$(jq -rn --arg u "https://github.com/$repo" '$u|@uri')&limit=100")"
  jq -r --arg r "$repo" '[.projects[] | select(((.link.org // "") + "/" + (.link.repo // "")
    | ascii_downcase) == ($r | ascii_downcase))] | sort_by(.name) | .[] | [.id, .name] | @tsv' <<<"$body"
}

vc_uat_projects() {
  local list id name envs
  list="$(vc_projects)"
  while IFS=$'\t' read -r id name; do
    [ -n "$id" ] || continue
    envs="$(vc_get "/v9/projects/$id/custom-environments")"
    if jq -e --arg s "$(uat_slug)" 'any(.environments[]?; .slug == $s)' <<<"$envs" >/dev/null; then
      printf '%s\t%s\n' "$id" "$name"
    fi
  done <<<"$list"
  return 0
}

vc_deps() {
  local body
  body="$(vc_get "/v6/deployments?projectId=$1&target=$2&limit=20")"
  jq -c '.deployments // []' <<<"$body"
}

# Commit and state of a deployment, one per line: "<sha>\t<state>\t<json>", newest first.
_vc_rows() { jq -c 'sort_by(-.created) | .[]' | while IFS= read -r d; do
  printf '%s\t%s\t%s\n' "$(jq -r '.meta.githubCommitSha // ""' <<<"$d")" "$(jq -r '.state // .readyState' <<<"$d")" "$d"
done; }

vc_pick() {
  local rows sha state d
  rows="$(vc_deps "$1" "$2" | _vc_rows)"
  while IFS=$'\t' read -r sha state d; do
    [ "$state" = READY ] && [ -n "$sha" ] && git merge-base --is-ancestor "$sha" "$3" 2>/dev/null \
      && { printf '%s\n' "$d"; return 0; }
  done <<<"$rows"
  return 0
}

vc_dep_of() {
  local rows sha state d
  rows="$(vc_deps "$1" "$2" | _vc_rows)"
  while IFS=$'\t' read -r sha state d; do
    [ "$sha" = "$3" ] && { printf '%s\n' "$d"; return 0; }
  done <<<"$rows"
  return 0
}

vc_domains() {
  local body
  body="$(vc_get "/v9/projects/$1/domains?limit=100")"
  jq -r '.domains[] | select(.gitBranch == null and .customEnvironmentId == null and .redirect == null) | .name' <<<"$body"
}

# What the domain serves. The field targets.production of a project names the newest
# production build, also one that was canceled: it is not what the domain serves.
vc_current() {
  local d
  d="$(vc_domains "$1" | head -n1)"
  [ -n "$d" ] || return 0
  d="$(vc_get "/v4/aliases/$d")"
  jq -r '.deploymentId // empty' <<<"$d"
}
