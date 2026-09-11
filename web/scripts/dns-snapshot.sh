#!/usr/bin/env bash
# dns-snapshot.sh — print the agorasim.pt zone as a sorted, diffable list.
#
# Runbook use (.icm/docs/launch-runbook.md § Track T / G):
#   web/scripts/dns-snapshot.sh > before.txt              # live zone, via DNS-over-HTTPS
#   web/scripts/dns-snapshot.sh --ns ns1.example.pt > mirror.txt   # the pre-created zone,
#                                                          # asked directly (needs `dig`)
#   diff before.txt mirror.txt                             # only @ A, www CNAME (+ Resend rows)
#
# Output lines are `name TYPE value`, TTLs dropped so the diff is stable. Read-only:
# this script never writes DNS anywhere.
set -euo pipefail

domain="${DOMAIN:-agorasim.pt}"
ns=""
while (($#)); do
  case "$1" in
    --ns) ns="$2"; shift 2 ;;
    --domain) domain="$2"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Every name the live zone carried on 2026-09-11, plus the rows Resend and Vercel add.
# Extend the list if the panel shows more; a name that does not exist prints nothing.
names=(
  "@ A" "@ AAAA" "@ MX" "@ TXT" "@ NS" "@ CAA"
  "www CNAME"
  "google._domainkey TXT" "_dmarc TXT"
  "mail CNAME" "webmail CNAME" "ftp CNAME"
  "resend._domainkey TXT" "send MX" "send TXT"
  "_vercel TXT"
)

fqdn() { [[ "$1" == "@" ]] && echo "$domain" || echo "$1.$domain"; }

query_doh() {
  local name="$1" type="$2"
  curl -sS --max-time 15 "https://dns.google/resolve?name=${name}&type=${type}" \
    | python3 -c '
import json, sys
name, rtype = sys.argv[1], sys.argv[2]
d = json.load(sys.stdin)
types = {1:"A",2:"NS",5:"CNAME",15:"MX",16:"TXT",28:"AAAA",257:"CAA"}
for a in d.get("Answer", []):
    t = types.get(a.get("type"), str(a.get("type")))
    if t != rtype:  # a CNAME chain answers an A query with the CNAME too; keep only what was asked
        continue
    print("%s %s %s" % (name, t, a["data"]))
' "$name" "$type"
}

query_ns() {
  local name="$1" type="$2"
  dig +short +norecurse "@$ns" "$name" "$type" 2>/dev/null \
    | sed "s/^/${name} ${type} /"
}

if [[ -n "$ns" ]]; then
  command -v dig >/dev/null || { echo "--ns needs dig (bind-utils / dnsutils)" >&2; exit 2; }
fi

for entry in "${names[@]}"; do
  read -r short type <<<"$entry"
  name="$(fqdn "$short")"
  if [[ -n "$ns" ]]; then query_ns "$name" "$type"; else query_doh "$name" "$type"; fi
done | sed 's/[[:space:]]\+$//' | sort -u
