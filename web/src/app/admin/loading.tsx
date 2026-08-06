/**
 * Loading state for the admin area. Mirrors the `AdminShell` chrome — sidebar
 * on desktop, app bar, content area, and the mobile bottom toolbar — so a slow
 * database query swaps content in without anything shifting under a thumb that
 * is already moving (spec §10 X1). Static markup only: the real shell needs
 * `usePathname`, which a Suspense fallback has no use for.
 */
function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function AdminLoading() {
  return (
    <div className="flex min-h-dvh" role="status" aria-label="Loading">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="px-2 py-3">
          <Bar className="h-5 w-28" />
          <Bar className="mt-2 h-3 w-20" />
        </div>
        <div className="mt-2 flex flex-col gap-5">
          {[4, 3, 4].map((count, group) => (
            <div key={group} className="flex flex-col gap-2">
              <Bar className="mx-3 h-2.5 w-16" />
              {Array.from({ length: count }).map((_, item) => (
                <Bar key={item} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Same height and status-bar padding as the real app bar, so the
            installed PWA doesn't jump when content swaps in. */}
        <header className="flex min-h-14 items-center border-b px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Bar className="h-4 w-32" />
        </header>

        <main className="flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-6 md:pb-6">
          <Bar className="h-4 w-40" />
          <div className="mt-4 flex flex-col gap-2 rounded-xl p-4 ring-1 ring-foreground/10">
            {Array.from({ length: 6 }).map((_, row) => (
              <Bar key={row} className="h-10 w-full" />
            ))}
          </div>
        </main>
      </div>

      {/* The bottom toolbar's silhouette, where the real one will be. */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-stretch gap-1 px-2 py-1">
          {Array.from({ length: 5 }).map((_, tab) => (
            <div key={tab} className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1">
              <Bar className="size-5 rounded-full" />
              <Bar className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
