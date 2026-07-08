export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>

        {/* Message list skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
