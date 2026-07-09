export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 pt-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>

        {/* Status card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="size-12 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* QR / Setup section */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="size-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Connected device info */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-8 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
