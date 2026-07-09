export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 flex items-baseline gap-1">
                <div className="h-7 w-10 animate-pulse rounded bg-muted" />
                <div className="h-3 w-6 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Chart card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                <div className="h-6 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Feedback list */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 border-b pb-3 last:border-0">
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
