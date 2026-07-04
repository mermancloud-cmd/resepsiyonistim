"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Home,
  MapPin,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import type { InquiryBreakdown } from "@/hooks/use-analytics-dashboard";

const categoryConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  reservation: {
    label: "Rezervasyon",
    icon: CalendarCheck,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
  },
  amenities: {
    label: "Olanaklar",
    icon: Home,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  directions: {
    label: "Yol Tarifi",
    icon: MapPin,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
  },
  cancellation: {
    label: "İptal",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
  other: {
    label: "Diğer",
    icon: MoreHorizontal,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export function InquiryBreakdownCard({
  data,
  isLoading,
}: {
  data?: InquiryBreakdown[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Kategori Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-full rounded-full bg-muted animate-pulse mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = data ?? [];
  const maxCount = Math.max(...items.map((d) => d.count), 1);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Misafir Soru Dağılımı</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const config = categoryConfig[item.category] ?? categoryConfig.other;
            const Icon = config.icon;
            const barWidth = (item.count / maxCount) * 100;

            return (
              <div key={item.category} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    config.bgColor
                  )}
                >
                  <Icon className={cn("size-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.category === "reservation"
                          ? "bg-teal-500"
                          : item.category === "amenities"
                          ? "bg-blue-500"
                          : item.category === "directions"
                          ? "bg-violet-500"
                          : item.category === "cancellation"
                          ? "bg-red-500"
                          : "bg-muted-foreground/40"
                      )}
                      style={{ width: `${Math.max(barWidth, 3)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Bugün henüz konuşma yok
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
