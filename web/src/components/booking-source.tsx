"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  SOURCE_REFERRER_FIELD,
  SOURCE_UTM_FIELD,
  captureTabSource,
  parseTabSource,
  readTabSource,
  subscribeToTabSource,
} from "@/lib/booking-source";

/**
 * Record where this visit started, on the first page of the tab (JAM-506).
 *
 * In the public layout, so that it runs on whichever page the guest lands on:
 * a tour page from ChatGPT, the home page from Google. It renders nothing and
 * sets no cookie. `lib/booking-source.ts` says what is kept and why.
 */
export function BookingSourceCapture() {
  useEffect(() => {
    captureTabSource();
  }, []);
  return null;
}

const noTabSource = () => "";

/**
 * The two hidden fields that send the tab's record with a form.
 *
 * The record is in the tab's storage, which the prerendered page cannot see,
 * so it is subscribed to and not copied into state (as the checkout form reads
 * its draft). With no record there are no fields, and the server then stores
 * "not recorded".
 */
export function BookingSourceFields() {
  const raw = useSyncExternalStore(subscribeToTabSource, readTabSource, noTabSource);
  const source = parseTabSource(raw);
  if (!source) return null;
  return (
    <>
      <input type="hidden" name={SOURCE_UTM_FIELD} value={source.utm} />
      <input type="hidden" name={SOURCE_REFERRER_FIELD} value={source.ref} />
    </>
  );
}
