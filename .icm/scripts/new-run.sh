#!/usr/bin/env bash
# new-run.sh — scaffold a pipeline run: commit it, open its PR, label it, consume the stub.
#
# Two modes:
#   • Spine (default) — the mechanical half of Define (.icm/stages/02_define/CONTEXT.md).
#     Define writes spec.md and hands the one-line PR Summary in via --summary; this script commits
#     the run + pushes, opens the DRAFT PR with a body projected from spec.md (project-body.sh —
#     template headings + both gate anchors + acceptance criteria mirrored unticked; `revise <slug>`
#     re-projects it with the same script), writes/extends run.md, projects the labels
#     (project-labels.sh), and — if --stub was passed — git mv's the stub into _done/.
#   • Lane (--lane bug|tweak|chore) — the fast-lane scaffold (.icm/lanes/*/CONTEXT.md). No spec
#     required: opens a DRAFT PR whose body carries Summary (with a `- slug:` line, so
#     resolve-run.sh finds lane PRs by body like spine ones — its branch-name fallback covers
#     PRs without one) and Steps to test — and NO gate
#     checkboxes: a lane PR is merged by a human from the GitHub UI, so the merge button is its
#     gate. Labels it type:<lane> and writes run.md with a `lane:` line. Lanes open draft like the
#     spine (blind-until-ready, deployment-economics stub 9): draft pushes run the cheap CI tier
#     and build no previews; the lane flips ready when its fix is settled, which starts the full
#     gate and the affected product-app previews.
#
# The spine PR body mirrors .github/pull_request_template.md — the same sections in the same
# order (Summary, the Spec table, Acceptance criteria, Steps to test, the Gates block), and the
# gate anchors kept byte-identical because the pipeline parses them (see .icm/_shared/github.md).
# The lane body carries neither anchor by design; the "missing gate:ready-to-merge anchor is
# malformed" rule applies to spine PRs only.
#
# --dry-run prints the PR body this call would open (the spine body straight from
# project-body.sh, or the lane body) and creates NOTHING: no branch, no commit, no push, no PR,
# no run.md, no labels, no stub move. It needs no GitHub credential. Use it to check the layout.
#
# THIS SCRIPT IS THE ONLY WAY A PIPELINE PR IS OPENED AND A RUN BRANCH IS NAMED. No other script,
# stage contract, lane, or hand-typed MCP call may create a branch or open a PR for a run
# (.icm/_shared/github.md → PR regime 2). Branch naming: when HEAD is main/master or detached the
# script creates and checks out `claude/<slug>` itself (plain local use); on any other branch it
# uses the CURRENT branch as the run branch — a harness-named branch (a Claude Code cloud session,
# OpenCode, an Actions checkout) is accepted as-is and recorded in run.md's `- branch:` line, which
# is what resolve-run.sh checks out later. The branch is pushed and the PR opened from it here.
#
# Config from the process environment (no .env loading) — the GitHub calls go through
# .icm/scripts/lib/gh.sh, which falls back to a logged-in `gh` CLI when the token route fails and
# dies naming what this environment is missing when neither works:
#   GITHUB_TOKEN / GH_TOKEN  (one, or a gh login)  GitHub token: contents, pull-requests, issues.
#   GITHUB_REPO              (optional)            owner/repo. Default: derived from `origin` (lib/gh.sh).
#   GITHUB_API_URL           (optional)            API base. Default: https://api.github.com.
#
# Usage:
#   .icm/scripts/new-run.sh <slug> --summary "<one plain sentence>" \
#       [--stub .icm/intake/<scope>/<feature>.md] [--steps "<steps to test>"] [--base main] \
#       [--lane bug|tweak|chore] [--title "<PR title — lane mode, default: the slug>"] [--dry-run]
#
#   With --lane, --stub may name a TRIAGE stub only (.icm/intake/triage/<name>.md — the parked
#   off-ticket finding the lane is picking up); scope-epic stubs still go through Define.
#
# Verdict (stdout, last line):
#   RESULT: CREATED   exit 0  — run committed, PR opened + labelled, run.md written/extended,
#                              stub consumed (if given). The PR URL is echoed above the verdict.
#   (--dry-run: stdout is the body and nothing else — no verdict line — so it can be piped.)
set -euo pipefail

command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }
command -v jq   >/dev/null || { echo "jq not found"   >&2; exit 1; }
command -v git  >/dev/null || { echo "git not found"  >&2; exit 1; }

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }

# --- args ------------------------------------------------------------------------------------------

slug=""; summary=""; stub=""; steps=""; base="main"; lane=""; title_flag=""; dry_run=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=1; shift ;;
    --summary) summary="${2:-}"; shift 2 ;;
    --stub)    stub="${2:-}"; shift 2 ;;
    --steps)   steps="${2:-}"; shift 2 ;;
    --base)    base="${2:-}"; shift 2 ;;
    --lane)    lane="${2:-}"; shift 2 ;;
    --title)   title_flag="${2:-}"; shift 2 ;;
    --*)       die "unknown flag: $1" ;;
    *)         [ -z "$slug" ] && slug="$1" || die "unexpected argument: $1"; shift ;;
  esac
done
[ -n "$slug" ]    || die "usage: new-run.sh <slug> --summary \"<one sentence>\" [--stub <path>] [--lane bug|tweak|chore] [--dry-run]"
[ -n "$summary" ] || die "--summary \"<one plain sentence>\" is required (the PR Summary — the one AI-authored line)"
case "$lane" in ""|bug|tweak|chore) : ;; *) die "--lane must be bug|tweak|chore, got: $lane" ;; esac
# A lane may consume a triage stub (the parking lane it exists to drain) — but never a scope-epic
# stub, which must go through Define so the spec and the Spec-approved gate exist.
if [ -n "$lane" ] && [ -n "$stub" ]; then
  case "$stub" in
    *.icm/intake/triage/*|.icm/intake/triage/*) : ;;
    *) die "--lane consumes only triage stubs (.icm/intake/triage/*) — scope-epic stubs go through /pipeline new" ;;
  esac
fi

run_dir="$repo_root/.icm/runs/$slug"
run_md="$run_dir/run.md"

spec=""
if [ -z "$lane" ]; then
  spec="$run_dir/02_define/output/spec.md"
  [ -f "$spec" ] || die "no spec at .icm/runs/$slug/02_define/output/spec.md — Define must write spec.md first"
fi

# Guard the "exactly one PR per run" rule: never open a second PR for a run that already has one.
# (A run.md written by Scope — story:/author:/personas: lines, no `- pr:` — is fine: we extend it.)
if [ -f "$run_md" ] && grep -Eq '^- pr:[[:space:]]*#?[0-9]+' "$run_md"; then
  die "run.md already records a PR for '$slug' — use 'revise $slug' to change the spec, not new-run.sh"
fi

# --- config from env (lib/gh.sh: GH_API, repo, gh_token + the curl→gh fallback) --------------------

# shellcheck source=lib/gh.sh
source "$here/lib/gh.sh"
# Preflight before any commit or push: a scaffold that dies here is cleanly re-runnable. A dry run
# touches nothing on GitHub, so it needs no credential.
[ "$dry_run" -eq 1 ] || gh_require "opening the PR"

git_c() { git -C "$repo_root" "$@"; }

# Push with bounded exponential backoff — network blips shouldn't fail the scaffold.
git_push() {
  local delay=2 attempt
  for attempt in 1 2 3 4; do
    if git_c push -u origin "$1"; then return 0; fi
    [ "$attempt" -lt 4 ] || break
    echo "  push failed (attempt $attempt) — retrying in ${delay}s" >&2
    sleep "$delay"; delay=$((delay * 2))
  done
  die "git push of '$1' failed after retries"
}

# --- branch ----------------------------------------------------------------------------------------
# Use the current branch; only fall back to creating one if we're on main/master or detached. A
# harness-named branch (cloud session, OpenCode, Actions) is accepted as the run branch and
# recorded in run.md below; the `claude/<slug>` fallback is for plain local use. This is the one
# place in the pipeline that names or creates a run branch (see the header).

branch="$(git_c rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "main" ] || [ "$branch" = "master" ] || [ "$branch" = "HEAD" ]; then
  branch="claude/$slug"
  if [ "$dry_run" -eq 1 ]; then
    echo "on $base/detached — a real run would create run branch $branch (dry run: not created)" >&2
  else
    echo "on $base/detached — creating run branch $branch" >&2
    git_c checkout -b "$branch"
  fi
else
  echo "on $branch — using it as the run branch (harness-named branches are accepted and recorded in run.md)" >&2
fi

# --- PR title + body -------------------------------------------------------------------------------

if [ -z "$lane" ]; then
  title="$(grep -m1 '^# ' "$spec" | sed -E 's/^#[[:space:]]+//; s/^Spec:[[:space:]]*//; s/[[:space:]]*$//')"
  [ -n "$title" ] || title="$slug"

  # The body is projected by project-body.sh — the one implementation shared with `revise <slug>`
  # (which re-projects it with --apply). It mirrors the template headings + both gate anchors and
  # the whole Acceptance criteria section unticked, and links (never embeds) spec.md on this branch.
  body_args=("$slug" --summary "$summary" --branch "$branch")
  [ -n "$steps" ] && body_args+=(--steps "$steps")
  body="$("$here/project-body.sh" "${body_args[@]}")" || die "project-body.sh failed — see above"
  draft=true
else
  title="${title_flag:-$slug}"
  [ -n "$steps" ] || steps=$'1. Open the preview URLs the lane reported (they build on the post-flip push; the lane hands over on a full-gate GREEN)\n2. Confirm the change described above, then squash-merge from GitHub — the merge button is the gate'

  # No Pipeline checklist and no gate anchor: nobody reads a checkbox on a lane PR — the human
  # merges from the GitHub UI once the smoke passes (.icm/_shared/github.md → fast-lane PRs).
  body="$(cat <<EOF
<!-- PIPELINE RUN (lane: ${lane}) — do not delete the markers; the pipeline reads them. -->

## Summary

${summary}

- slug: ${slug}

## Steps to test

${steps}
EOF
)"
  # Draft like the spine — the lane itself flips ready once its fix is settled (stub 9).
  draft=true
fi

# --- --dry-run: print the body, create nothing ------------------------------------------------------

if [ "$dry_run" -eq 1 ]; then
  echo "dry run — printing the ${lane:+$lane-lane }PR body for '$slug' (branch $branch, base $base); nothing created" >&2
  printf '%s\n' "$body"
  exit 0
fi

# --- commit the run (+ consume the stub) + push ----------------------------------------------------
# The stub is retired BEFORE the PR opens: if anything here fails, no PR exists yet and the run is
# cleanly re-runnable — an orphaned PR with a still-active stub was the old failure mode.

if [ -z "$lane" ]; then
  commit_msg="feat: $slug — define spec"
else
  commit_msg="chore: $slug — open $lane lane"
fi
git_c add ".icm/runs/$slug/"
if git_c diff --cached --quiet; then
  echo "run files already committed" >&2
else
  git_c commit -m "$commit_msg" >/dev/null
fi

if [ -n "$stub" ]; then
  stub_path="$stub"
  [ -f "$stub_path" ] || stub_path="$repo_root/$stub"
  [ -f "$stub_path" ] || die "--stub given but no file at: $stub"
  stub_dir="$(dirname "$stub_path")"
  done_dir="$stub_dir/_done"
  mkdir -p "$done_dir"
  feature_slug="$(basename "$stub_path" .md)"
  git_c mv "$stub_path" "$done_dir/$(basename "$stub_path")"
  git_c commit -m "chore: mark $feature_slug stub spun out" >/dev/null
  echo "marked stub consumed: $stub → $done_dir/" >&2
fi

git_push "$branch"

# --- open the PR -----------------------------------------------------------------------------------

payload="$(jq -n --arg title "$title" --arg head "$branch" --arg base "$base" --arg body "$body" \
  --argjson draft "$draft" '{title: $title, head: $head, base: $base, draft: $draft, body: $body}')"

# lib/gh.sh: curl with the token, else the gh CLI, else one die naming the missing credential.
resp="$(gh_api POST "/repos/${repo}/pulls" "$payload")" || exit 1

http="$(printf '%s' "$resp" | tail -n1)"
pr_body="$(printf '%s' "$resp" | sed '$d')"
if [ "$http" != "201" ]; then
  reason="$(printf '%s' "$pr_body" | jq -r '.errors[0].message // .message // empty' 2>/dev/null || true)"
  die "PR create returned HTTP $http — ${reason:-no message}"
fi
pr_number="$(printf '%s' "$pr_body" | jq -r '.number')"
pr_url="$(printf '%s' "$pr_body" | jq -r '.html_url')"
[ -n "$pr_number" ] && [ "$pr_number" != "null" ] || die "PR create returned no number"

# --- write / extend run.md (branch + pr pointers), commit, push ------------------------------------
# A front run already has a run.md (lane:/story:/author:/personas:/stubs: lines) — append,
# don't clobber.

mkdir -p "$run_dir"
if [ ! -f "$run_md" ]; then
  {
    echo "# Run: $slug"
    echo
    [ -n "$lane" ] && echo "- lane: $lane"
  } > "$run_md"
fi
grep -Eq '^- branch:' "$run_md" || echo "- branch: $branch" >> "$run_md"
grep -Eq '^- pr:'     "$run_md" || echo "- pr: #$pr_number" >> "$run_md"
git_c add ".icm/runs/$slug/run.md"
git_c diff --cached --quiet || git_c commit -m "chore: $slug — run pointers (branch + PR)" >/dev/null
git_push "$branch"

# --- labels ----------------------------------------------------------------------------------------

if [ -z "$lane" ]; then
  # Spine: full projection from spec.md (single source of truth for the label set). A label
  # failure must not orphan the just-opened PR — validate-spec.sh has already vetted the header,
  # and the CI labels job re-projects on the next push, so degrade to a loud warning.
  # The token (if any) is inherited from the environment; the child sources lib/gh.sh itself.
  GITHUB_REPO="$repo" GITHUB_API_URL="$GH_API" \
    "$here/project-labels.sh" "$slug" --stage define >&2 \
    || echo "WARNING: labels could not be projected onto PR #$pr_number — fix and re-run project-labels.sh (the PR itself is fine; CI re-projects on the next push)" >&2
else
  # Lane: just type:<lane> — no spec to project from.
  lresp="$(gh_api PUT "/repos/${repo}/issues/${pr_number}/labels" \
    "$(jq -n --arg l "type:$lane" '{labels: [$l]}')")" || exit 1
  lhttp="$(printf '%s' "$lresp" | tail -n1)"
  [ "$lhttp" = "200" ] || die "label write returned HTTP $lhttp (does 'type:$lane' exist? see .github/labels.yml)"
fi

# --- verdict ---------------------------------------------------------------------------------------

echo "run '$slug' created — branch: $branch, ${lane:+$lane lane }PR: $pr_url"
echo "RESULT: CREATED"
