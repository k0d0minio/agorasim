import { describe, expect, it } from "vitest";
import {
  featureRequestPriorityEnum,
  featureRequestStatusEnum,
  requestStatusEnum,
} from "@/db/schema";
import {
  FEATURE_REQUEST_PRIORITIES,
  FEATURE_REQUEST_STATUSES,
  REQUEST_STATUSES,
  formatDate,
  formatRelativeTime,
} from "./admin-format";

describe("formatDate", () => {
  it("formats a Date the pt-PT way — day, month, year", () => {
    // Constructed from local parts, so the assertion holds in any timezone.
    expect(formatDate(new Date(2026, 6, 31))).toBe("31/07/2026");
  });

  it("zero-pads single-digit days and months", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05/01/2026");
  });

  it("accepts a timestamp string and a Date interchangeably", () => {
    const iso = "2026-07-31T12:00:00.000Z";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });

  it("renders an em dash for a missing value", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("renders an em dash rather than 'Invalid Date' for unparseable input", () => {
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate(new Date("nonsense"))).toBe("—");
  });
});

const now = new Date("2026-07-31T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("collapses the last minute to 'agora mesmo'", () => {
    expect(formatRelativeTime(ago(5 * SECOND), now)).toBe("agora mesmo");
    expect(formatRelativeTime(ago(59 * SECOND), now)).toBe("agora mesmo");
  });

  it("counts down in the largest unit that still reads naturally", () => {
    expect(formatRelativeTime(ago(MINUTE), now)).toBe("há 1 min");
    expect(formatRelativeTime(ago(59 * MINUTE), now)).toBe("há 59 min");
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("há 3 h");
    expect(formatRelativeTime(ago(2 * DAY), now)).toBe("há 2 d");
    expect(formatRelativeTime(ago(10 * DAY), now)).toBe("há 1 sem.");
    expect(formatRelativeTime(ago(45 * DAY), now)).toBe("há 1 mês");
    expect(formatRelativeTime(ago(400 * DAY), now)).toBe("há 1 ano");
  });

  it("gives months and years a plural once there is more than one", () => {
    expect(formatRelativeTime(ago(100 * DAY), now)).toBe("há 3 meses");
    expect(formatRelativeTime(ago(800 * DAY), now)).toBe("há 2 anos");
  });

  it("does not claim a future timestamp already happened", () => {
    expect(formatRelativeTime(new Date(now.getTime() + HOUR), now)).toBe("agora mesmo");
  });

  it("accepts an ISO string and rejects nonsense", () => {
    expect(formatRelativeTime("2026-07-31T09:00:00Z", now)).toBe("há 3 h");
    expect(formatRelativeTime(null, now)).toBe("—");
    expect(formatRelativeTime("not a date", now)).toBe("—");
  });
});

/**
 * The picker lists are read off their meta records rather than written out
 * again. These assertions are the "cannot drift from the database" claim made
 * executable: add a value to a `pgEnum` without giving it a label and the
 * matching test fails.
 */
describe("status lists track the database enums", () => {
  it("covers every tour-request status, in enum order", () => {
    expect(REQUEST_STATUSES).toEqual([...requestStatusEnum.enumValues]);
  });

  it("covers every feature-request status, in enum order", () => {
    expect(FEATURE_REQUEST_STATUSES).toEqual([...featureRequestStatusEnum.enumValues]);
  });

  it("covers every feature-request priority, in enum order", () => {
    expect(FEATURE_REQUEST_PRIORITIES).toEqual([...featureRequestPriorityEnum.enumValues]);
  });
});
