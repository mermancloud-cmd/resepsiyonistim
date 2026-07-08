export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-6 w-12 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-2.5 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Chart card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Content card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-0">
                <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
