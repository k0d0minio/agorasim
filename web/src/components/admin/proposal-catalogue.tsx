"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, RotateCcw, Send, Sparkles } from "lucide-react";
import { requestProposalFeatures } from "@/app/admin/actions";
import {
  ADD_ONS,
  FEATURES,
  SUITE_PRICE,
  catalogueStatusMeta,
  computeTotals,
  euro,
  featurePrice,
  type Feature,
} from "@/lib/proposal";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Count a displayed number up to `value`, respecting reduced-motion. */
function useCountUp(value: number): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = fromRef.current;
    const delta = value - start;
    if (reduce || delta === 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const duration = 420;
    const tick = (ts: number) => {
      if (t0 === null) t0 = ts;
      const k = Math.min(1, (ts - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + delta * eased);
      fromRef.current = v;
      setDisplay(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return display;
}

type Msg = { tone: "ok" | "err"; text: string } | null;

/**
 * The proposal catalogue rendered inside the admin dashboard: a live feature
 * picker (features, add-ons, care plan) with a running total, plus a one-click
 * "file as feature requests" action tying it back to the requests list below.
 *
 * `requestedTitles` are the names of catalogue items already on file as Proposal
 * requests, so cards can show a "Requested" marker.
 */
export function ProposalCatalogue({ requestedTitles }: { requestedTitles: string[] }) {
  const [features, setFeatures] = useState<ReadonlySet<string>>(new Set());
  const [addOns, setAddOns] = useState<ReadonlySet<string>>(new Set());
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [isPending, startTransition] = useTransition();

  const requested = useMemo(() => new Set(requestedTitles), [requestedTitles]);
  const totals = useMemo(() => computeTotals(features, addOns), [features, addOns]);
  const displayTotal = useCountUp(totals.oneTime);

  const gaugePct = totals.fullSuite
    ? 100
    : Math.min(100, Math.round((totals.featureTotal / SUITE_PRICE) * 100));

  function toggle(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function toggleFeature(id: string) {
    setMsg(null);
    setFeatures((s) => toggle(s, id));
  }
  function toggleAddOn(id: string) {
    setMsg(null);
    setAddOns((s) => toggle(s, id));
  }
  function selectAll() {
    setMsg(null);
    setFeatures(new Set(FEATURES.map((f) => f.id)));
  }
  function clearAll() {
    setMsg(null);
    setFeatures(new Set());
    setAddOns(new Set());
  }

  function fileRequests() {
    const ids = [...features, ...addOns];
    if (ids.length === 0) {
      setMsg({ tone: "err", text: "Select at least one feature or add-on first." });
      return;
    }
    startTransition(async () => {
      const res = await requestProposalFeatures({ ids, submittedBy: name });
      if (res.error) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      const parts: string[] = [];
      if (res.created) parts.push(`Filed ${res.created} request${res.created === 1 ? "" : "s"} below`);
      if (res.skipped) parts.push(`${res.skipped} already on file`);
      setMsg({ tone: "ok", text: parts.join(" · ") || "Nothing new to file." });
    });
  }

  const selectedCount = totals.featureCount + totals.addOnCount;

  return (
    <section className="flex flex-col gap-5">
      {/* Intro */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle>Growth platform — pick what to build next</CardTitle>
          </div>
          <CardDescription>
            The full collaboration proposal, live. Switch features on to tally a running estimate,
            then file the ones you want as requests for the team. These are one-time build prices at
            a friends-and-favour rate — no retainer, no subscription — and reflect the toolkit
            already in place, so they cover finishing and shipping, not building from zero.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Features */}
      <div className="grid gap-3 lg:grid-cols-2">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            selected={features.has(feature.id)}
            price={featurePrice(feature, features)}
            bundled={
              feature.bundlePrice != null &&
              !!feature.bundleWith &&
              features.has(feature.bundleWith) &&
              features.has(feature.id)
            }
            requested={requested.has(feature.name)}
            onToggle={() => toggleFeature(feature.id)}
          />
        ))}
      </div>

      {/* Full suite */}
      <Card className="border-dashed bg-primary/5 ring-primary/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-heading text-base font-medium">Take the full suite — all nine</p>
            <p className="text-sm text-muted-foreground">
              Everything above, launched as one platform.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold tabular-nums">€{euro(SUITE_PRICE)}</span>
            <Button type="button" size="sm" onClick={selectAll}>
              Select all nine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Optional add-ons — not on your list, but each earns its keep
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADD_ONS.map((a) => {
            const on = addOns.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAddOn(a.id)}
                aria-pressed={on}
                title={a.summary}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ring-1 transition-colors",
                  on
                    ? "bg-primary/5 ring-primary"
                    : "bg-card ring-foreground/10 hover:ring-foreground/25",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  {a.name}
                  {requested.has(a.name) ? (
                    <span className="ml-1.5 text-xs text-primary">· requested</span>
                  ) : null}
                </span>
                <span className="font-mono text-sm font-medium tabular-nums text-muted-foreground">
                  €{euro(a.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky summary / action bar */}
      <div className="sticky bottom-4 z-20">
        <Card className="ring-primary/25 shadow-lg">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div
              className="grid size-12 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(var(--primary) ${gaugePct}%, var(--muted) 0)` }}
              aria-hidden
            >
              <span className="grid size-9 place-items-center rounded-full bg-card font-mono text-[11px] font-semibold tabular-nums">
                {gaugePct}%
              </span>
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                One-time build — no retainer
              </p>
              <p className="font-mono text-2xl leading-tight font-semibold tabular-nums">
                <span className="text-base font-normal text-muted-foreground">€</span>
                {euro(displayTotal)}
              </p>
              {totals.savings > 0 ? (
                <p className="text-xs font-medium text-primary">
                  You save €{euro(totals.savings)}
                  {selectedCount ? ` · ${selectedCount} selected` : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {selectedCount === 0 ? "Nothing selected yet" : `${selectedCount} selected`}
                </p>
              )}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                autoComplete="name"
                aria-label="Your name"
                className="h-8 w-40 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={isPending}>
                <RotateCcw />
                Clear
              </Button>
              <Button type="button" size="sm" onClick={fileRequests} disabled={isPending || selectedCount === 0}>
                <Send />
                {isPending
                  ? "Filing…"
                  : `File ${selectedCount} as ${selectedCount === 1 ? "request" : "requests"}`}
              </Button>
            </div>

            {msg ? (
              <p
                className={cn(
                  "w-full text-sm",
                  msg.tone === "ok" ? "text-primary" : "text-destructive",
                )}
                role="status"
              >
                {msg.text}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  selected,
  price,
  bundled,
  requested,
  onToggle,
}: {
  feature: Feature;
  selected: boolean;
  price: number;
  bundled: boolean;
  requested: boolean;
  onToggle: () => void;
}) {
  const status = catalogueStatusMeta[feature.status];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "group flex flex-col gap-3 rounded-xl bg-card p-4 text-left ring-1 transition-all",
        selected
          ? "bg-primary/5 ring-2 ring-primary"
          : "ring-foreground/10 hover:-translate-y-0.5 hover:ring-foreground/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base leading-snug font-medium">{feature.name}</h3>
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3.5" /> : null}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{feature.summary}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={status.variant}>{feature.statusNote ?? status.label}</Badge>
        {bundled && feature.bundlePrice != null ? (
          <Badge variant="outline" className="border-primary/40 text-primary">
            Bundle · save €{euro(feature.price - feature.bundlePrice)}
          </Badge>
        ) : null}
        {requested ? (
          <Badge variant="secondary" className="gap-1">
            <Check /> Requested
          </Badge>
        ) : null}
      </div>

      {feature.caveat ? (
        <p className="border-t border-dashed border-border pt-2.5 text-xs text-muted-foreground">
          {feature.caveat}
        </p>
      ) : null}

      <div className="mt-auto flex items-baseline justify-end pt-1">
        <span className="font-mono text-lg font-semibold tabular-nums">
          <span className="text-sm font-normal text-muted-foreground">€</span>
          {euro(price)}
        </span>
      </div>
    </button>
  );
}
