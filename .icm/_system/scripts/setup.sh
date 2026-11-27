#!/usr/bin/env bash
# setup.sh — the setup helper and the gap monitor (1.0.0-rc36). The contract is
# .icm/_system/features/setup.md. The items are .icm/_system/setup/items.json.
#
# Usage:
#   setup.sh             each item: done, missing (owner and fix), or not checked
#   setup.sh --next      a new repo: the next item of a session (S), then the items of others
#   setup.sh --gate      the monitor: only the blocking items. A missing one: "RESULT: STOP"
#                        and exit 1. A pass is kept one hour in .git (the same VERSION)
#   --offline            no gh and no keyring: those items are "not checked"
# An item with no probe reads its tick in .icm/setup/checklist.md (one of rc36 or later: the
# ids). A probe that cannot run
# says "not checked" and never blocks. The script never prints a secret value.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$here/lib/project.sh"
. "$here/lib/gh.sh"
help_if_asked "$@"
mode=report off=0
for a in "$@"; do
  case "$a" in --gate) mode=gate ;; --next) mode=next ;; --offline) off=1 ;; *) stop "unknown argument $a" ;; esac
done
need jq
cd "$(icm_root)"
list=.icm/_system/setup/items.json checklist=.icm/setup/checklist.md
[ -f "$list" ] || { echo "RESULT: OK no setup list in this render"; exit 0; }
stamp="$(git rev-parse --git-path icm-setup-gate 2>/dev/null || echo /nonexistent)"
if [ "$mode" = gate ] && [ "$(cat "$stamp" 2>/dev/null)" = "$(cat .icm/_system/VERSION)" ] \
  && [ -n "$(find "$stamp" -mmin -60 2>/dev/null)" ]; then
  echo "RESULT: OK setup: no blocking gap (checked in the last hour)"; exit 0
fi
repo="" kr="${BAXTER_BIN:-$HOME/baxter_live/system/bin}/baxter_secret.sh"
[ "$off" = 1 ] || ! command -v gh >/dev/null 2>&1 || repo="$(gh_repo 2>/dev/null || true)"

# gh_get <path>: 0 and the body, 4 for HTTP 404 (missing), 3 when it cannot run.
gh_get() {
  local out
  [ -n "$repo" ] || return 3
  out="$(timeout 15 gh api "${1//\{repo\}/$repo}" 2>&1)" && { printf '%s' "$out"; return 0; }
  case "$out" in *"HTTP 404"*) return 4 ;; *) return 3 ;; esac
}
# probe <id> <type> [args]: prints done, missing or unchecked. The paths of file and grep are
# glob patterns (apps/*/app/layout.tsx): the shell expands them, and one match is enough (1.0.0-rc39).
probe() {
  local id="$1" t="${2:-}" f n rc=0 got
  shift 2 2>/dev/null || shift
  case "$t" in
    "") grep -qF '`close.acts`' "$checklist" 2>/dev/null || { echo unchecked; return; }  # a list of rc35 or older
      grep -qE "^- \[[xX]\] .*\`$id\`$" "$checklist" && echo done || echo missing ;;
    file) for f in $1; do [ ! -e "$f" ] || { echo done; return; }; done; echo missing ;;
    grep) for f in $1; do ! grep -qF -- "$2" "$f" 2>/dev/null || { echo done; return; }; done; echo missing ;;
    nogrep) [ -e "$1" ] || { echo missing; return; }; grep -rqF -- "$2" "$1" && echo missing || echo done ;;
    jq) jq -e "$2" "$1" >/dev/null 2>&1 && echo done || echo missing ;;
    pkg) pkg_all_have "$1" "${2:-}" >/dev/null && echo done || echo missing ;;
    acts) [ -f "$1" ] && ! grep -q '^- \[ \]' "$1" && echo done || echo missing ;;
    api) got="$(gh_get "$1")" || rc=$?
      case "$rc" in 0) [ -z "${2:-}" ] || jq -e "$2" <<<"$got" >/dev/null 2>&1 || { echo missing; return; }; echo done ;;
        4) echo missing ;; *) echo unchecked ;; esac ;;
    secret) for n in "$@"; do
        case "$n" in var:*) gh_get "repos/{repo}/actions/variables/${n#var:}" >/dev/null || rc=$? ;;
          *) gh_get "repos/{repo}/actions/secrets/$n" >/dev/null || rc=$? ;; esac
        [ "$rc" = 0 ] || break
      done
      case "$rc" in 0) echo done ;; 4) echo missing ;; *) echo unchecked ;; esac ;;
    keyring) n="$2"
      [ "${n#var:}" = "$n" ] || n="$(gh_get "repos/{repo}/actions/variables/${n#var:}" | jq -r '.value // empty' 2>/dev/null || true)"
      { [ "$off" = 0 ] && [ -x "$kr" ] && [ -n "$n" ]; } || { echo unchecked; return; }
      "$kr" accounts "$1" 2>/dev/null | grep -qxF -- "$n" && echo done || echo missing ;;
    rules) got="$(gh_get "repos/{repo}/rules/branches/$(default_branch)")" || { echo unchecked; return; }
      got="$(jq -r '.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context' <<<"$got"
        gh_get "repos/{repo}/branches/$(default_branch)/protection/required_status_checks" | jq -r '.contexts[]?' 2>/dev/null)"
      for n in "$@"; do grep -qxF -- "$n" <<<"$got" || { echo missing; return; }; done; echo done ;;
    *) echo unchecked ;;
  esac
}

sel='.[]'
[ "$mode" != gate ] || sel='.[] | select(.block)'
done_n=0 miss=() blocks=() unchecked=() next=""
while IFS= read -r item; do
  id="$(jq -r .id <<<"$item")"
  mapfile -t args < <(jq -r '.probe[]' <<<"$item")
  state="$(probe "$id" "${args[@]}")"
  line="$(jq -r '"[\(.owner)] \(.id): \(.fix)"' <<<"$item")"
  case "$state" in
    done) done_n=$((done_n + 1)) ;;
    unchecked) unchecked+=("$line") ;;
    *) miss+=("$line$(jq -r 'if .block then " (BLOCKS work)" else "" end' <<<"$item")")
      [ "$(jq -r .block <<<"$item")" = false ] || blocks+=("$id: $(jq -r .fix <<<"$item")")
      [ -n "$next" ] || [ "$(jq -r .owner <<<"$item")" != S ] || next="$(jq -r '"\(.id): \(.text)\n  fix: \(.fix)"' <<<"$item")" ;;
  esac
done < <(jq -c "$sel" "$list")

if [ "$mode" = gate ]; then
  [ "${#blocks[@]}" -eq 0 ] || { echo "RESULT: STOP setup gap ${blocks[0]} (all gaps: .icm/_system/scripts/setup.sh)"; exit 1; }
  [ "${#unchecked[@]}" -gt 0 ] || [ ! -d "$(dirname "$stamp")" ] || cat .icm/_system/VERSION > "$stamp"
  echo "RESULT: OK setup: no blocking gap, ${#unchecked[@]} not checked"; exit 0
fi
echo "setup of $(pj .slug), blueprint $(cat .icm/_system/VERSION): $done_n done, ${#miss[@]} missing, ${#unchecked[@]} not checked"
if [ "$mode" = next ]; then
  echo "next for the session: ${next:-none. Each item of a session is done.}"
  printf 'for the operator or BAXTER: %s\n' "${miss[@]}" | grep -v '\[S\]' || true
else
  [ "${#miss[@]}" -eq 0 ] || printf 'missing  %s\n' "${miss[@]}"
  [ "${#unchecked[@]}" -eq 0 ] || printf 'not checked  %s\n' "${unchecked[@]}"
fi
[ "${#blocks[@]}" -eq 0 ] && echo "RESULT: OK ${#miss[@]} gap(s), none blocks" || echo "RESULT: GAPS ${#blocks[@]} blocking: ${blocks[0]}"
