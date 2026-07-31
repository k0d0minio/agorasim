import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./admin-format";

const now = new Date("2026-07-31T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("collapses the last minute to 'just now'", () => {
    expect(formatRelativeTime(ago(5 * SECOND), now)).toBe("just now");
    expect(formatRelativeTime(ago(59 * SECOND), now)).toBe("just now");
  });

  it("counts down in the largest unit that still reads naturally", () => {
    expect(formatRelativeTime(ago(MINUTE), now)).toBe("1m ago");
    expect(formatRelativeTime(ago(59 * MINUTE), now)).toBe("59m ago");
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * DAY), now)).toBe("2d ago");
    expect(formatRelativeTime(ago(10 * DAY), now)).toBe("1w ago");
    expect(formatRelativeTime(ago(45 * DAY), now)).toBe("1mo ago");
    expect(formatRelativeTime(ago(400 * DAY), now)).toBe("1y ago");
  });

  it("does not claim a future timestamp already happened", () => {
    expect(formatRelativeTime(new Date(now.getTime() + HOUR), now)).toBe("just now");
  });

  it("accepts an ISO string and rejects nonsense", () => {
    expect(formatRelativeTime("2026-07-31T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime(null, now)).toBe("—");
    expect(formatRelativeTime("not a date", now)).toBe("—");
  });
});
