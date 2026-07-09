import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addDays, format, subDays, startOfMonth, endOfMonth } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyTrend {
  month: string;
  year: number;
  month_num: number;
  reservations: number;
  revenue: number;
  nights: number;
  occupancy_rate: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface DailyOccupancy {
  date: string;
  occupied_rooms: number;
  total_rooms: number;
  occupancy_rate: number;
  reservations_active: number;
  revenue: number;
}

export interface OccupancyReport {
  occupancy_rate: number;
  total_nights: number;
  reservations_count: number;
  avg_stay_length: number;
  cancellation_rate: number;
  total_revenue: number;
  avg_revenue_per_reservation: number;
  monthly_trend: MonthlyTrend[];
  status_breakdown: StatusBreakdownItem[];
}

interface OccupancyReportRaw {
  occupancy_rate: number;
  total_nights: number;
  reservations_count: number;
  avg_stay_length: number;
  cancellation_rate: number;
  total_revenue: number;
  avg_revenue_per_reservation: number;
  monthly_trend: string | MonthlyTrend[];
  status_breakdown: string | StatusBreakdownItem[];
}

// ─── Date Presets ─────────────────────────────────────────────────────────────

export interface DatePreset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Bu Ay",
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    label: "Geçen Ay",
    getRange: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: "Son 30 Gün",
    getRange: () => ({
      start: subDays(new Date(), 30),
      end: new Date(),
    }),
  },
  {
    label: "Son 90 Gün",
    getRange: () => ({
      start: subDays(new Date(), 90),
      end: new Date(),
    }),
  },
  {
    label: "Bu Yıl",
    getRange: () => ({
      start: new Date(new Date().getFullYear(), 0, 1),
      end: new Date(),
    }),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRawReport(raw: OccupancyReportRaw): OccupancyReport {
  return {
    ...raw,
    monthly_trend:
      typeof raw.monthly_trend === "string"
        ? safeJsonParse(raw.monthly_trend, [])
        : raw.monthly_trend ?? [],
    status_breakdown:
      typeof raw.status_breakdown === "string"
        ? safeJsonParse(raw.status_breakdown, [])
        : raw.status_breakdown ?? [],
  };
}

function safeJsonParse<T>(val: string, fallback: T): T {
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// ─── Fetch Functions ──────────────────────────────────────────────────────────

async function fetchOccupancyReport(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<OccupancyReport> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_occupancy_report", {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    return {
      occupancy_rate: 0,
      total_nights: 0,
      reservations_count: 0,
      avg_stay_length: 0,
      cancellation_rate: 0,
      total_revenue: 0,
      avg_revenue_per_reservation: 0,
      monthly_trend: [],
      status_breakdown: [],
    };
  }

  return parseRawReport(data[0] as OccupancyReportRaw);
}

async function fetchDailyOccupancy(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<DailyOccupancy[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_daily_occupancy", {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyOccupancy[];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function generateOccupancyCSV(
  report: OccupancyReport,
  dailyData: DailyOccupancy[],
  startDate: string,
  endDate: string
): string {
  const lines: string[] = [];

  // Header
  lines.push("Merman Bungalov - Doluluk/Maliyet Raporu");
  lines.push(`Dönem: ${startDate} - ${endDate}`);
  lines.push(`Oluşturulma: ${format(new Date(), "dd.MM.yyyy HH:mm")}`);
  lines.push("");

  // Summary section
  lines.push("ÖZET METRIKLER");
  lines.push("Metrik,Değer");
  lines.push(`Doluluk Oranı,%${report.occupancy_rate}`);
  lines.push(`Toplam Gece,${report.total_nights}`);
  lines.push(`Rezervasyon Sayısı,${report.reservations_count}`);
  lines.push(`Ortalama Kalış Süresi,${report.avg_stay_length} gece`);
  lines.push(`İptal Oranı,%${report.cancellation_rate}`);
  lines.push(`Toplam Gelir,₺${report.total_revenue}`);
  lines.push(`Ort. Rezervasyon Geliri,₺${report.avg_revenue_per_reservation}`);
  lines.push("");

  // Monthly trend
  lines.push("AYLIK TREND");
  lines.push("Ay,Rezervasyon,Gelir (₺),Gece,Doluluk (%)");
  for (const m of report.monthly_trend) {
    lines.push(
      `${m.month},${m.reservations},${m.revenue},${m.nights},${m.occupancy_rate}`
    );
  }
  lines.push("");

  // Daily occupancy
  if (dailyData.length > 0) {
    lines.push("GÜNLÜK DOLULUK");
    lines.push("Tarih,Dolu Oda,Toplam Oda,Doluluk (%),Rezervasyon Sayısı,Gelir (₺)");
    for (const d of dailyData) {
      lines.push(
        `${d.date},${d.occupied_rooms},${d.total_rooms},${d.occupancy_rate},${d.reservations_active},${d.revenue}`
      );
    }
    lines.push("");
  }

  // Status breakdown
  lines.push("DURUM DAĞILIMI");
  lines.push("Durum,Sayı,Yüzde (%)");
  for (const s of report.status_breakdown) {
    lines.push(`${s.status},${s.count},${s.percentage}`);
  }

  return lines.join("\n");
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;bom" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const DEFAULT_RANGE = {
  start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  end: format(new Date(), "yyyy-MM-dd"),
};

export function useOccupancyReport(
  startDate: string = DEFAULT_RANGE.start,
  endDate: string = DEFAULT_RANGE.end
) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<OccupancyReport, Error>({
    queryKey: ["occupancy-report", startDate, endDate, tenant?.id],
    enabled: isAuthenticated && !!tenant?.id,
    queryFn: async () => {
      return fetchOccupancyReport(tenant!.id, startDate, endDate);
    },
    staleTime: 30 * 1000,
  });
}

export function useDailyOccupancy(
  startDate: string = DEFAULT_RANGE.start,
  endDate: string = DEFAULT_RANGE.end
) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<DailyOccupancy[], Error>({
    queryKey: ["daily-occupancy", startDate, endDate, tenant?.id],
    enabled: isAuthenticated && !!tenant?.id,
    queryFn: async () => {
      return fetchDailyOccupancy(tenant!.id, startDate, endDate);
    },
    staleTime: 30 * 1000,
  });
}
