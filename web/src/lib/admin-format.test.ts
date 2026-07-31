import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRelativeTime } from "./admin-format.ts";

const now = new Date("2026-07-31T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("collapses the last minute to 'just now'", () => {
    assert.equal(formatRelativeTime(ago(5 * SECOND), now), "just now");
    assert.equal(formatRelativeTime(ago(59 * SECOND), now), "just now");
  });

  it("counts down in the largest unit that still reads naturally", () => {
    assert.equal(formatRelativeTime(ago(MINUTE), now), "1m ago");
    assert.equal(formatRelativeTime(ago(59 * MINUTE), now), "59m ago");
    assert.equal(formatRelativeTime(ago(3 * HOUR), now), "3h ago");
    assert.equal(formatRelativeTime(ago(2 * DAY), now), "2d ago");
    assert.equal(formatRelativeTime(ago(10 * DAY), now), "1w ago");
    assert.equal(formatRelativeTime(ago(45 * DAY), now), "1mo ago");
    assert.equal(formatRelativeTime(ago(400 * DAY), now), "1y ago");
  });

  it("does not claim a future timestamp already happened", () => {
    assert.equal(formatRelativeTime(new Date(now.getTime() + HOUR), now), "just now");
  });

  it("accepts an ISO string and rejects nonsense", () => {
    assert.equal(formatRelativeTime("2026-07-31T09:00:00Z", now), "3h ago");
    assert.equal(formatRelativeTime(null, now), "—");
    assert.equal(formatRelativeTime("not a date", now), "—");
  });
});
