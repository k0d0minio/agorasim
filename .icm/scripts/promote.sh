#!/usr/bin/env bash
# promote.sh — the batch, the client's word, and what waits on Jamie.
#
# Usage: .icm/scripts/promote.sh [status]
#        .icm/scripts/promote.sh approve --by "<who>" [--note "<their words>"]
#
#   status   the last release tag, the batch since it (git log <tag>..origin/main), the open
#            release pull request, `ci` on main's head, the UAT deployment of that head, the
#            staged production build of it, the setup acts this script can read, and the dispatch
#            command when the last release tag is not promoted yet. Reads only.
#   approve  THE RECORD OF THE CLIENT'S WORD. Jamie, in this session, says the client approved
#            and names who. The script posts the record on the open release pull request, names
#            the batch and the UAT deployment, and stops. It refuses without --by, without an
#            open release pull request, and when the UAT deployment of main's head is not READY.
#            It ticks nothing, merges nothing and dispatches nothing: the merge of the release
#            pull request and the dispatch of promote.yml are Jamie's.
#
# Reads: gh (signed in), git, jq, curl, VERCEL_TOKEN, and VERCEL_TEAM, VERCEL_PROJECT,
# UAT_ENVIRONMENT when set. Without VERCEL_TOKEN, status prints what git and GitHub know and
# approve refuses. The contract is .icm/uat/CONTEXT.md.
# Exit: 0 reported or recorded · 1 an error · 3 a refusal, named on stderr, RESULT: STOP.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git rev-parse --show-toplevel)"
cd "$root"
die() { echo "error: $*" >&2; exit 1; }
stop() { echo "$*" >&2; echo "RESULT: STOP"; exit 3; }
for t in gh git jq curl; do command -v "$t" >/dev/null 2>&1 || die "$t is not installed"; done

verb=status; by=""; note=""
while [ $# -gt 0 ]; do
  case "$1" in
    status|approve) verb="$1"; shift ;;
    --by) by="${2:-}"; shift 2 ;;
    --note) note="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) die "unknown argument: $1 (usage: promote.sh [status] | approve --by \"<who>\" [--note \"<text>\"])" ;;
  esac
done

# shellcheck source=lib/vercel.sh
source "$here/lib/vercel.sh"

# --- git: the last release and the batch ---------------------------------------------------------
git fetch -q --tags origin main
head="$(git rev-parse origin/main)"
short="${head:0:7}"
last_tag="$(git describe --tags --match 'v*' --abbrev=0 origin/main 2>/dev/null || true)"
if [ -n "$last_tag" ]; then
  range="${last_tag}..origin/main"
else
  range="origin/main"
fi
batch="$(git log --oneline --no-decorate "$range")"
n="$(printf '%s\n' "$batch" | grep -c . || true)"

# --- GitHub: the release pull request and ci on main's head ----------------------------------------
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo '<owner/name>')"
release_pr="$(gh pr list --state open --label 'autorelease: pending' --json number,url,title --jq 'first // empty' 2>/dev/null || true)"
pr_number="$(printf '%s' "$release_pr" | jq -r '.number // empty' 2>/dev/null || true)"
pr_url="$(printf '%s' "$release_pr" | jq -r '.url // empty' 2>/dev/null || true)"
pr_version="$(printf '%s' "$release_pr" | jq -r '.title // empty' 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"
ci="$(gh run list --workflow ci --branch main --commit "$head" --limit 1 --json status,conclusion \
  --jq 'first | "\(.status)\(if .conclusion then " " + .conclusion else "" end)"' 2>/dev/null || true)"
[ -n "$ci" ] || ci="no run found for $short"

# --- Vercel: the environment, UAT, the staged build, the setup acts -------------------------------
uat_state="not read"; prod_state="not read"; prod_line="VERCEL_TOKEN is not set: UAT and production were not read"
uat_line="$prod_line"; setup_lines=""; uat_id=""; uat_domain=""
if [ -n "${VERCEL_TOKEN:-}" ]; then
  vercel_require "reading UAT and production"
  env="$(vercel_custom_env)"
  slug="${UAT_ENVIRONMENT:-uat}"
  if [ -n "$env" ]; then
    uat_domain="$(printf '%s' "$env" | jq -r '[.domains[]?.name] | first // empty')"
    matcher="$(printf '%s' "$env" | jq -r '"\(.branchMatcher.type // "?") \(.branchMatcher.pattern // "?")"')"
    setup_lines="  [OK]   custom environment '$slug' on $(vercel_project_name), tracking: $matcher"$'\n'
    if [ -n "$uat_domain" ]; then setup_lines+="  [OK]   domain attached: $uat_domain"$'\n'; else setup_lines+="  [TODO] no domain attached to '$slug' (Setup step 1)"$'\n'; fi
    dep="$(vercel_deployment "$slug" "$head")"
    if [ -n "$dep" ]; then
      uat_state="$(printf '%s' "$dep" | jq -r '.state // .readyState')"
      uat_id="$(printf '%s' "$dep" | jq -r '.uid // .id')"
      uat_line="$uat_state on $short · $uat_id${uat_domain:+ · https://$uat_domain}"
    else
      uat_line="no '$slug' deployment of $short yet"
    fi
  else
    setup_lines="  [TODO] no custom environment '$slug' on $(vercel_project_name) (Setup step 1)"$'\n'
    uat_line="no custom environment '$slug'"
  fi
  project="$(vercel_project)"
  auto="$(printf '%s' "$project" | jq -r 'if has("autoAssignCustomDomains") then (.autoAssignCustomDomains | tostring) else "unknown" end')"
  case "$auto" in
    false) setup_lines+="  [OK]   Auto-assign Custom Production Domains is off"$'\n' ;;
    true) setup_lines+="  [TODO] Auto-assign Custom Production Domains is on: every merge would ship (Setup step 2)"$'\n' ;;
    *) setup_lines+="  [?]    Auto-assign Custom Production Domains: not in the project read; check Settings → Environments → Production"$'\n' ;;
  esac
  current="$(printf '%s' "$project" | jq -r '.targets.production.id // empty')"
  pdep="$(vercel_deployment production "$head")"
  if [ -n "$pdep" ]; then
    prod_state="$(printf '%s' "$pdep" | jq -r '.state // .readyState')"
    pid="$(printf '%s' "$pdep" | jq -r '.uid // .id')"
    if [ "$pid" = "$current" ]; then prod_line="current: $short is promoted ($pid)"; prod_state="current"
    else prod_line="staged $prod_state on $short ($pid); production serves ${current:-nothing}"; fi
  else
    prod_line="no production build of $short yet; production serves ${current:-nothing}"
  fi
  if [ -n "$last_tag" ]; then
    tag_sha="$(git rev-parse "${last_tag}^{commit}")"
    tdep="$(vercel_deployment production "$tag_sha")"
    tid="$(printf '%s' "$tdep" | jq -r '.uid // .id // empty' 2>/dev/null || true)"
    if [ -n "$tid" ] && [ "$tid" = "$current" ]; then
      promote_line="$last_tag is promoted ($tid)"
    else
      promote_line="$last_tag is not promoted. Jamie runs: gh workflow run promote.yml --repo $repo -f tag=$last_tag"
    fi
  fi
fi

# --- status ----------------------------------------------------------------------------------------
echo "release:    ${last_tag:-none yet}$( [ -n "$last_tag" ] && echo " at $(git rev-parse --short "$last_tag")")"
echo "batch:      $n commit(s) on main since ${last_tag:-the first commit}"
[ -z "$batch" ] || printf '%s\n' "$batch" | head -n 20 | sed 's/^/  /'
[ "$n" -le 20 ] || echo "  … $((n - 20)) more"
if [ -n "$pr_number" ]; then echo "release PR: #$pr_number $pr_url"; else echo "release PR: none open (nothing merged since the last release, or release-please has not run on main yet)"; fi
echo "ci on main: $ci ($short)"
echo "uat:        $uat_line"
echo "production: $prod_line"
[ -z "${promote_line:-}" ] || echo "promote:    $promote_line"
if [ -n "$setup_lines" ]; then echo "setup:"; printf '%s' "$setup_lines"; fi

if [ "$verb" = status ]; then
  echo "RESULT: BATCH $n since ${last_tag:-start} · release PR ${pr_number:+#}${pr_number:-none} · ci ${ci%% *} · uat $uat_state · production $prod_state"
  exit 0
fi

# --- approve: the record --------------------------------------------------------------------------
[ -n "$by" ] || die "approve needs --by \"<who said yes>\""
[ -n "${VERCEL_TOKEN:-}" ] || stop "VERCEL_TOKEN is not set: the UAT deployment cannot be read, so the record cannot name what the client tested"
[ -n "$pr_number" ] || stop "no release pull request is open: nothing to promote. A merge to main makes release-please open one"
[ "$uat_state" = READY ] || stop "the UAT deployment of $short is ${uat_state}: the client cannot have tested this batch"
[ "$prod_state" = READY ] || [ "$prod_state" = current ] || echo "note: the production build of $short is ${prod_state}. promote.yml waits for it, fifteen minutes at most."

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
{
  echo "**UAT sign-off** — ${by} approved the batch on $(date -u +%Y-%m-%d)${note:+: ${note}}"
  echo
  echo "- batch: \`${last_tag:-start}..${short}\`, ${n} commit(s)"
  echo "- uat: ${uat_domain:+https://$uat_domain · }deployment ${uat_id} of ${short}"
  echo "- recorded by \`.icm/scripts/promote.sh approve\`"
  echo
  echo "Jamie merges this pull request, then dispatches \`promote.yml\` with its tag. Both acts are Jamie's. Merge nothing else before it."
} > "$tmp"
gh pr comment "$pr_number" --body-file "$tmp" >/dev/null
echo "recorded on $pr_url"
echo "next: Jamie merges the release pull request, then runs: gh workflow run promote.yml --repo $repo -f tag=v${pr_version:-<version>}"
echo "      promote.yml then migrates production and promotes the staged build of the release commit."
echo "RESULT: RECORDED $pr_url"
