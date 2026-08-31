"use client";

import { useEffect } from "react";

import { clearDraft } from "@/lib/checkout-draft";

/**
 * Forgets the checkout draft, on the page that means the checkout is over.
 *
 * The form keeps a draft of what the guest entered so that tapping back on
 * Stripe's page does not empty it (`lib/checkout-draft.ts`). Landing here means
 * the walk ended in a payment rather than a cancel, so the copy of their name,
 * email and phone number has nothing left to restore — and a store this page
 * can empty is one that need not wait for the tab to close.
 */
export function CheckoutDraftCleanup() {
  useEffect(() => clearDraft(), []);
  return null;
}
