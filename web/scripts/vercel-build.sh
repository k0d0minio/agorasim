#!/usr/bin/env bash
# vercel-build.sh — what Vercel runs to build `web/`: the `vercel-build` script in package.json,
# which Vercel prefers over `build`.
#
# Every non-production deployment runs against the UAT database `uat-agorasim` (estate decision
# D41; .icm/_shared/project-rules.md → The environments' databases): a PR's preview against its own
# Neon branch `preview/<git-branch>`, cut by the Vercel integration at deploy time, and the `uat`
# custom environment — where VERCEL_ENV is also `preview` — against that database's default
# branch. Neither carries this commit's schema, so before `next build` a preview applies the
# Drizzle journal to its own database and verifies that every entry landed (scripts/verify-migrations.ts: drizzle-kit
# reports success even when it skipped one).
#
# Production is untouched here. Its migrations reach the database through
# .github/workflows/db-migrate.yml, called by release.yaml when a promotion Release is published
# (D39) — the one production migrator — so the two never run against the same database at once. When Vercel does not expose VERCEL_ENV at all
# (Settings → Environment Variables → "Automatically expose System Environment Variables" off)
# this script cannot tell a preview from production and migrates nothing, and says so.
#
# The migrate step uses the direct connection when the integration provides one
# (DATABASE_URL_UNPOOLED); a migration through the pooler can hit transaction-mode limits.
# `next build` keeps reading DATABASE_URL exactly as before.
#
# CI is unaffected: .github/workflows/ci.yml runs `pnpm build`, never this script, and needs no
# database. Never run this locally — CI and Vercel are the verdict (AGENTS.md).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

case "${VERCEL_ENV:-}" in
  preview)
    if [ -z "${DATABASE_URL:-}" ]; then
      echo "[vercel-build] preview without DATABASE_URL — nothing to migrate; building only"
    else
      echo "[vercel-build] preview on ${VERCEL_GIT_COMMIT_REF:-?} — applying the Drizzle journal to this deployment's own database branch"
      DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" pnpm db:migrate
      DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" pnpm db:verify
    fi ;;
  production)
    echo "[vercel-build] production — migrations are db-migrate.yml's, at promotion; building only" ;;
  *)
    echo "[vercel-build] VERCEL_ENV is '${VERCEL_ENV:-unset}' — cannot tell a preview from production, so migrating nothing (expose the system environment variables in Vercel to enable it)" ;;
esac

pnpm build
