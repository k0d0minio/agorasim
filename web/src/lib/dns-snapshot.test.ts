import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guards `web/scripts/dns-snapshot.sh` — the script whose output gates the nameserver
 * switch in `.icm/docs/launch-runbook.md` § Track T. The runbook's rule is "anything else
 * different = fix before continuing", so a spurious difference is not cosmetic: it either
 * halts a correct transfer or teaches the operator to wave differences away on the one
 * night a mangled DKIM key would be invisible.
 *
 * Only the `--zonefile` path is exercised. It is the one source that needs neither network
 * nor `dig`, and it runs the same normaliser as the DoH and `--ns` paths, so the
 * normalisation rules are covered without making CI depend on DNS.
 */

const SCRIPT = fileURLToPath(
  new URL("../../scripts/dns-snapshot.sh", import.meta.url),
);

const dir = mkdtempSync(join(tmpdir(), "dns-snapshot-"));

/** Writes `zone` to a temp file and returns the script's output lines. */
function snapshot(zone: string, name = `${Math.random().toString(36).slice(2)}.zone`) {
  const path = join(dir, name);
  writeFileSync(path, zone);
  return execFileSync("bash", [SCRIPT, "--zonefile", path], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

/** Runs the script expecting a non-zero exit, and returns its stderr. */
function snapshotFailure(args: string[]) {
  try {
    execFileSync("bash", [SCRIPT, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as { status?: number; stderr?: string };
    return { status: failure.status, stderr: failure.stderr ?? "" };
  }
  throw new Error("expected dns-snapshot.sh to exit non-zero");
}

const DKIM =
  "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaHT0QfdWCoUn94IBgNNBKcXOafDFl7f7a9a5+crac+JDj5Q8U75UJhHAXcVjUJKtHknp2vkxPfSaFukWmowcxZ/WQiGHD+natRw++uhBRO79c4L/8kEYTvvASGVzffEskZb0/OSgvACxv+hdw0uVioH27RZQIg4nKmiUB8GeZNwIDAQAB";

describe("dns-snapshot.sh normalisation", () => {
  it("concatenates a TXT value a panel split across strings", () => {
    // RFC 1035 §3.3.14: TXT rdata is a sequence of <=255-byte strings and the value is
    // their concatenation. Registrar panels split long DKIM keys; the live zone serves
    // one string. Both must compare equal or every mail check is noise.
    const head = DKIM.slice(0, 200);
    const tail = DKIM.slice(200);

    const asOneString = snapshot(`@ IN TXT "${DKIM}"`);
    const asTwoStrings = snapshot(`@ IN TXT "${head}" "${tail}"`);

    expect(asOneString).toEqual([`agorasim.pt. TXT ${DKIM}`]);
    expect(asTwoStrings).toEqual(asOneString);
  });

  it("keeps semicolons inside a quoted TXT value", () => {
    // A trailing `;` starts a zone-file comment, but SPF, DMARC and DKIM values are full
    // of semicolons. Splitting on the first one truncates `v=DMARC1; p=none; ...` to
    // `v=DMARC1` — a silent corruption of the exact records being verified.
    const dmarc = "v=DMARC1; p=none; pct=100; ri=86400";

    expect(snapshot(`_dmarc IN TXT "${dmarc}"   ; policy record`)).toEqual([
      `_dmarc.agorasim.pt. TXT ${dmarc}`,
    ]);
  });

  it("strips a comment that really is a comment", () => {
    expect(snapshot("; nothing but a comment\n@ IN A 76.76.21.21")).toEqual([
      "agorasim.pt. A 76.76.21.21",
    ]);
  });

  it("orders MX records by numeric priority, not lexically", () => {
    // Sorted as text, "10" lands before "5" and the diff shows the whole MX set moving.
    const zone = [
      "@ IN MX 10 alt3.aspmx.l.google.com.",
      "@ IN MX 5 alt1.aspmx.l.google.com.",
      "@ IN MX 1 aspmx.l.google.com.",
    ].join("\n");

    expect(snapshot(zone)).toEqual([
      "agorasim.pt. MX 001 aspmx.l.google.com.",
      "agorasim.pt. MX 005 alt1.aspmx.l.google.com.",
      "agorasim.pt. MX 010 alt3.aspmx.l.google.com.",
    ]);
  });

  it("gives the same owner name for @, a bare label and an FQDN", () => {
    expect(snapshot("@ IN A 76.76.21.21")).toEqual(
      snapshot("agorasim.pt. IN A 76.76.21.21"),
    );
    expect(snapshot("www IN CNAME cname.vercel-dns.com.")).toEqual(
      snapshot("www.agorasim.pt. IN CNAME cname.vercel-dns.com."),
    );
  });

  it("dot-terminates hostname values and lowercases names", () => {
    expect(snapshot("WWW IN CNAME CNAME.Vercel-DNS.COM")).toEqual([
      "www.agorasim.pt. CNAME cname.vercel-dns.com.",
    ]);
  });

  it("inherits the previous owner on a continuation line and skips a multi-line SOA", () => {
    // The apex NS rows in a real export have a blank owner, and the SOA spans lines in
    // parentheses. Neither may produce a phantom row.
    const zone = [
      "agorasim.pt.\t3600\tIN\tSOA\tns1.pt.pt. hostmaster.pt.pt. (",
      "\t\t\t\t2026091701 ; serial",
      "\t\t\t\t3600 900 604800 3600 )",
      "\t\tIN\tNS\tns1.pt.pt.",
      "\t\tIN\tNS\tns2.pt.pt.",
    ].join("\n");

    expect(snapshot(zone)).toEqual([
      "agorasim.pt. NS ns1.pt.pt.",
      "agorasim.pt. NS ns2.pt.pt.",
    ]);
  });

  it("ignores $TTL and $ORIGIN directives", () => {
    expect(snapshot("$ORIGIN agorasim.pt.\n$TTL 3600\n@ IN A 76.76.21.21")).toEqual([
      "agorasim.pt. A 76.76.21.21",
    ]);
  });
});

describe("dns-snapshot.sh as the Track T gate", () => {
  // The mirrored zone differs from the live one in exactly the rows the runbook names:
  // the two Vercel rows, the new registrar's own NS, and the Resend rows added in Track D.
  const live = [
    "@ IN A 130.185.83.150",
    "www IN CNAME agorasim.pt.",
    "@ IN NS ns1.amenworld.com.",
    "@ IN MX 1 aspmx.l.google.com.",
    '@ IN TXT "v=spf1 include:spf.webapps.net include:_spf.google.com ~all"',
    `google._domainkey IN TXT "${DKIM}"`,
    '_dmarc IN TXT "v=DMARC1; p=none; pct=100; ri=86400"',
    "mail IN CNAME mail-pt.securemail.pro.",
  ].join("\n");

  const mirrored = [
    "@ IN A 76.76.21.21",
    "www IN CNAME cname.vercel-dns.com.",
    "@ IN NS ns1.pt.pt.",
    "@ IN MX 1 aspmx.l.google.com.",
    '@ IN TXT "v=spf1 include:spf.webapps.net include:_spf.google.com ~all"',
    // Split exactly as a panel would, to prove the mail rows still compare equal.
    `google._domainkey IN TXT "${DKIM.slice(0, 200)}" "${DKIM.slice(200)}"`,
    '_dmarc IN TXT "v=DMARC1; p=none; pct=100; ri=86400"',
    "mail IN CNAME mail-pt.securemail.pro.",
    'send IN TXT "v=spf1 include:amazonses.com ~all"',
  ].join("\n");

  it("shows only the intended differences", () => {
    const before = snapshot(live);
    const after = snapshot(mirrored);

    expect(before.filter((row) => !after.includes(row))).toEqual([
      "agorasim.pt. A 130.185.83.150",
      "agorasim.pt. NS ns1.amenworld.com.",
      "www.agorasim.pt. CNAME agorasim.pt.",
    ]);
    expect(after.filter((row) => !before.includes(row))).toEqual([
      "agorasim.pt. A 76.76.21.21",
      "agorasim.pt. NS ns1.pt.pt.",
      "send.agorasim.pt. TXT v=spf1 include:amazonses.com ~all",
      "www.agorasim.pt. CNAME cname.vercel-dns.com.",
    ]);
  });

  it("leaves every mail-critical row identical", () => {
    const before = snapshot(live);
    const after = snapshot(mirrored);
    const mail = (rows: string[]) =>
      rows.filter((row) => /\bMX\b|_domainkey|_dmarc|spf1 include:spf\.webapps/.test(row));

    expect(mail(after)).toEqual(mail(before));
  });
});

describe("dns-snapshot.sh failure modes", () => {
  it("refuses to print an empty snapshot rather than exiting clean", () => {
    // An empty mirror.txt diffed against before.txt reads as "every record missing".
    // Exiting 0 on it invites the reading that the run was fine.
    const path = join(dir, "empty.zone");
    writeFileSync(path, "; only a comment\n$TTL 3600\n");

    const { status, stderr } = snapshotFailure(["--zonefile", path]);

    expect(status).toBe(1);
    expect(stderr).toContain("refusing to print an empty snapshot");
  });

  it("rejects an unreadable zone file", () => {
    const { status, stderr } = snapshotFailure([
      "--zonefile",
      join(dir, "does-not-exist.zone"),
    ]);

    expect(status).toBe(2);
    expect(stderr).toContain("cannot read zone file");
  });

  it("rejects --ns and --zonefile together", () => {
    const { status, stderr } = snapshotFailure([
      "--ns",
      "ns1.example.pt",
      "--zonefile",
      join(dir, "whatever.zone"),
    ]);

    expect(status).toBe(2);
    expect(stderr).toContain("pass one");
  });

  it("rejects an unknown argument", () => {
    const { status, stderr } = snapshotFailure(["--wat"]);

    expect(status).toBe(2);
    expect(stderr).toContain("unknown argument");
  });
});
