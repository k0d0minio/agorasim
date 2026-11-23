import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NO_SOURCE,
  SOURCE_CHANGE_EVENT,
  SOURCE_DIRECT,
  SOURCE_NOT_RECORDED,
  SOURCE_REFERRER_FIELD,
  SOURCE_STORAGE_KEY,
  SOURCE_UTM_FIELD,
  captureTabSource,
  cleanUtmSource,
  parseTabSource,
  readTabSource,
  recentMonths,
  referrerHost,
  sourceFromForm,
  sourceLabel,
  tabSourceOf,
  tallySourcesByMonth,
} from "./booking-source";

const OWN = ["https://uat.agorasim.pt", "https://agorasim.pt"];

describe("cleanUtmSource", () => {
  it("keeps the value ChatGPT sends, in lower case", () => {
    expect(cleanUtmSource("chatgpt.com")).toBe("chatgpt.com");
    expect(cleanUtmSource("  ChatGPT.com ")).toBe("chatgpt.com");
    expect(cleanUtmSource("newsletter_nov-2026")).toBe("newsletter_nov-2026");
  });

  it("drops a value that is not a source name", () => {
    expect(cleanUtmSource("")).toBeNull();
    expect(cleanUtmSource(undefined)).toBeNull();
    expect(cleanUtmSource(["a", "b"])).toBeNull();
    expect(cleanUtmSource("<script>alert(1)</script>")).toBeNull();
    expect(cleanUtmSource("ana@example.com")).toBeNull();
    expect(cleanUtmSource("two words")).toBeNull();
    expect(cleanUtmSource("a".repeat(65))).toBeNull();
  });
});

describe("referrerHost", () => {
  it("keeps the host only, never the path or the search", () => {
    expect(referrerHost("https://www.google.com/search?q=passeios+sintra")).toBe(
      "www.google.com",
    );
    expect(referrerHost("https://chatgpt.com/c/1234-private-conversation")).toBe("chatgpt.com");
    expect(referrerHost("https://Example.PT:8443/a/b?c=d#e")).toBe("example.pt");
  });

  it("reads a bare host name, as the form sends it", () => {
    expect(referrerHost("www.google.com")).toBe("www.google.com");
  });

  it("ignores a page of this site, with or without www", () => {
    expect(referrerHost("https://uat.agorasim.pt/pt/experiencias", OWN)).toBe("");
    expect(referrerHost("https://www.agorasim.pt/en", OWN)).toBe("");
    expect(referrerHost("agorasim.pt", OWN)).toBe("");
  });

  it("gives nothing for no referrer and for one that is not an address", () => {
    expect(referrerHost("")).toBe("");
    expect(referrerHost(undefined)).toBe("");
    expect(referrerHost("javascript:alert(1)")).toBe("");
    expect(referrerHost("https://")).toBe("");
    expect(referrerHost("not a host")).toBe("");
  });

  it("keeps the package name of the Google app on Android", () => {
    expect(referrerHost("android-app://com.google.android.googlequicksearchbox/")).toBe(
      "com.google.android.googlequicksearchbox",
    );
  });
});

describe("sourceFromForm", () => {
  it("stores the two values of a form that carries them", () => {
    expect(
      sourceFromForm(
        { [SOURCE_UTM_FIELD]: "chatgpt.com", [SOURCE_REFERRER_FIELD]: "chatgpt.com" },
        OWN,
      ),
    ).toEqual({ landingUtmSource: "chatgpt.com", landingReferrerHost: "chatgpt.com" });
  });

  it("stores a Google visit with no utm_source", () => {
    expect(
      sourceFromForm(
        { [SOURCE_UTM_FIELD]: "", [SOURCE_REFERRER_FIELD]: "https://www.google.com/" },
        OWN,
      ),
    ).toEqual({ landingUtmSource: null, landingReferrerHost: "www.google.com" });
  });

  it("records a direct visit as an empty host, not as no record", () => {
    expect(sourceFromForm({ [SOURCE_UTM_FIELD]: "", [SOURCE_REFERRER_FIELD]: "" }, OWN)).toEqual(
      { landingUtmSource: null, landingReferrerHost: "" },
    );
  });

  it("says not recorded for a form with neither field", () => {
    expect(sourceFromForm({ name: "Ana" }, OWN)).toEqual(NO_SOURCE);
  });

  it("drops a value that is not valid and keeps the other", () => {
    expect(
      sourceFromForm(
        {
          [SOURCE_UTM_FIELD]: "'; drop table bookings; --",
          [SOURCE_REFERRER_FIELD]: "https://www.bing.com/search?q=x",
        },
        OWN,
      ),
    ).toEqual({ landingUtmSource: null, landingReferrerHost: "www.bing.com" });
  });

  it("ignores the site's own page as a referrer", () => {
    expect(
      sourceFromForm(
        { [SOURCE_UTM_FIELD]: "", [SOURCE_REFERRER_FIELD]: "https://uat.agorasim.pt/pt" },
        OWN,
      ),
    ).toEqual({ landingUtmSource: null, landingReferrerHost: "" });
  });
});

describe("sourceLabel", () => {
  it("shows the utm_source as it is", () => {
    expect(sourceLabel({ landingUtmSource: "chatgpt.com", landingReferrerHost: "" })).toBe(
      "chatgpt.com",
    );
  });

  it("shows google for each Google host", () => {
    for (const host of [
      "www.google.com",
      "google.pt",
      "www.google.co.uk",
      "com.google.android.googlequicksearchbox",
    ]) {
      expect(sourceLabel({ landingUtmSource: null, landingReferrerHost: host })).toBe("google");
    }
  });

  it("shows another host with no www", () => {
    expect(sourceLabel({ landingUtmSource: null, landingReferrerHost: "www.perplexity.ai" })).toBe(
      "perplexity.ai",
    );
    // Not Google Search: a host that only has the word in it, and Gmail.
    expect(
      sourceLabel({ landingUtmSource: null, landingReferrerHost: "notgoogle.com" }),
    ).toBe("notgoogle.com");
    expect(
      sourceLabel({ landingUtmSource: null, landingReferrerHost: "mail.google.com" }),
    ).toBe("mail.google.com");
  });

  it("puts the utm_source before the referrer", () => {
    expect(
      sourceLabel({ landingUtmSource: "instagram", landingReferrerHost: "www.google.com" }),
    ).toBe("instagram");
  });

  it("tells a direct visit from a row with no record", () => {
    expect(sourceLabel({ landingUtmSource: null, landingReferrerHost: "" })).toBe(SOURCE_DIRECT);
    expect(sourceLabel(NO_SOURCE)).toBe(SOURCE_NOT_RECORDED);
    expect(SOURCE_DIRECT).toBe("Direta ou desconhecida");
    expect(SOURCE_NOT_RECORDED).toBe("Sem registo");
  });
});

describe("tallySourcesByMonth", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const row = (createdAt: string, utm: string | null, host: string | null) => ({
    createdAt: new Date(createdAt),
    landingUtmSource: utm,
    landingReferrerHost: host,
  });

  it("gives the last six months, this month first, also the empty ones", () => {
    expect(recentMonths(now)).toEqual([
      "2026-11",
      "2026-10",
      "2026-09",
      "2026-08",
      "2026-07",
      "2026-06",
    ]);
    expect(recentMonths(new Date("2027-02-10T12:00:00Z"), 3)).toEqual([
      "2027-02",
      "2027-01",
      "2026-12",
    ]);
    const months = tallySourcesByMonth([], now);
    expect(months).toHaveLength(6);
    expect(months.every((month) => month.total === 0 && month.sources.length === 0)).toBe(true);
  });

  it("counts the bookings of each source in the month they were made", () => {
    const months = tallySourcesByMonth(
      [
        row("2026-11-02T09:00:00Z", null, "www.google.com"),
        row("2026-11-10T09:00:00Z", null, "google.pt"),
        row("2026-11-12T09:00:00Z", "chatgpt.com", ""),
        row("2026-11-15T09:00:00Z", null, ""),
        row("2026-10-20T09:00:00Z", "chatgpt.com", "chatgpt.com"),
        row("2026-10-21T09:00:00Z", null, null),
        // Older than the window: not counted.
        row("2026-01-05T09:00:00Z", "chatgpt.com", ""),
      ],
      now,
    );

    expect(months[0]).toEqual({
      month: "2026-11",
      total: 4,
      sources: [
        { label: "google", bookings: 2 },
        { label: "chatgpt.com", bookings: 1 },
        { label: SOURCE_DIRECT, bookings: 1 },
      ],
    });
    expect(months[1]).toEqual({
      month: "2026-10",
      total: 2,
      sources: [
        { label: "chatgpt.com", bookings: 1 },
        { label: SOURCE_NOT_RECORDED, bookings: 1 },
      ],
    });
  });

  it("puts a booking in its month in Lisbon, not in UTC", () => {
    // 23:30 UTC on 31 July 2026 is 00:30 on 1 August in Lisbon (UTC+1 in summer).
    const months = tallySourcesByMonth(
      [row("2026-07-31T23:30:00Z", "chatgpt.com", "")],
      new Date("2026-08-15T12:00:00Z"),
    );
    expect(months[0].month).toBe("2026-08");
    expect(months[0].total).toBe(1);
    expect(months[1].total).toBe(0);
  });
});

describe("the tab's record", () => {
  it("reads the first page: its utm_source and its referrer host", () => {
    expect(
      tabSourceOf({
        search: "?utm_source=chatgpt.com&utm_medium=referral",
        referrer: "https://chatgpt.com/",
        hostname: "uat.agorasim.pt",
      }),
    ).toEqual({ utm: "chatgpt.com", ref: "chatgpt.com" });
    expect(
      tabSourceOf({
        search: "",
        referrer: "https://www.google.com/",
        hostname: "uat.agorasim.pt",
      }),
    ).toEqual({ utm: "", ref: "www.google.com" });
  });

  it("has no referrer for a page that our own page linked to", () => {
    expect(
      tabSourceOf({
        search: "",
        referrer: "https://uat.agorasim.pt/pt/experiencias",
        hostname: "uat.agorasim.pt",
      }),
    ).toEqual({ utm: "", ref: "" });
  });

  it("cleans a stored record again, and refuses text that is not one", () => {
    expect(parseTabSource('{"utm":"chatgpt.com","ref":"chatgpt.com"}')).toEqual({
      utm: "chatgpt.com",
      ref: "chatgpt.com",
    });
    expect(parseTabSource('{"utm":"<b>","ref":"https://a.example/private?x=1"}')).toEqual({
      utm: "",
      ref: "a.example",
    });
    expect(parseTabSource("")).toBeNull();
    expect(parseTabSource("not json")).toBeNull();
    expect(parseTabSource("[1,2]")).toBeNull();
  });
});

describe("captureTabSource — the first page of the tab decides", () => {
  /** A browser tab: its address, its referrer and its sessionStorage. */
  function tab(page: { search: string; referrer: string }) {
    const store = new Map<string, string>();
    const dispatchEvent = vi.fn();
    const win = {
      location: { search: page.search, hostname: "uat.agorasim.pt" },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
      dispatchEvent,
    };
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", { referrer: page.referrer });
    return { store, win, dispatchEvent };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes one key with only the utm_source and the referrer host", () => {
    const { store, dispatchEvent } = tab({
      search: "?utm_source=chatgpt.com",
      referrer: "https://chatgpt.com/c/a-private-conversation",
    });

    captureTabSource();

    expect([...store.keys()]).toEqual([SOURCE_STORAGE_KEY]);
    expect(JSON.parse(store.get(SOURCE_STORAGE_KEY)!)).toEqual({
      utm: "chatgpt.com",
      ref: "chatgpt.com",
    });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(SOURCE_CHANGE_EVENT);
    expect(readTabSource()).toBe(store.get(SOURCE_STORAGE_KEY));
  });

  it("does not change the record on a later page or on a reload", () => {
    const { store, win } = tab({
      search: "?utm_source=chatgpt.com",
      referrer: "https://chatgpt.com/",
    });
    captureTabSource();
    const first = store.get(SOURCE_STORAGE_KEY);

    // The next page of the visit: no utm_source, and our own page as referrer.
    win.location.search = "";
    vi.stubGlobal("document", { referrer: "https://uat.agorasim.pt/pt" });
    captureTabSource();
    // A reload of a page that another site appears to have sent.
    win.location.search = "?utm_source=other";
    vi.stubGlobal("document", { referrer: "https://www.google.com/" });
    captureTabSource();

    expect(store.get(SOURCE_STORAGE_KEY)).toBe(first);
  });

  it("records a direct visit, so that the booking does not say 'not recorded'", () => {
    const { store } = tab({ search: "", referrer: "" });

    captureTabSource();

    expect(JSON.parse(store.get(SOURCE_STORAGE_KEY)!)).toEqual({ utm: "", ref: "" });
  });

  it("does nothing, and does not throw, in a browser that blocks its storage", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", {
      location: { search: "?utm_source=chatgpt.com", hostname: "uat.agorasim.pt" },
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
      dispatchEvent,
    });
    vi.stubGlobal("document", { referrer: "" });

    expect(() => captureTabSource()).not.toThrow();
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(readTabSource()).toBe("");
  });
});
