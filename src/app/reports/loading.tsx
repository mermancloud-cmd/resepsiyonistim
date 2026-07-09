import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportsLoading() {
  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <div>
            <div className="h-5 w-48 rounded bg-muted animate-pulse mb-1" />
            <div className="h-3 w-36 rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* Date range skeleton */}
        <Card>
          <CardContent className="p-3">
            <div className="h-4 w-24 rounded bg-muted animate-pulse mb-3" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metric cards skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-32 rounded bg-muted animate-pulse mb-4" />
              <div className="h-40 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </MobileShell>
  );
}
