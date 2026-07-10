import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type {
  MusteriFeedback,
  FeedbackSummary,
  FeedbackTrendPoint,
  FeedbackWithHumanization,
  MusteriFeedbackCategory,
} from "@/lib/types";
import type { FeedbackSubmitInput } from "@/app/api/feedback/route";

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const mockFeedbackSummary: FeedbackSummary = {
  total_count: 24,
  avg_rating: 4.2,
  rating_distribution: [
    { rating: 5, count: 10 },
    { rating: 4, count: 8 },
    { rating: 3, count: 4 },
    { rating: 2, count: 1 },
    { rating: 1, count: 1 },
  ],
  category_breakdown: [
    { category: "genel", count: 8, avg_rating: 4.5 },
    { category: "hiz", count: 5, avg_rating: 4.0 },
    { category: "rezervasyon", count: 4, avg_rating: 4.8 },
    { category: "iletisim", count: 3, avg_rating: 3.7 },
    { category: "oda_bilgisi", count: 2, avg_rating: 3.5 },
    { category: "diger", count: 2, avg_rating: 4.0 },
  ],
  weekly_trend: [
    { week: "2026-06-16", count: 6, avg_rating: 4.0 },
    { week: "2026-06-23", count: 8, avg_rating: 4.3 },
    { week: "2026-06-30", count: 5, avg_rating: 4.4 },
    { week: "2026-07-07", count: 5, avg_rating: 4.0 },
  ],
  recent_comments: [
    { id: "fb-1", rating: 5, category: "genel", comment: "Çok memnun kaldık, her şey çok güzeldi.", submitted_at: new Date().toISOString(), conversation_id: null },
    { id: "fb-2", rating: 4, category: "hiz", comment: "Hızlı dönüş oldu, teşekkürler.", submitted_at: new Date(Date.now() - 86400000).toISOString(), conversation_id: null },
  ],
};

export const mockFeedbackTrend: FeedbackTrendPoint[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
  count: Math.floor(Math.random() * 5) + 1,
  avg_rating: Math.round((3 + Math.random() * 2) * 10) / 10,
}));

// ─── Category Labels ──────────────────────────────────────────────────────────

export const FEEDBACK_CATEGORIES: { value: MusteriFeedbackCategory; label: string }[] = [
  { value: "genel", label: "Genel" },
  { value: "hiz", label: "Hız" },
  { value: "rezervasyon", label: "Rezervasyon" },
  { value: "oda_bilgisi", label: "Oda Bilgisi" },
  { value: "fiyat", label: "Fiyat" },
  { value: "iletisim", label: "İletişim" },
  { value: "insan_kalitesi", label: "İnsan Kalitesi" },
  { value: "diger", label: "Diğer" },
];

export function getCategoryLabel(cat: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// ─── Hook: Feedback Summary ──────────────────────────────────────────────────

export function useFeedbackSummary(days: number = 30) {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = createClient();

  return useQuery<FeedbackSummary, Error>({
    queryKey: ["feedback-summary", tenant?.id, days],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_feedback_summary", {
          p_tenant_id: tenant!.id,
          p_days: days,
        });

      if (error) {
        // Fallback: manual aggregation
        const { data: fallback } = await supabase
          .from("musteri_feedback")
          .select("*")
          .eq("tenant_id", tenant!.id)
          .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
          .order("created_at", { ascending: false });

        if (error || !fallback?.length) throw new Error(error?.message ?? "Veri yok");

        return aggregateFeedback(fallback);
      }

      return data as FeedbackSummary;
    },
    staleTime: 30 * 1000,
  });
}

// ─── Hook: Feedback Trend ────────────────────────────────────────────────────

export function useFeedbackTrend(days: number = 30) {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = createClient();

  return useQuery<FeedbackTrendPoint[], Error>({
    queryKey: ["feedback-trend", tenant?.id, days],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_feedback_trend", {
          p_tenant_id: tenant!.id,
          p_days: days,
        });

      if (error) {
        // Fallback: daily aggregation from raw data
        return fetchDailyTrend(tenant!.id, days);
      }

      return data;
    },
    staleTime: 30 * 1000,
  });
}

// ─── Hook: All Feedback ──────────────────────────────────────────────────────

export function useFeedbackList(options?: { category?: MusteriFeedbackCategory; limit?: number }) {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = createClient();

  return useQuery<MusteriFeedback[], Error>({
    queryKey: ["feedback-list", tenant?.id, options],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      let query = supabase
        .from("musteri_feedback")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(options?.limit ?? 50);

      if (options?.category) {
        query = query.eq("category", options.category);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as MusteriFeedback[];
    },
    staleTime: 15 * 1000,
  });
}

// ─── Hook: Feedback with Humanization (I2 bağlantısı) ──────────────────────

export function useFeedbackWithHumanization() {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = createClient();

  return useQuery<FeedbackWithHumanization[], Error>({
    queryKey: ["feedback-humanization", tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_with_humanization")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (error) {
        // View may not exist if I2 migration wasn't run
        return [];
      }

      return (data ?? []) as FeedbackWithHumanization[];
    },
    staleTime: 30 * 1000,
  });
}

// ─── Hook: Submit Feedback (client-side via API route) ──────────────────────

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<FeedbackSubmitInput, "tenant_id">) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, tenant_id: tenant!.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gönderilemedi");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-summary"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-trend"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
    },
  });
}

// ─── Fallback aggregate functions ────────────────────────────────────────────

function aggregateFeedback(rows: MusteriFeedback[]): FeedbackSummary {
  const total = rows.length;
  if (total === 0) {
    return {
      total_count: 0,
      avg_rating: 0,
      rating_distribution: [],
      category_breakdown: [],
      weekly_trend: [],
      recent_comments: [],
    };
  }

  const avgRating = Math.round((rows.reduce((s, r) => s + r.rating, 0) / total) * 100) / 100;

  // Rating distribution
  const dist: Record<number, number> = {};
  const catBreak: Record<string, { count: number; sum: number }> = {};
  const weekData: Record<string, { count: number; sum: number }> = {};

  for (const r of rows) {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    if (!catBreak[r.category]) catBreak[r.category] = { count: 0, sum: 0 };
    catBreak[r.category].count++;
    catBreak[r.category].sum += r.rating;

    const week = new Date(r.created_at).toISOString().split("T")[0];
    if (!weekData[week]) weekData[week] = { count: 0, sum: 0 };
    weekData[week].count++;
    weekData[week].sum += r.rating;
  }

  return {
    total_count: total,
    avg_rating: avgRating,
    rating_distribution: Object.entries(dist)
      .map(([rating, count]) => ({ rating: Number(rating), count }))
      .sort((a, b) => b.rating - a.rating),
    category_breakdown: Object.entries(catBreak).map(([category, d]) => ({
      category,
      count: d.count,
      avg_rating: Math.round((d.sum / d.count) * 100) / 100,
    })),
    weekly_trend: Object.entries(weekData).map(([week, d]) => ({
      week,
      count: d.count,
      avg_rating: Math.round((d.sum / d.count) * 100) / 100,
    })),
    recent_comments: rows
      .filter((r) => r.comment)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        category: r.category,
        comment: r.comment,
        submitted_at: r.submitted_at,
        conversation_id: r.conversation_id,
      })),
  };
}

async function fetchDailyTrend(tenantId: string, days: number): Promise<FeedbackTrendPoint[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("musteri_feedback")
    .select("created_at, rating")
    .eq("tenant_id", tenantId)
    .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
    .order("created_at", { ascending: true });

  const dayMap: Record<string, { count: number; sum: number }> = {};
  for (const r of data ?? []) {
    const d = r.created_at.split("T")[0];
    if (!dayMap[d]) dayMap[d] = { count: 0, sum: 0 };
    dayMap[d].count++;
    dayMap[d].sum += r.rating;
  }

  const points: FeedbackTrendPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    const day = dayMap[d];
    points.push({
      date: d,
      count: day?.count ?? 0,
      avg_rating: day ? Math.round((day.sum / day.count) * 100) / 100 : 0,
    });
  }

  return points;
}
