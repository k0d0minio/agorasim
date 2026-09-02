import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

import {
  connectedAccountId,
  isConnectConfigured,
  onConnectedAccount,
  onOwningAccount,
} from "./stripe";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** What Stripe answers when an object exists, but not on the account you asked. */
const missing = () =>
  new Stripe.errors.StripeInvalidRequestError({
    message: "No such checkout.session: 'cs_test_1'",
    code: "resource_missing",
  });

describe("connectedAccountId", () => {
  it("is null when unset — the platform-only deployment that exists today", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "");

    expect(connectedAccountId()).toBeNull();
    expect(isConnectConfigured()).toBe(false);
  });

  it("is null when the variable holds only whitespace", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "   ");

    expect(connectedAccountId()).toBeNull();
  });

  it("trims, because a copied id arrives with a newline on it", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "  acct_123  ");

    expect(connectedAccountId()).toBe("acct_123");
    expect(isConnectConfigured()).toBe(true);
  });

  // The whole reason this validates rather than shrugging: a typo that fell back
  // to platform-only would put the guest's money in the wrong account.
  it("throws rather than falling back when the value is not an account id", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "agorasim");

    expect(() => connectedAccountId()).toThrow(/STRIPE_CONNECTED_ACCOUNT_ID/);
  });

  it("keeps the value out of the message, in case a key was pasted there", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "sk_test_not_an_account_id");

    // The message goes to the logs; a mis-pasted key must not go with it.
    let thrown: unknown;
    try {
      connectedAccountId();
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain("sk_test_not_an_account_id");
  });
});

describe("onConnectedAccount", () => {
  it("changes nothing when Connect is unconfigured", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "");

    expect(onConnectedAccount()).toBeUndefined();
    expect(onConnectedAccount({ idempotencyKey: "k" })).toEqual({ idempotencyKey: "k" });
  });

  it("names the account to charge on", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_123");

    expect(onConnectedAccount()).toEqual({ stripeAccount: "acct_123" });
  });

  it("merges rather than replaces — an idempotency key still has to survive", () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_123");

    expect(onConnectedAccount({ idempotencyKey: "k" })).toEqual({
      idempotencyKey: "k",
      stripeAccount: "acct_123",
    });
  });
});

describe("onOwningAccount", () => {
  it("makes one plain call when Connect is unconfigured", async () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "");
    const run = vi.fn().mockResolvedValue("ok");

    await expect(onOwningAccount(run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("asks the connected account first, and stops there when it answers", async () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_123");
    const run = vi.fn().mockResolvedValue("ok");

    await expect(onOwningAccount(run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledExactlyOnceWith({ stripeAccount: "acct_123" });
  });

  // A booking taken before the connected account was configured is still on the
  // platform, and still has to be confirmable and refundable.
  it("falls back to the platform when the object is not on the connected account", async () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_123");
    vi.spyOn(console, "info").mockImplementation(() => {});
    const run = vi.fn().mockRejectedValueOnce(missing()).mockResolvedValue("ok");

    await expect(onOwningAccount(run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith(undefined);
  });

  // Anything else means the account was right and the request was not; retrying
  // it elsewhere would turn one clear failure into two confusing ones.
  it("does not retry a failure that is not a missing object", async () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_123");
    const declined = new Stripe.errors.StripeInvalidRequestError({
      message: "Refund amount exceeds the charge",
      code: "amount_too_large",
    });
    const run = vi.fn().mockRejectedValue(declined);

    await expect(onOwningAccount(run)).rejects.toBe(declined);
    expect(run).toHaveBeenCalledOnce();
  });

  it("does not retry a missing object when there is no second account to ask", async () => {
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "");
    const err = missing();
    const run = vi.fn().mockRejectedValue(err);

    await expect(onOwningAccount(run)).rejects.toBe(err);
    expect(run).toHaveBeenCalledOnce();
  });
});
