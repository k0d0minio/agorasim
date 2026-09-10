import { describe, expect, it } from "vitest";

import { DELETE, GET, HEAD, PATCH, POST, PUT, gone } from "./gone";

describe("gone", () => {
  it("answers 410 with a plain-text explanation", async () => {
    const response = gone();

    expect(response.status).toBe(410);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await response.text()).toMatch(/retired/);
  });

  it("gives every method the same answer", () => {
    // A POST at `/xmlrpc.php` is the classic probe; 405 would invite another.
    for (const handler of [GET, HEAD, POST, PUT, PATCH, DELETE]) {
      expect(handler().status).toBe(410);
    }
  });

  it("lets caches keep the answer", () => {
    expect(gone().headers.get("cache-control")).toMatch(/max-age=\d+/);
  });
});
