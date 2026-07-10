export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-44 animate-pulse rounded bg-muted mt-1" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-2.5 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Funnel card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 animate-pulse rounded-full bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3 w-10 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
