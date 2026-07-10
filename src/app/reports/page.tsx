"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, subDays } from "date-fns";
import { tr } from "date-fns/locale";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  useOccupancyReport,
  useDailyOccupancy,
  generateOccupancyCSV,
  downloadCSV,
  DATE_PRESETS,
  type MonthlyTrend,
  type DailyOccupancy,
} from "@/hooks/use-occupancy-report";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  BedDouble,
  Building2,
  IndianRupee,
  X,
  Percent,
  Hotel,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "primary",
  isLoading = false,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  accent?: "primary" | "amber" | "emerald" | "violet" | "rose";
  isLoading?: boolean;
  trend?: { value: number; positive: boolean };
}) {
  const accentColors = {
    primary: "bg-teal-50 dark:bg-teal-900/20 text-teal-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    violet: "bg-violet-50 dark:bg-violet-900/20 text-violet-600",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className={cn("rounded-lg p-2", accentColors[accent])}>
              <Icon className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn("rounded-lg p-2", accentColors[accent])}>
            <Icon className="size-4" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.positive ? (
              <ArrowUpRight className="size-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="size-3 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {trend.value}%
            </span>
            <span className="text-[10px] text-muted-foreground">değişim</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Color Map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  cancelled: "#ef4444",
  checked_in: "#3b82f6",
  checked_out: "#8b5cf6",
  no_show: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekleyen",
  confirmed: "Onaylı",
  cancelled: "İptal",
  checked_in: "Giriş Yaptı",
  checked_out: "Çıkış Yaptı",
  no_show: "Gelmedi",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = "",
  valueSuffix = "",
}: {
  active?: boolean;
  payload?: { value: number; color: string; name: string }[];
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {valuePrefix}
          {p.value.toLocaleString("tr-TR")}
          {valueSuffix}
        </p>
      ))}
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const isMounted = useIsMounted();

  // Date range state
  const [startDate, setStartDate] = React.useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [activePreset, setActivePreset] = React.useState<string>("Son 30 Gün");

  // Date input editing
  const [editStart, setEditStart] = React.useState(startDate);
  const [editEnd, setEditEnd] = React.useState(endDate);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  // Fetch data
  const {
    data: report,
    isLoading,
    isFetching,
    refetch,
  } = useOccupancyReport(startDate, endDate);

  const {
    data: dailyData,
    isLoading: isLoadingDaily,
  } = useDailyOccupancy(startDate, endDate);

  // Apply date preset
  const applyPreset = React.useCallback(
    (preset: (typeof DATE_PRESETS)[number]) => {
      const { start, end } = preset.getRange();
      const s = format(start, "yyyy-MM-dd");
      const e = format(end, "yyyy-MM-dd");
      setStartDate(s);
      setEndDate(e);
      setEditStart(s);
      setEditEnd(e);
      setActivePreset(preset.label);
      setShowDatePicker(false);
    },
    []
  );

  // Apply custom date
  const applyCustomDate = React.useCallback(() => {
    if (editStart && editEnd && editStart <= editEnd) {
      setStartDate(editStart);
      setEndDate(editEnd);
      setActivePreset("");
      setShowDatePicker(false);
    }
  }, [editStart, editEnd]);

  // Export CSV
  const handleExport = React.useCallback(() => {
    if (!report) return;
    const csv = generateOccupancyCSV(report, dailyData ?? [], startDate, endDate);
    const filename = `doluluk-raporu_${startDate}_${endDate}.csv`;
    downloadCSV(csv, filename);
  }, [report, dailyData, startDate, endDate]);

  if (!isMounted) return null;

  const showSkeleton = isLoading && !report;
  const hasData = report && report.reservations_count > 0;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Doluluk/Maliyet Raporları</h2>
              <p className="text-xs text-muted-foreground">
                Doluluk oranı, gelir ve rezervasyon metrikleri
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleExport}
              disabled={!hasData || isFetching}
              title="CSV Dışa Aktar"
            >
              <Download className="size-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Yenile"
            >
              {isFetching ? (
                <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
              ) : (
                <RefreshCw className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Date Range Selector ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">Tarih Aralığı</span>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {startDate} - {endDate}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                {showDatePicker ? (
                  <X className="size-3.5" />
                ) : (
                  <Calendar className="size-3.5" />
                )}
              </Button>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                    activePreset === preset.label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {showDatePicker && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-1 block">
                    Başlangıç
                  </label>
                  <Input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <span className="text-muted-foreground text-xs mt-5">-</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-1 block">
                    Bitiş
                  </label>
                  <Input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 mt-4 text-xs"
                  onClick={applyCustomDate}
                  disabled={!editStart || !editEnd || editStart > editEnd}
                >
                  Uygula
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Summary Metrics — 2x2 Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            title="Doluluk Oranı"
            value={showSkeleton ? "—" : `%${report?.occupancy_rate ?? 0}`}
            subtitle={
              showSkeleton
                ? undefined
                : `${report?.total_nights ?? 0} toplam gece`
            }
            icon={Percent}
            accent="primary"
            isLoading={showSkeleton}
          />
          <SummaryCard
            title="Toplam Rezervasyon"
            value={
              showSkeleton
                ? "—"
                : (report?.reservations_count ?? 0).toLocaleString("tr-TR")
            }
            subtitle={
              showSkeleton
                ? undefined
                : `Ort. ${report?.avg_stay_length ?? 0} gece`
            }
            icon={Building2}
            accent="amber"
            isLoading={showSkeleton}
          />
          <SummaryCard
            title="Toplam Gelir"
            value={
              showSkeleton
                ? "—"
                : `₺${(report?.total_revenue ?? 0).toLocaleString("tr-TR")}`
            }
            subtitle={
              showSkeleton
                ? undefined
                : `Ort. ₺${(report?.avg_revenue_per_reservation ?? 0).toLocaleString("tr-TR")}/rez`
            }
            icon={IndianRupee}
            accent="emerald"
            isLoading={showSkeleton}
          />
          <SummaryCard
            title="İptal Oranı"
            value={
              showSkeleton ? "—" : `%${report?.cancellation_rate ?? 0}`
            }
            icon={X}
            accent="rose"
            isLoading={showSkeleton}
          />
        </div>

        <Separator />

        {/* ── No Data State ────────────────────────────────────────────────── */}
        {!hasData && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart3 className="mx-auto size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Seçilen dönem için veri bulunamadı
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Farklı bir tarih aralığı seçmeyi deneyin
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Monthly Trend Chart ──────────────────────────────────────────── */}
        {hasData && report!.monthly_trend.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Aylık Rezervasyon Trendi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report!.monthly_trend}
                    margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        const parts = val.split("-");
                        return `${parts[1]}/${parts[0].slice(2)}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={
                        <ChartTooltip valuePrefix="₺" valueSuffix="" />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      name="Gelir (₺)"
                      fill="#14b8a6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Secondary — nights bar */}
              <div className="h-32 mt-4">
                <p className="text-xs text-muted-foreground mb-2">Geceleme Sayısı</p>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart
                    data={report!.monthly_trend}
                    margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => {
                        const parts = val.split("-");
                        return `${parts[1]}/${parts[0].slice(2)}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey="nights"
                      name="Gece"
                      fill="#a78bfa"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Occupancy Rate Trend ─────────────────────────────────────────── */}
        {hasData && report!.monthly_trend.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="size-4 text-amber-500" />
                Aylık Doluluk Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={report!.monthly_trend}
                    margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        const parts = val.split("-");
                        return `${parts[1]}/${parts[0].slice(2)}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(val) => `%${val}`}
                    />
                    <Tooltip
                      content={<ChartTooltip valueSuffix="%" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="occupancy_rate"
                      name="Doluluk"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Daily Occupancy ──────────────────────────────────────────────── */}
        {dailyData && dailyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hotel className="size-4 text-primary" />
                Günlük Doluluk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(val) => {
                        try {
                          return format(parseISO(val), "d MMM", { locale: tr });
                        } catch {
                          return val;
                        }
                      }}
                      interval={Math.max(Math.floor(dailyData.length / 8), 1)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(val) => `%${val}`}
                    />
                    <Tooltip
                      content={<ChartTooltip valueSuffix="%" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="occupancy_rate"
                      name="Doluluk"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>
                  Ort. doluluk:{dailyData.length > 0
                    ? `%${(dailyData.reduce((s, d) => s + d.occupancy_rate, 0) / dailyData.length).toFixed(1)}`
                    : "%0"}
                </span>
                <span>
                  Toplam oda: {dailyData[0]?.total_rooms ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Daily Revenue ────────────────────────────────────────────────── */}
        {dailyData && dailyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="size-4 text-emerald-600" />
                Günlük Gelir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    margin={{ top: 5, right: 5, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(val) => {
                        try {
                          return format(parseISO(val), "d MMM", { locale: tr });
                        } catch {
                          return val;
                        }
                      }}
                      interval={Math.max(Math.floor(dailyData.length / 8), 1)}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `₺${val}`}
                    />
                    <Tooltip
                      content={<ChartTooltip valuePrefix="₺" />}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Gelir (₺)"
                      fill="#22c55e"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>
                  Günlük ort. gelir:{dailyData.length > 0
                    ? `₺${(dailyData.reduce((s, d) => s + d.revenue, 0) / dailyData.length).toFixed(0)}`
                    : "₺0"}
                </span>
                <span>
                  Toplam: ₺{dailyData.reduce((s, d) => s + d.revenue, 0).toLocaleString("tr-TR")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Status Breakdown ─────────────────────────────────────────────── */}
        {hasData && report!.status_breakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="size-4 text-primary" />
                Rezervasyon Durum Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {report!.status_breakdown.map((item) => (
                  <div key={item.status} className="flex items-center gap-3">
                    <div
                      className="size-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[item.status] ?? "#6b7280",
                      }}
                    />
                    <span className="text-xs font-medium w-24 shrink-0">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor:
                            STATUS_COLORS[item.status] ?? "#6b7280",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                      {item.count}
                    </span>
                    <span className="text-[11px] text-muted-foreground w-10 text-right shrink-0">
                      %{item.percentage}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pie Chart ────────────────────────────────────────────────────── */}
        {hasData && report!.status_breakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="size-4 text-primary" />
                Dağılım Grafiği
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report!.status_breakdown.map((s) => ({
                        name: STATUS_LABELS[s.status] ?? s.status,
                        value: s.count,
                        color: STATUS_COLORS[s.status] ?? "#6b7280",
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {report!.status_breakdown.map((item) => (
                        <Cell
                          key={item.status}
                          fill={STATUS_COLORS[item.status] ?? "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Export Button ────────────────────────────────────────────────── */}
        {hasData && (
          <Button
            className="w-full h-11 text-sm font-medium gap-2"
            onClick={handleExport}
          >
            <Download className="size-4" />
            CSV Olarak Dışa Aktar
          </Button>
        )}

        {/* ── Schema Gap Note ──────────────────────────────────────────────── */}
        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <BarChart3 className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-0.5">Notlar (J fazı için)</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
                  <li>
                    Oda sayısı varsayılan olarak 5 alınmıştır —
                    <code className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                      rooms
                    </code>
                    tablosundan dinamik okuma J fazında eklenecek
                  </li>
                  <li>
                    Gelir verisi rezervasyon toplamından hesaplanır — ödeme
                    onayı J fazında eklenecek
                  </li>
                  <li>
                    <code className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                      room_pricing
                    </code>
                    tablosu henüz mevcut değil — sezonluk fiyatlandırma J fazında
                    eklenecek
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileShell>
  );
}
