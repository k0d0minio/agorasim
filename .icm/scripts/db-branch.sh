#!/usr/bin/env bash
# db-branch.sh — bind a run to its own database: one schema, or one local container, per run (TEMPLATE-OWNED).
#
# Runs are built in parallel, each in its own worktree on its own branch (`_shared/stage-preamble.md`
# → Run-scoped isolation). What that rule does not cover on its own is the database: two runs whose
# migrations both land on the one development database write over each other exactly the way two
# runs in one checkout would. This script gives each run a database of its own, named after the
# slug like everything else the run owns, so a migration applied while building `csv-export` is
# applied to `run_csv_export` and nowhere else.
#
# What "its own" means is the repo's call, in `.icm/project.json` → `database` (lib/project.sh):
#   isolation: none       the default — no isolated database; every verb says SKIP and stops.
#   isolation: schema     one Postgres SCHEMA per run — `run_<slug>` on the database named by the
#                         variable `url_env` (default DATABASE_URL). Needs `psql` and that variable.
#   isolation: container  one local Postgres CONTAINER per run — `icm-db-<slug>` from `image`
#                         (default postgres:16) with database `name` (default app), on a port the
#                         engine picks, bound to 127.0.0.1. Needs `docker` (or `podman`). The
#                         password is generated at `up` and read back from the container at `env`;
#                         it is never written anywhere in the repo.
#
# Verbs:
#   status  (default)  what this run is bound to and whether it exists right now.
#   up                 create the schema / start the container (idempotent), and record ONE pointer
#                      line in the run's `run.md` — `- db: schema run_<slug> (via $DATABASE_URL)` —
#                      naming the variable, never its value.
#   env                print the `export` lines a shell evals to work inside the run's database:
#                      `eval "$(.icm/scripts/db-branch.sh <slug> env)"`. ONLY the exports go to
#                      stdout (so the eval is clean); everything else, the verdict included, goes to
#                      stderr. Nothing is written to disk.
#   down               drop the schema (CASCADE) / remove the container, and remove the pointer
#                      line. Refuses any name that is not `run_*` / `icm-db-*` — it only ever drops
#                      what `up` made.
#
# It adopts a run, it never makes one: the slug must already be a live run (`.icm/runs/<slug>/`),
# the way every adopting stage resolves it (`resolve-run.sh`). Nothing here reaches outside the
# repo except the database engine itself. It never runs a migration — the repo's own migration
# tool does that, pointed at the run by `env`. Production is never a target: the variable it reads
# is the development one the repo names.
#
# Usage: .icm/scripts/db-branch.sh <slug> [status|up|env|down]
# Verdict (stdout, last line — stderr for `env`):
#   RESULT: BOUND      exit 0  — the run's database exists (after `up`, or found by `status`)
#   RESULT: ABSENT     exit 0  — `status`: nothing bound yet (run `up`)
#   RESULT: ENV        exit 0  — `env` printed the exports (on stderr, so `eval` sees only the exports)
#   RESULT: RELEASED   exit 0  — `down` removed the run's database (or found none)
#   RESULT: SKIP       exit 0  — isolation is `none`, or the engine/variable this mode needs is missing
#   (exit 1: usage, no such run, the engine refused)
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"
die() { echo "error: $*" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || die "jq not found"

# shellcheck source=lib/project.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/project.sh"

slug=""; verb="status"
while [ $# -gt 0 ]; do
  case "$1" in
    status|up|env|down) verb="$1"; shift ;;
    -h|--help) sed -n '2,45p' "${BASH_SOURCE[0]}"; exit 0 ;;
    --*) die "unknown flag: $1" ;;
    *) [ -z "$slug" ] && slug="$1" || die "unexpected argument: $1"; shift ;;
  esac
done
[ -n "$slug" ] || die "usage: db-branch.sh <slug> [status|up|env|down]"
printf '%s' "$slug" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || die "slug '$slug' is not kebab-case"
[ -d ".icm/runs/$slug" ] || die "no live run .icm/runs/$slug/ — db-branch adopts a run, it never creates one (resolve-run.sh $slug first)"
run_md=".icm/runs/$slug/run.md"

# `env` keeps stdout for the exports alone; every other line of every verb goes through here.
say() { if [ "$verb" = "env" ]; then echo "$*" >&2; else echo "$*"; fi; }
verdict() { say "RESULT: $1"; exit "${2:-0}"; }

isolation="$(database_isolation)"
url_env="$(database_url_env)"
image="$(database_image)"
dbname="$(database_name)"

schema="run_$(printf '%s' "$slug" | tr '-' '_')"
schema="${schema:0:63}"                                 # a Postgres identifier is at most 63 bytes
container="icm-db-$slug"
pointer_schema="- db: schema $schema (via \$$url_env)"
pointer_container="- db: container $container ($image, database $dbname)"

record_pointer() { # <line>
  [ -f "$run_md" ] || return 0
  grep -qxF -- "$1" "$run_md" || printf '%s\n' "$1" >> "$run_md"
}
remove_pointer() {
  [ -f "$run_md" ] || return 0
  if grep -q '^- db: ' "$run_md"; then
    tmp="$(mktemp)"; grep -v '^- db: ' "$run_md" > "$tmp" || true; cat "$tmp" > "$run_md"; rm -f "$tmp"
  fi
}

say "run:        $slug"
say "isolation:  $isolation  (.icm/project.json → database.isolation)"

case "$isolation" in
  none)
    say "no isolated database is declared for this repo — migrations run against the shared development database, or not at all in a session"
    say "(declare database.isolation as \"schema\" or \"container\" in .icm/project.json to bind one per run)"
    verdict SKIP ;;

  schema)
    say "schema:     $schema  on the database named by \$$url_env"
    command -v psql >/dev/null 2>&1 || { say "psql not found — schema isolation needs the Postgres client (brew install libpq / apt install postgresql-client)"; verdict SKIP; }
    url="${!url_env:-}"
    [ -n "$url" ] || { say "\$$url_env is unset in this environment — nothing to bind to (env.sh pull, or export it)"; verdict SKIP; }
    psql_q() { psql "$url" -X -q -v ON_ERROR_STOP=1 -At "$@"; }
    exists() { [ "$(psql_q -c "SELECT 1 FROM information_schema.schemata WHERE schema_name = '$schema'" 2>/dev/null || true)" = "1" ]; }
    case "$verb" in
      status)
        if exists; then say "state:      present"; verdict BOUND; else say "state:      absent — run: .icm/scripts/db-branch.sh $slug up"; verdict ABSENT; fi ;;
      up)
        psql_q -c "CREATE SCHEMA IF NOT EXISTS \"$schema\"" >/dev/null || die "could not create schema $schema (is \$$url_env a Postgres URL this role may create schemas on?)"
        record_pointer "$pointer_schema"
        say "state:      present (created if it was not)"
        say "next:       eval \"\$(.icm/scripts/db-branch.sh $slug env)\"   then run the repo's migrations inside it"
        verdict BOUND ;;
      env)
        exists || say "note: schema $schema does not exist yet — run \`up\` first; the exports below are still correct"
        sep='?'; case "$url" in *\?*) sep='&' ;; esac
        # libpq (psql, node-postgres, Drizzle over pg) honour `options`; Prisma reads `schema=`.
        printf 'export ICM_DB_SCHEMA=%q\n' "$schema"
        printf 'export PGOPTIONS=%q\n' "-c search_path=$schema"
        printf 'export %s=%q\n' "$url_env" "${url}${sep}options=-c%20search_path%3D${schema}"
        printf 'export ICM_DB_URL_PRISMA=%q\n' "${url}${sep}schema=${schema}"
        verdict ENV ;;
      down)
        case "$schema" in run_*) ;; *) die "refusing to drop '$schema' — only a run_* schema made by up" ;; esac
        psql_q -c "DROP SCHEMA IF EXISTS \"$schema\" CASCADE" >/dev/null || die "could not drop schema $schema"
        remove_pointer
        say "state:      dropped"
        verdict RELEASED ;;
    esac ;;

  container)
    engine=""
    for e in docker podman; do command -v "$e" >/dev/null 2>&1 && { engine="$e"; break; }; done
    say "container:  $container  ($image, database $dbname)"
    [ -n "$engine" ] || { say "neither docker nor podman found — container isolation needs one"; verdict SKIP; }
    running() { [ "$("$engine" inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo false)" = "true" ]; }
    present() { "$engine" inspect "$container" >/dev/null 2>&1; }
    port_of() { "$engine" port "$container" 5432/tcp 2>/dev/null | head -1 | sed -E 's/.*:([0-9]+)$/\1/'; }
    pw_of()   { "$engine" inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" 2>/dev/null | sed -n 's/^POSTGRES_PASSWORD=//p' | head -1; }
    case "$verb" in
      status)
        if running; then say "state:      running on 127.0.0.1:$(port_of)"; verdict BOUND
        elif present; then say "state:      present but stopped — run: $engine start $container (or \`down\` then \`up\`)"; verdict ABSENT
        else say "state:      absent — run: .icm/scripts/db-branch.sh $slug up"; verdict ABSENT; fi ;;
      up)
        if present && ! running; then "$engine" start "$container" >/dev/null || die "could not start $container"; fi
        if ! present; then
          pw="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
          "$engine" run -d --name "$container" --label "icm.run=$slug" \
            -e POSTGRES_PASSWORD="$pw" -e POSTGRES_DB="$dbname" -p 127.0.0.1::5432 "$image" >/dev/null \
            || die "could not start $container from $image"
        fi
        i=0
        until "$engine" exec "$container" pg_isready -U postgres >/dev/null 2>&1; do
          i=$((i + 1)); [ "$i" -le 30 ] || die "$container did not become ready in 30s ($engine logs $container)"
          sleep 1
        done
        record_pointer "$pointer_container"
        say "state:      running on 127.0.0.1:$(port_of)"
        say "next:       eval \"\$(.icm/scripts/db-branch.sh $slug env)\"   then run the repo's migrations inside it"
        verdict BOUND ;;
      env)
        running || { say "$container is not running — run \`up\` first"; verdict SKIP; }
        url="postgres://postgres:$(pw_of)@127.0.0.1:$(port_of)/$dbname"
        printf 'export ICM_DB_CONTAINER=%q\n' "$container"
        printf 'export %s=%q\n' "$url_env" "$url"
        printf 'export ICM_DB_URL_PRISMA=%q\n' "$url"
        verdict ENV ;;
      down)
        case "$container" in icm-db-*) ;; *) die "refusing to remove '$container'" ;; esac
        if present; then "$engine" rm -f "$container" >/dev/null || die "could not remove $container"; say "state:      removed"; else say "state:      absent"; fi
        remove_pointer
        verdict RELEASED ;;
    esac ;;
esac
