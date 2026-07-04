"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Banknote,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import type { RevenueIndicator } from "@/hooks/use-analytics-dashboard";

function formatTRY(value: number) {
  return `₺${value.toLocaleString("tr-TR")}`;
}

export function RevenueIndicatorsCard({
  data,
  isLoading,
}: {
  data?: RevenueIndicator;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Gelir Göstergeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-6 w-20 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      label: "Bekleyen IBAN",
      value: `${data?.pending_iban_count ?? 0}`,
      subValue: formatTRY(data?.pending_iban_total ?? 0),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Onaylı Rezervasyon",
      value: `${data?.confirmed_bookings_count ?? 0}`,
      subValue: formatTRY(data?.confirmed_bookings_total ?? 0),
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Bugünkü Gelir",
      value: formatTRY(data?.today_revenue ?? 0),
      subValue: "Bugün",
      icon: Banknote,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      label: "Toplam Bekleyen",
      value: formatTRY(
        (data?.pending_iban_total ?? 0) + (data?.confirmed_bookings_total ?? 0)
      ),
      subValue: "İşlemde",
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Gelir Göstergeleri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/50"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`flex size-6 items-center justify-center rounded-md ${item.bgColor}`}
                >
                  <item.icon className={`size-3 ${item.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <p className="text-base font-bold tracking-tight">{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {item.subValue}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
