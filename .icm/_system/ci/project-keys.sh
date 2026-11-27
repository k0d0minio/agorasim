#!/usr/bin/env bash
# project-keys.sh — a Copier task (1.0.0-rc30, JAM-609; it replaces requests.sh of rc27).
# An update does not write .icm/project.json again (_skip_if_exists). This task adds each
# key of the template file .icm/_system/templates/project.json that the repo file does not
# have, at each level. It does not change a value that exists. A first render changes
# nothing: the two files are the same.
set -euo pipefail
pj=".icm/project.json"
tpl=".icm/_system/templates/project.json"
[ -f "$pj" ] && [ -f "$tpl" ] || exit 0
command -v jq >/dev/null 2>&1 || { echo "icm: no jq. Add each missing key of $tpl to $pj by hand"; exit 0; }
jq -e . "$pj" >/dev/null 2>&1 || { echo "icm: $pj is not valid JSON. No key is added"; exit 0; }
# The missing paths: a path of the template whose parent exists in the repo file, as an
# object, and that the repo file does not have.
missing="$(jq -r --slurpfile t "$tpl" '
  . as $r | [$t[0] | paths] | map(select(
    (.[:-1] as $p | ($r | getpath($p) | type) == "object")
    and (. as $p | ($r | getpath($p[:-1]) | has($p[-1])) | not)
  )) | map(map(tostring) | join(".")) | join(" ")' "$pj")"
[ -n "$missing" ] || exit 0
tmp="$(mktemp)"
# $t * $r: the objects merge at each level, and each value of the repo file wins.
# cat, not mv: the file keeps its mode.
jq --indent 2 --slurpfile t "$tpl" '$t[0] * .' "$pj" > "$tmp" \
  || { rm -f "$tmp"; echo "icm: the merge failed. $pj did not change"; exit 0; }
cat "$tmp" > "$pj"
rm -f "$tmp"
echo "icm: added the keys $missing to $pj"
