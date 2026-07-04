"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Conversation, ConversationDisplayState } from "@/hooks/use-conversations";
import { useConversations, getConversationDisplayState } from "@/hooks/use-conversations";
import { InboxIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useMemo } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stateConfig: Record<
  ConversationDisplayState,
  { label: string; className: string }
> = {
  active: {
    label: "Aktif",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  pending: {
    label: "Bekleyen",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  taken_over: {
    label: "Devralınan",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  closed: {
    label: "Kapalı",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

export type ConversationFilter = "all" | "active" | "pending" | "taken_over";

interface ConversationListProps {
  filter: ConversationFilter;
  searchQuery: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConversationList({
  filter,
  searchQuery,
  onSelect,
  selectedId,
}: ConversationListProps) {
  const { data, isLoading } = useConversations();
  const conversations = data?.conversations ?? [];

  const filtered = useMemo(() => {
    if (!conversations.length) return [];
    let list = conversations;

    // Filter by display state (derived from DB state + assigned_agent)
    if (filter !== "all") {
      list = list.filter((c) => getConversationDisplayState(c) === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.guest_phone ?? "").toLowerCase().includes(q) ||
          (c.guest_name ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, filter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 px-4 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <div className="size-10 rounded-full bg-muted animate-pulse" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <InboxIcon className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Konuşma bulunamadı</p>
        <p className="text-xs mt-0.5">
          {searchQuery
            ? "Arama kriterlerinize uygun sonuç yok"
            : "Bu filtrede konuşma bulunmuyor"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {filtered.map((conv) => (
        <ConversationRow
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onSelect={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayState = getConversationDisplayState(conversation);
  const { label, className } = stateConfig[displayState];
  const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at), {
    addSuffix: true,
    locale: tr,
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted",
        isSelected && "bg-muted/80"
      )}
    >
      {/* Avatar */}
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
        {(conversation.guest_name ?? "")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
        {(conversation.unread_count ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
            {conversation.unread_count}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">
            {conversation.guest_name}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {timeAgo}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.last_message}
          </span>
          <Badge
            variant="secondary"
            className={cn("shrink-0 text-[10px] px-1.5", className)}
          >
            {label}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground/70">
          {conversation.guest_phone}{conversation.bungalow_name ? ` · ${conversation.bungalow_name}` : ""}
        </span>
      </div>
    </button>
  );
}
