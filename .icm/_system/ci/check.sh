#!/usr/bin/env bash
# check.sh — the checks of the CI jobs icm-check and icm-gate-read. Only --gate in CI uses
# the network.
#
# Usage:
#   check.sh                    icm-check: verify _system/, the pointer files, and updates
#   check.sh --gate             the gate of Ready to merge (rc31). In CI it writes the commit
#                               status icm-gate and exits 0: pending (a wait, not a failure)
#                               until the tick, then success. A token with no status write
#                               (icm.yml of rc15): a check run. With no CI values: it prints
#                               the state, and exits 1 when the box is not ticked
#   check.sh --gate-report      the same as --gate. The icm.yml of rc15 uses this name
#   check.sh --write-manifest   write MANIFEST.sha256. Only Copier runs this, at a render
#
# icm-check fails when:
#   1. a file below .icm/_system/, a guard of .claude/hooks/ (rc18) or the answers
#      .icm/.copier-answers.yml (rc35) does not match MANIFEST.sha256, or is not in it
#   2. a pointer file does not point to .icm/_system/, or .claude/settings.json does not
#      register one of the three guards
#   3. a pull request changes .icm/_system/ or a guard and does not change
#      .icm/_system/VERSION, unless it changes an answer of .icm/.copier-answers.yml and
#      check 1 passes: the manifest proves the render of those answers (rc35)
#   4. a client request of .icm/requests/ breaks the form of features/requests.md
#      (1.0.0-rc27): check-request.sh names each fault
# The gate is the box below <!-- gate:ready-to-merge -->. A body with no such anchor
# passes: the gate is not required there. merge.sh refuses while the box is not ticked.
set -euo pipefail
# Copier runs --write-manifest in the folder that it renders. The CI jobs run in the repo.
[ "${1:-}" = --write-manifest ] || cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
sys=".icm/_system"
manifest="$sys/MANIFEST.sha256"
. "$sys/scripts/lib/gh.sh"

answers=".icm/.copier-answers.yml"
# The guards are in .claude/hooks/, because .claude/settings.json registers them there.
guards=".claude/hooks/block-local-checks.sh .claude/hooks/confirm-git-writes.sh .claude/hooks/guard-plaintext-secrets.sh"

files() {
  {
    find "$sys" -type f ! -name MANIFEST.sha256
    for g in $guards; do [ ! -f "$g" ] || echo "$g"; done
    [ ! -f "$answers" ] || echo "$answers"
  } | LC_ALL=C sort
}

if [ "${1:-}" = --write-manifest ]; then
  files | xargs -d '\n' sha256sum > "$manifest"
  echo "icm: wrote $manifest ($(wc -l < "$manifest") files)"
  exit 0
fi

if [ "${1:-}" = --gate ] || [ "${1:-}" = --gate-report ]; then
  if [ -n "${PR_BODY:-}" ]; then
    body="$PR_BODY"
  else
    body="$(jq -r '.pull_request.body // ""' "${GITHUB_EVENT_PATH:?no pull request event}")"
  fi
  state="$(printf '%s\n' "$body" | gate_state ready-to-merge)"
  case "$state" in
    yes) title="Ready to merge is ticked" ;;
    none) title="This pull request has no Ready to merge gate" ;;
    *) title="Waits for the operator's Ready to merge tick" ;;
  esac
  if [ -z "${GITHUB_REPOSITORY:-}" ] || [ -z "${HEAD_SHA:-}" ] || [ -z "${GH_TOKEN:-}" ]; then
    # No CI values: a read on this computer, or an icm.yml that is older than 1.0.0-rc31.
    echo "icm-gate: $title."
    [ "$state" != no ] && exit 0
    echo "icm-gate: the operator ticks it after the test. In CI, .github/workflows/icm.yml" \
      "of the blueprint 1.0.0-rc31 or later shows this as pending, not as a failure."
    exit 1
  fi
  url="https://github.com/${GITHUB_REPOSITORY}/pull/${PR_NUMBER:-}"
  [ "$state" = no ] && st=pending || st=success
  err="$(mktemp)"
  if gh api -X POST "repos/${GITHUB_REPOSITORY}/statuses/${HEAD_SHA}" -f context=icm-gate \
    -f state="$st" -f description="$title" -f target_url="$url" >/dev/null 2>"$err"; then
    echo "icm-gate: the commit status is $st. $title."
    exit 0
  fi
  # The token cannot write a commit status (icm.yml of rc15). A check run that is not
  # completed also shows as pending.
  echo "icm-gate: the commit status was not written ($(tail -n1 "$err")). A check run is next."
  if [ "$st" = pending ]; then
    set -- -f status=in_progress
  else
    set -- -f status=completed -f conclusion=success
  fi
  gh api -X POST "repos/${GITHUB_REPOSITORY}/check-runs" -f name=icm-gate -f head_sha="${HEAD_SHA}" \
    "$@" -f details_url="$url" -f "output[title]=$title" \
    -f "output[summary]=The operator ticks Ready to merge after the test. Until the tick this check waits. It is not a failure." \
    >/dev/null || { echo "icm-gate: the check run icm-gate was not written. Give the job statuses: write"; exit 1; }
  echo "icm-gate: the check run is $st. $title."
  exit 0
fi

faults=0
fault() {
  echo "icm-check: $*"
  faults=$((faults + 1))
}

# 1. The folder matches the manifest.
rendered=no
if [ ! -f "$manifest" ]; then
  fault "$manifest is missing. Render the blueprint again"
else
  sha256sum --quiet -c "$manifest" >/dev/null 2>&1 \
    || fault "a file below $sys/ or a guard of .claude/hooks/ was changed in this repo. They belong to the blueprint: $(sha256sum -c "$manifest" 2>/dev/null | grep -v ': OK$' | head -n 5 | tr '\n' ' ')"
  extra="$(comm -13 <(sed -E 's/^[0-9a-f]+  //' "$manifest" | LC_ALL=C sort) <(files))"
  [ -z "$extra" ] || fault "files below $sys/ that the blueprint did not write: $(tr '\n' ' ' <<<"$extra")"
  [ "$faults" -gt 0 ] || ! grep -qF "  $answers" "$manifest" || rendered=yes
fi

# 2. The pointer files point to _system/.
pointer() {
  if [ ! -f "$1" ]; then
    fault "the pointer file $1 is missing"
  elif ! grep -qF -- "$2" "$1"; then
    fault "$1 must contain: $2"
  fi
}
pointer CLAUDE.md '@.icm/_system/ROUTER.md'
pointer .claude/settings.json '.icm/_system/hooks/dispatch.sh'
pointer .claude/skills/pipeline/SKILL.md '.icm/_system/ROUTER.md'
pointer .claude/agents/review-shots.md '.icm/_system/agents/review-shots/CONTEXT.md'
pointer .github/workflows/icm.yml '.icm/_system/ci/check.sh'
for g in $guards; do pointer .claude/settings.json "$g"; done

# 3. In a pull request, a change of _system/ comes only with a new version.
if [ -n "${GITHUB_BASE_REF:-}" ]; then
  # shellcheck disable=SC2086  # the list of the guards is three words
  changed="$(git diff --name-only "origin/${GITHUB_BASE_REF}...HEAD" -- "$sys" $guards 2>/dev/null || true)"
  if [ -n "$changed" ] && ! grep -qxF "$sys/VERSION" <<<"$changed"; then
    answer="$(git diff -U0 "origin/${GITHUB_BASE_REF}...HEAD" -- "$answers" 2>/dev/null | grep -E '^[+-][a-z]' || true)"
    if [ -z "$answer" ]; then
      fault "this pull request changes $sys/ or a guard of .claude/hooks/, and not $sys/VERSION or an answer of $answers. Only a blueprint update changes them"
    elif [ "$rendered" != yes ]; then
      fault "this pull request changes an answer of $answers, and $sys/ is not the render of those answers (check 1). Run blueprint/bin/update-repo.sh with --data"
    else
      echo "icm-check: an answer change at the same version: $(sed 's/^[+-]//' <<<"$answer" | sort -u | tr '\n' ' ')"
    fi
  fi
fi

# 4. Each client request has the form of features/requests.md (1.0.0-rc27).
if compgen -G ".icm/requests/REQ-*.md" >/dev/null; then
  out="$(bash "$sys/scripts/check-request.sh" .icm/requests/REQ-*.md 2>&1)" \
    || fault "a client request breaks the form of $sys/features/requests.md: $(grep '^fault:' <<<"$out" | tr '\n' ' ')"
fi

# 5. The setup gaps that a file shows (rc36): a warning, never a fault.
bash "$sys/scripts/setup.sh" --offline 2>/dev/null | sed -n 's/^missing  /::warning::setup gap /p' || true
if [ "$faults" -gt 0 ]; then
  echo "icm-check: $faults fault(s)."
  exit 1
fi
echo "icm-check: OK. Blueprint $(cat "$sys/VERSION")."
