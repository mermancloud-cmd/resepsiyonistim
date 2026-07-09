export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />

        {/* Plan card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Plan comparison */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Current subscription info */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
