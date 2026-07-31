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
} from "./admin-format";

describe("formatDate", () => {
  it("formats a Date as day, short month, year", () => {
    // Constructed from local parts, so the assertion holds in any timezone.
    expect(formatDate(new Date(2026, 6, 31))).toBe("31 Jul 2026");
  });

  it("zero-pads single-digit days", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
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
