#!/usr/bin/env bash
# dns-snapshot.sh — print the agorasim.pt zone as a sorted, diffable list.
#
# Runbook use (.icm/docs/launch-runbook.md § Track T / G):
#   web/scripts/dns-snapshot.sh > before.txt              # live zone, via DNS-over-HTTPS
#   web/scripts/dns-snapshot.sh --ns ns1.example.pt > mirror.txt   # the pre-created zone,
#                                                          # asked directly (needs `dig`)
#   web/scripts/dns-snapshot.sh --zonefile export.txt > mirror.txt # the pre-created zone,
#                                                          # from the registrar's export
#   diff before.txt mirror.txt                             # only @ A, www CNAME (+ Resend rows)
#
# Output lines are `name TYPE value`, TTLs dropped so the diff is stable. Read-only:
# this script never writes DNS anywhere.
#
# Every source goes through the same normaliser before it is printed, because the diff in
# § Track T is what gates the nameserver switch: TXT values arrive quoted from `dig` and
# bare over DoH, and a long DKIM key arrives as one string from one source and as several
# from another. Un-normalised, every TXT row shows up as a difference — which either halts
# a correct transfer or, worse, teaches the operator to wave TXT diffs away on the one
# night a mangled DKIM key would be invisible.
set -euo pipefail

domain="${DOMAIN:-agorasim.pt}"
ns=""
zonefile=""
while (($#)); do
  case "$1" in
    --ns) ns="$2"; shift 2 ;;
    --zonefile) zonefile="$2"; shift 2 ;;
    --domain) domain="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -n "$ns" && -n "$zonefile" ]]; then
  echo "--ns and --zonefile are two ways to read the same zone; pass one" >&2
  exit 2
fi

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

# The python below is held in variables via quoted heredocs so the shell leaves it
# completely alone — no backslash or quote in a regex has to survive two levels of
# escaping, and stdin stays free for the pipe.

read -r -d '' NORMALISE_PY <<'PY' || true
import re, sys

HOSTNAME_TYPES = {"CNAME", "NS", "PTR"}
# A TXT rdata is a sequence of <=255-byte strings and the value is their concatenation
# (RFC 1035 3.3.14, RFC 7208 3.3), so both quoting styles collapse to one string.
QUOTED = re.compile(r'"((?:[^"\\]|\\.)*)"')


def unquote_txt(value):
    chunks = QUOTED.findall(value)
    if not chunks:
        return value.strip('"')
    out = []
    for chunk in chunks:
        out.append(chunk.replace('\\"', '"').replace("\\\\", "\\"))
    return "".join(out)


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    parts = line.split(" ", 2)
    if len(parts) < 3:
        continue
    name, rtype, value = parts[0], parts[1].upper(), parts[2].strip()

    name = name.lower().rstrip(".") + "."

    if rtype == "TXT":
        value = unquote_txt(value)
    elif rtype == "MX":
        # "<priority> <host>": pad the priority so 5 sorts before 10, dot the host.
        bits = value.split()
        if len(bits) == 2 and bits[0].isdigit():
            value = "%03d %s" % (int(bits[0]), bits[1].lower().rstrip(".") + ".")
    elif rtype in HOSTNAME_TYPES:
        value = value.lower().rstrip(".") + "."

    print("%s %s %s" % (name, rtype, value))
PY

read -r -d '' DOH_PY <<'PY' || true
import json, sys

name, rtype = sys.argv[1], sys.argv[2]
d = json.load(sys.stdin)
types = {1: "A", 2: "NS", 5: "CNAME", 15: "MX", 16: "TXT", 28: "AAAA", 257: "CAA"}
for a in d.get("Answer", []):
    t = types.get(a.get("type"), str(a.get("type")))
    if t != rtype:  # a CNAME chain answers an A query with the CNAME too; keep what was asked
        continue
    print("%s %s %s" % (name, t, a["data"]))
PY

# Parses a BIND-style zone export from the registrar panel. Only the types the mirror
# table uses are recognised; $TTL, SOA and comments are skipped, and a bare or "@" owner
# inherits the zone apex the way a zone file means it.
read -r -d '' ZONEFILE_PY <<'PY' || true
import sys

WANTED = {"A", "AAAA", "MX", "TXT", "NS", "CNAME", "CAA"}
CLASSES = {"IN", "CS", "CH", "HS"}
domain = sys.argv[1].rstrip(".")
path = sys.argv[2]
last_owner = domain + "."


def strip_comment(text):
    """Drop a trailing ; comment, but only outside quotes.

    SPF, DMARC and DKIM values are full of semicolons ("v=DMARC1; p=none; ..."), so a
    naive split on ";" silently truncates exactly the records whose exact value this
    comparison exists to protect.
    """
    out = []
    in_quotes = False
    escaped = False
    for ch in text:
        if escaped:
            out.append(ch)
            escaped = False
            continue
        if ch == "\\":
            out.append(ch)
            escaped = True
            continue
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == ";" and not in_quotes:
            break
        out.append(ch)
    return "".join(out)


with open(path, encoding="utf-8", errors="replace") as fh:
    for raw in fh:
        line = strip_comment(raw).rstrip()
        if not line.strip() or line.lstrip().startswith("$"):
            continue
        fields = line.split()
        # A line starting with whitespace continues the previous owner name.
        if raw[:1].isspace():
            owner, rest = last_owner, fields
        else:
            owner, rest = fields[0], fields[1:]
        if not rest:
            continue
        if owner in ("@", ""):
            owner = domain + "."
        elif not owner.endswith("."):
            owner = "%s.%s." % (owner, domain)
        last_owner = owner

        # Step over TTL and class tokens to reach the type.
        i = 0
        while i < len(rest) and (rest[i].isdigit() or rest[i].upper() in CLASSES):
            i += 1
        if i >= len(rest):
            continue
        rtype = rest[i].upper()
        if rtype not in WANTED:
            continue
        value = " ".join(rest[i + 1:]).strip()
        if value:
            print("%s %s %s" % (owner, rtype, value))
PY

normalise() { python3 -c "$NORMALISE_PY"; }

query_doh() {
  local name="$1" type="$2"
  curl -sS --max-time 15 "https://dns.google/resolve?name=${name}&type=${type}" \
    | python3 -c "$DOH_PY" "$name" "$type"
}

query_ns() {
  local name="$1" type="$2"
  dig +short +norecurse "@$ns" "$name" "$type" 2>/dev/null \
    | sed "s/^/${name} ${type} /"
}

if [[ -n "$ns" ]]; then
  command -v dig >/dev/null || { echo "--ns needs dig (bind-utils / dnsutils)" >&2; exit 2; }

  # Preflight: the named server must answer for this zone *authoritatively* (aa flag).
  #
  # This is not paranoia about typos. Sandboxes and corporate networks routinely redirect
  # all port-53 traffic to their own recursive resolver, which accepts the query, clears
  # the aa flag, and answers some names from cache while SERVFAILing others — so `--ns`
  # silently yields a random subset of the zone instead of failing. A partial mirror.txt
  # is worse than no file at all: diffed against before.txt it shows records "missing"
  # from a zone that in fact has them, and § Track T's rule is to stop and fix anything
  # that differs. One real missing record would hide in that noise.
  soa_answer="$(dig +norecurse +tries=1 +time=5 "@$ns" "$domain" SOA 2>/dev/null || true)"
  if ! grep -q '^;; flags:[^;]* aa' <<<"$soa_answer"; then
    {
      echo "dns-snapshot: ${ns} did not answer authoritatively for ${domain} — refusing to snapshot it."
      echo "  An authoritative nameserver answers its own zone with the 'aa' flag set; this"
      echo "  reply had none, so the answers are a resolver's, not ${ns}'s:"
      grep -E '^;; ->>HEADER<<-|^;; flags:' <<<"$soa_answer" | sed 's/^/    /' || true
      echo "  Either the zone is not yet on ${ns}, or this host's port 53 is redirected to a"
      echo "  local resolver (common in sandboxes and CI). Verify by hand with:"
      echo "    dig +norecurse @${ns} ${domain} SOA"
      echo "  Run the snapshot from an unrestricted machine, or pass --zonefile with the"
      echo "  registrar's zone export, which needs no DNS egress at all."
    } >&2
    exit 1
  fi
fi

if [[ -n "$zonefile" ]]; then
  [[ -r "$zonefile" ]] || { echo "cannot read zone file: $zonefile" >&2; exit 2; }
  raw="$(python3 -c "$ZONEFILE_PY" "$domain" "$zonefile")"
else
  raw="$(
    for entry in "${names[@]}"; do
      read -r short type <<<"$entry"
      name="$(fqdn "$short")"
      if [[ -n "$ns" ]]; then query_ns "$name" "$type"; else query_doh "$name" "$type"; fi
    done
  )"
fi

# A zone that answers nothing is a broken query path, not an empty zone — the apex of a
# live domain always has something. Failing loudly matters more here than anywhere else in
# this script: an empty mirror.txt written at 23:00 diffs against before.txt as "every
# record missing", and exiting 0 on it invites the reading that the run was fine.
# Sandboxed hosts commonly cannot reach an authoritative nameserver on port 53 at all,
# which is exactly how this surfaces.
if [[ -z "${raw//[[:space:]]/}" ]]; then
  {
    echo "dns-snapshot: no records came back for ${domain} — refusing to print an empty snapshot."
    if [[ -n "$ns" ]]; then
      echo "  Asked ${ns} directly. Check the nameserver is delegated and reachable:"
      echo "    dig +norecurse @${ns} ${domain} SOA"
      echo "  If that SERVFAILs or times out from here, this host has no authoritative DNS"
      echo "  egress — run the same command from an unrestricted machine, or use"
      echo "  --zonefile with the registrar's zone export instead."
    elif [[ -n "$zonefile" ]]; then
      echo "  Parsed ${zonefile} and found none of the mirror-table types in it."
    else
      echo "  Queried DNS-over-HTTPS (dns.google). Check outbound HTTPS."
    fi
  } >&2
  exit 1
fi

# LC_ALL=C pins the collation. Without it `sort` orders by the operator's locale, so a
# before.txt taken on a Mac and a mirror.txt taken on a Linux box differ in row order
# alone — pages of phantom differences in the one diff that must be read literally.
printf '%s\n' "$raw" | normalise | sed 's/[[:space:]]\+$//' | LC_ALL=C sort -u
