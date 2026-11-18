#!/usr/bin/env bash
# db.sh — migrate one database, or reset the shared preview database.
# Only CI runs it. The contract is .icm/_system/features/database.md.
#
# Usage:
#   db.sh migrate   run db:migrate, then db:verify, against DATABASE_URL. Needs the
#                   dependencies installed. With REQUIRED=true an empty DATABASE_URL stops.
#                   With REQUIRED not true it is a skip: a pull request from a fork or from
#                   Dependabot gets no secret
#   db.sh reset     empty DATABASE_URL (the preview database): drop each schema of the
#                   owner. Then, when SOURCE_DATABASE_URL (UAT) is set, copy it into
#                   DATABASE_URL. Needs pg_dump and psql
#
# A migration needs a direct connection, not a pooled one. Migrations go forward only.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$here/lib/project.sh"

case "${1:-}" in
migrate)
  . "$here/lib/node.sh"
  need jq
  if [ -z "${DATABASE_URL:-}" ]; then
    [ "${REQUIRED:-}" != true ] || stop "DATABASE_URL is not set: nothing can migrate"
    echo "::warning::db.sh: DATABASE_URL is not set for this run: the database did not change"
    exit 0
  fi
  node_has db:migrate || { echo "db.sh: package.json names no db:migrate: nothing to migrate"; exit 0; }
  node_run db:migrate
  node_run db:verify
  echo "RESULT: OK migrated"
  ;;
reset)
  need pg_dump psql
  [ -n "${DATABASE_URL:-}" ] || stop "DATABASE_URL (the preview database) is not set"
  [ "${DATABASE_URL}" != "${SOURCE_DATABASE_URL:-}" ] || stop "the preview database and the source are the same"
  psql -v ON_ERROR_STOP=1 -q "$DATABASE_URL" <<'SQL'
DO $$ DECLARE s text; BEGIN
  FOR s IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg\_%'
      AND nspname <> 'information_schema'
      AND pg_get_userbyid(nspowner) IN (current_user, 'pg_database_owner') LOOP
    EXECUTE format('DROP SCHEMA %I CASCADE', s);
  END LOOP;
  CREATE SCHEMA IF NOT EXISTS public;
END $$;
SQL
  echo "db.sh: the preview database is empty"
  if [ -n "${SOURCE_DATABASE_URL:-}" ]; then
    # The schema public exists already. A dump of a newer server can create it again.
    pg_dump --no-owner --no-privileges "$SOURCE_DATABASE_URL" | sed '/^CREATE SCHEMA public;$/d' \
      | psql -v ON_ERROR_STOP=1 -q "$DATABASE_URL"
    echo "db.sh: the preview database is a copy of UAT"
  fi
  echo "RESULT: OK reset"
  ;;
*) stop "usage: db.sh migrate | reset" ;;
esac
