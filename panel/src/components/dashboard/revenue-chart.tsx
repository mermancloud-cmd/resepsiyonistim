"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function formatTRY(value: number) {
  return `₺${value.toLocaleString("tr-TR")}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-teal-600 font-semibold">{formatTRY(payload[0].value)}</p>
    </div>
  );
}

export function RevenueChart() {
  const { data, isLoading } = useDashboardStats();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Haftalık Gelir</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[180px] items-center justify-center">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.weeklyRevenue ?? []}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                barCategoryGap="20%"
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  hide
                  domain={[0, "auto"]}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Bu hafta toplam</span>
          <span className="font-semibold text-foreground">
            {data ? formatTRY((data.weeklyRevenue ?? []).reduce((s, d) => s + d.revenue, 0)) : "–"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
