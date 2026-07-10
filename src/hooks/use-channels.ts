"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { startOfWeek, endOfWeek, subDays, format } from "date-fns";
import type {
  ChannelInfo,
  ChannelType,
  ChannelConfig,
  ChannelMetrics,
  UnifiedMessage,
} from "@/lib/types";

// ─── Query key factory ───────────────────────────────────────────────────────

export const channelKeys = {
  all: ["channels"] as const,
  list: (filters?: { activeOnly?: boolean }) =>
    ["channels", "list", filters] as const,
  detail: (channelType: ChannelType) =>
    ["channels", "detail", channelType] as const,
  metrics: (channelType: ChannelType) =>
    ["channels", "metrics", channelType] as const,
  messages: (filters?: { channelType?: ChannelType | "all"; search?: string }) =>
    ["channels", "messages", filters] as const,
};

// ─── Helper: convert DB row to ChannelInfo ──────────────────────────────────

function rowToChannelInfo(row: Record<string, unknown>): ChannelInfo {
  const rawSettings = row.settings as Record<string, unknown> | null;
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    channel_type: row.channel_type as ChannelType,
    name: row.name as string,
    is_active: (row.is_active ?? true) as boolean,
    settings: (rawSettings ?? {}) as unknown as ChannelConfig,
    connected: (row.webhook_verified_at != null) as boolean,
    last_error: (row.last_error as string) ?? null,
    last_error_at: (row.last_error_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Query: list all channels (tenant-scoped) ─────────────────────────────

export function useChannels(activeOnly?: boolean) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<ChannelInfo[], Error>({
    queryKey: channelKeys.list({ activeOnly }),
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("channels")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("channel_type", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return ((data as Record<string, unknown>[]) ?? []).map(rowToChannelInfo);
    },
    staleTime: 10 * 1000,
  });
}

// ─── Query: single channel by type ─────────────────────────────────────────

export function useChannel(channelType: ChannelType | null) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<ChannelInfo | null, Error>({
    queryKey: channelKeys.detail(channelType ?? "whatsapp"),
    enabled: isAuthenticated && !!tenant && !!channelType,
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("channel_type", channelType!)
        .single();

      if (error) throw new Error(error.message);
      return rowToChannelInfo(data as Record<string, unknown>);
    },
  });
}

// ─── Mutation: upsert channel (toggle / update settings) ────────────────────

export function useUpsertChannel() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel_type,
      name,
      is_active,
      settings,
    }: {
      channel_type: ChannelType;
      name?: string;
      is_active?: boolean;
      settings?: Partial<ChannelConfig>;
    }) => {
      const supabase = createClient();

      const payload: Record<string, unknown> = {
        tenant_id: tenant!.id,
        channel_type,
        name: name ?? channel_type,
      };

      if (is_active !== undefined) payload.is_active = is_active;
      if (settings !== undefined) payload.settings = settings;

      const { data, error } = await supabase
        .from("channels")
        .upsert(payload, { onConflict: "tenant_id, channel_type, name" })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToChannelInfo(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
}

// ─── Mutation: toggle active/passive ──────────────────────────────────────

export function useToggleChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("channels")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToChannelInfo(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    },
    // Optimistic update
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: channelKeys.all });
      const previous = queryClient.getQueryData<ChannelInfo[]>(
        channelKeys.list()
      );
      queryClient.setQueryData<ChannelInfo[]>(
        channelKeys.list(),
        (old) =>
          old?.map((ch) =>
            ch.id === id ? { ...ch, is_active } : ch
          ) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(channelKeys.list(), context.previous);
      }
    },
  });
}

// ─── Query: channel metrics ────────────────────────────────────────────────

export function useChannelMetrics(channelType: ChannelType | null) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<ChannelMetrics | null, Error>({
    queryKey: channelKeys.metrics(channelType ?? "whatsapp"),
    enabled: isAuthenticated && !!tenant && !!channelType,
    queryFn: async () => {
      const supabase = createClient();

      const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Get channel id first
      const { data: ch } = await supabase
        .from("channels")
        .select("id")
        .eq("tenant_id", tenant!.id)
        .eq("channel_type", channelType!)
        .single();

      if (!ch) return null;

      // Fetch daily metrics for last 7 days
      const { data: rows } = await supabase
        .from("channel_metrics")
        .select("*")
        .eq("channel_id", ch.id)
        .gte("date", sevenDaysAgo)
        .lte("date", today)
        .order("date", { ascending: true });

      const metrics = (rows ?? []) as {
        date: string;
        messages_inbound: number;
        messages_outbound: number;
        active_conversations: number;
        avg_response_time_seconds: number;
        handoff_count: number;
      }[];

      const totalInbound = metrics.reduce((s, r) => s + (r.messages_inbound ?? 0), 0);
      const totalOutbound = metrics.reduce((s, r) => s + (r.messages_outbound ?? 0), 0);
      const weeklyMessages = totalInbound + totalOutbound;
      const todayMetrics = metrics.find((r) => r.date === today);
      const avgResponse = metrics.length > 0
        ? Math.round(
            metrics.reduce((s, r) => s + (r.avg_response_time_seconds ?? 0), 0) /
              metrics.length
          )
        : 0;
      const totalHandoffs = metrics.reduce((s, r) => s + (r.handoff_count ?? 0), 0);
      const handoffRate = weeklyMessages > 0
        ? Math.round((totalHandoffs / weeklyMessages) * 100)
        : 0;

      return {
        channel_type: channelType!,
        messages_today: totalInbound,
        messages_week: weeklyMessages,
        avg_response_time_seconds: avgResponse,
        active_conversations: todayMetrics?.active_conversations ?? 0,
        handoff_rate_percent: handoffRate,
        daily_messages: metrics.map((r) => ({
          date: r.date,
          count: (r.messages_inbound ?? 0) + (r.messages_outbound ?? 0),
        })),
      };
    },
    staleTime: 30 * 1000,
  });
}

// ─── Query: unified message log ────────────────────────────────────────────

export function useUnifiedMessages(filters?: {
  channelType?: ChannelType | "all";
  search?: string;
}) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<UnifiedMessage[], Error>({
    queryKey: channelKeys.messages(filters),
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("messages")
        .select("*, conversations!inner(channel_type, guest_name)")
        .eq("conversations.tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.channelType && filters.channelType !== "all") {
        query = query.eq("conversations.channel_type", filters.channelType) as typeof query;
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as {
        id: string;
        role: string;
        content: string;
        created_at: string;
        conversations: {
          channel_type: ChannelType;
          guest_name: string | null;
        };
      }[];

      let messages: UnifiedMessage[] = rows.map((row) => ({
        id: row.id,
        channel_type: row.conversations?.channel_type ?? "whatsapp",
        direction: (row.role === "assistant" ? "outbound" : "inbound") as UnifiedMessage["direction"],
        content: row.content,
        sender_name: row.conversations?.guest_name ?? "Misafir",
        timestamp: row.created_at,
        is_handoff: row.role === "assistant" && row.content.includes("HUMAN_HANDOFF"),
        is_ai: row.role === "assistant" && !row.content.includes("HUMAN_HANDOFF"),
        status: "sent",
      }));

      // Apply search filter client-side
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        messages = messages.filter(
          (m) =>
            m.content.toLowerCase().includes(q) ||
            m.sender_name.toLowerCase().includes(q)
        );
      }

      return messages;
    },
    staleTime: 15 * 1000,
  });
}

// ─── Status badge helper ────────────────────────────────────────────────────

export function getChannelStatusVariant(
  connected: boolean,
  isActive: boolean,
  lastError: string | null
): "success" | "warning" | "destructive" | "secondary" {
  if (!isActive) return "secondary";
  if (lastError) return "destructive";
  if (connected) return "success";
  return "warning";
}

export function getChannelStatusLabel(
  connected: boolean,
  isActive: boolean,
  lastError: string | null
): string {
  if (!isActive) return "Pasif";
  if (lastError) return "Hata";
  if (connected) return "Bağlı";
  return "Bağlı Değil";
}
