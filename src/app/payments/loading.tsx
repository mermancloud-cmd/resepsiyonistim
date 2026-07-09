export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>

        {/* Balance card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="mb-4 h-8 w-28 animate-pulse rounded bg-muted" />
          <div className="mb-3 h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Payment method card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="space-y-1">
                  <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-14 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
