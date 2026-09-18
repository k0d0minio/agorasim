#!/usr/bin/env bash
# env-check.sh — pre-flight environment and dependency check for the pipeline (TEMPLATE-OWNED).
#
# Run it at the start of a session, or whenever a pipeline script dies on something that is not
# the run: it says in one pass whether this machine (or cloud session, or Actions runner) can
# drive the pipeline at all — the binaries the scripts call, a GitHub route (token or `gh`
# login), the project's own required variables (`.icm/project.json` → required_env), the
# folder shape, the executable bits, the locale.
#
# It REPORTS, it does not repair — the estate's standing rule for every check. The one repair it
# knows how to make, the executable bit on `.icm/scripts/*.sh`, is behind `--fix`; without the
# flag a missing bit is a WARN line and nothing changes. `scripts/lib/*.sh` are sourced, not run,
# and are deliberately not executable — they are never counted.
#
# Usage: .icm/scripts/env-check.sh [--fix]
# Verdict (stdout, last line):
#   RESULT: PASS   exit 0  — no critical error (warnings are listed above it)
#   RESULT: FAIL   exit 1  — at least one critical error: a missing binary or a missing folder
set -euo pipefail

FIX=0
for arg in "$@"; do
  case "$arg" in
    --fix) FIX=1 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown argument: $arg (usage: env-check.sh [--fix])" >&2; exit 2 ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

echo "=== ICM Pipeline Pre-Flight Environment Check ==="

ERRORS=0
WARNINGS=0
ok()   { echo "  [OK] $*"; }
info() { echo "  [INFO] $*"; }
warn() { echo "  [WARN] $*"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo "  [FAIL] $*"; ERRORS=$((ERRORS + 1)); }

# 1. Critical binaries — every pipeline script needs bash, git, jq and curl; the sync and the
#    conformance tooling need rsync. rg is recommended (the contracts suggest it for searches)
#    but no script calls it, so its absence is a warning, not a failure.
echo "[1/6] Checking Critical System Tooling..."
for tool in bash git rsync jq curl; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "Binary found: $tool"
  else
    fail "Missing required binary: $tool"
  fi
done
if command -v rg >/dev/null 2>&1; then
  ok "Binary found: rg (recommended)"
else
  warn "rg (ripgrep) not found in PATH — recommended for searches; no pipeline script needs it"
fi

# 2. A GitHub route — a token in the environment, or a logged-in `gh` CLI (lib/gh.sh takes
#    either, in that order). Neither is a WARN; one is enough.
echo "[2/6] Checking GitHub CLI & Authentication..."
if command -v gh >/dev/null 2>&1; then
  ok "Binary found: gh (GitHub CLI)"
else
  info "GitHub CLI (gh) not found in PATH — the scripts fall back to curl with a token"
fi
if [ -n "${GH_TOKEN:-}" ] || [ -n "${GITHUB_TOKEN:-}" ]; then
  ok "GitHub token present in environment (GITHUB_TOKEN or GH_TOKEN)"
elif command -v gh >/dev/null 2>&1 && env -u GITHUB_TOKEN -u GH_TOKEN gh auth status >/dev/null 2>&1; then
  ok "No token in the environment, but gh is logged in — lib/gh.sh will use the CLI route"
else
  warn "No GitHub route: neither GITHUB_TOKEN/GH_TOKEN set nor a logged-in gh CLI (export a token, or run: gh auth login)"
fi

# 3. The project manifest and the variables it says this repo needs.
echo "[3/6] Checking Project Manifest & Required Environment (.icm/project.json)..."
if [ -f ".icm/project.json" ]; then
  if command -v jq >/dev/null 2>&1 && jq -e . .icm/project.json >/dev/null 2>&1; then
    ok ".icm/project.json parses"
    name="$(jq -r '.name // empty' .icm/project.json)"
    profile="$(jq -r '.profile // empty' .icm/project.json)"
    [ -n "$name" ]    && ok "name: $name"    || warn ".icm/project.json has no \"name\""
    [ "$profile" = "pipeline" ] && ok "profile: pipeline" || warn ".icm/project.json profile is \"${profile:-unset}\" (expected \"pipeline\")"
    REQ_ENVS="$(jq -r '.required_env[]?' .icm/project.json 2>/dev/null || true)"
    if [ -n "$REQ_ENVS" ]; then
      for var in $REQ_ENVS; do
        if [ -n "${!var:-}" ]; then
          ok "Required environment variable set: $var"
        else
          warn "Missing required environment variable: $var"
        fi
      done
    else
      info "No required_env variables declared in .icm/project.json"
    fi
  else
    fail ".icm/project.json is not valid JSON (or jq is missing)"
  fi
else
  warn ".icm/project.json not found — the scripts run on defaults; seed it with icm-check.sh --fix"
fi

# 4. The folder shape the profile promises, and the profile line the tooling keys on.
echo "[4/6] Checking Local ICM Directory Integrity..."
if [ -d ".icm" ]; then
  ok "Local .icm directory present"
  for sub in stages lanes _shared scripts; do
    if [ -d ".icm/$sub" ]; then
      ok "Subdirectory present: .icm/$sub"
    else
      fail "Missing expected subdirectory: .icm/$sub"
    fi
  done
  if grep -qE '^- *profile: *pipeline' .icm/CONTEXT.md 2>/dev/null; then
    ok ".icm/CONTEXT.md declares '- profile: pipeline'"
  else
    warn ".icm/CONTEXT.md does not declare '- profile: pipeline' — icm-check.sh and icm-sync.sh will not treat this repo as a pipeline repo"
  fi
else
  fail "Current directory lacks an .icm folder"
fi

# 5. Executable bits on the scripts a stage invokes. lib/ is sourced and excluded on purpose.
echo "[5/6] Checking Script Execution Permissions..."
if [ -d ".icm/scripts" ]; then
  NON_EXEC="$(find .icm/scripts -maxdepth 1 -name '*.sh' ! -executable 2>/dev/null | sort || true)"
  if [ -n "$NON_EXEC" ]; then
    n="$(printf '%s\n' "$NON_EXEC" | wc -l | tr -d ' ')"
    if [ "$FIX" -eq 1 ]; then
      # shellcheck disable=SC2086
      chmod +x $NON_EXEC
      ok "$n script(s) in .icm/scripts lacked +x — fixed (--fix): $(printf '%s' "$NON_EXEC" | tr '\n' ' ')"
    else
      warn "$n script(s) in .icm/scripts lack +x (re-run with --fix to set it): $(printf '%s' "$NON_EXEC" | tr '\n' ' ')"
    fi
  else
    ok "All scripts in .icm/scripts possess executable permissions"
  fi
fi

# 6. A UTF-8 locale — the contracts and the decision regexes carry non-ASCII punctuation.
echo "[6/6] Checking System Locale & Encoding..."
if [[ "${LC_ALL:-${LC_CTYPE:-${LANG:-}}}" =~ UTF-8|utf8|UTF8 ]]; then
  ok "UTF-8 locale in effect (${LC_ALL:-${LC_CTYPE:-$LANG}})"
else
  warn "No UTF-8 locale in effect (LANG='${LANG:-unset}') — any UTF-8 locale is fine, e.g. C.UTF-8"
fi

echo "-------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "=== Environment Check PASSED ($WARNINGS warnings) ==="
  echo "RESULT: PASS"
  exit 0
else
  echo "=== Environment Check FAILED ($ERRORS critical errors, $WARNINGS warnings) ==="
  echo "RESULT: FAIL"
  exit 1
fi
