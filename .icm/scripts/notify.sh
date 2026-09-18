#!/usr/bin/env bash
# notify.sh — the project's release notification hook (PROJECT-OWNED — seeded once, never synced).
#
# Release (and the lanes, when they announce) hand the one-line summary of what shipped to this
# script; what happens next is the project's own business — a Slack post, a Discord webhook, an
# email, or nothing at all because a CI workflow on the merge already announces. The template's
# copy is this stub: it prints the notes and exits 0, so a repo with no channel loses nothing.
# Wire it in this file, and say in `_shared/project-rules.md` which channel it reaches.
#
# Usage: .icm/scripts/notify.sh "<release notes summary>"
# Exit:  0 always — a notification is never a gate.
set -euo pipefail

RELEASE_NOTES="${1:-No release notes provided.}"

echo "=== Release Notification Hook ==="
echo "  Notes: $RELEASE_NOTES"

# Project-specific delivery goes here. Secrets come from the environment, never from a file.
# Example (Slack incoming webhook):
# if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
#   curl -sS -X POST -H 'Content-type: application/json' \
#     --data "$(jq -n --arg text "$RELEASE_NOTES" '{text: $text}')" "$SLACK_WEBHOOK_URL"
# fi

echo "RESULT: SENT"
exit 0
