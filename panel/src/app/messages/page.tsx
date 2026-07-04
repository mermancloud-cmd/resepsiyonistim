"use client";
import * as React from "react";


import { useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import type { ConversationFilter } from "@/components/messages/conversation-list";
import { ConversationDetail } from "@/components/messages/conversation-detail";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageCircle } from "lucide-react";

const filterTabs: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "pending", label: "Bekleyen" },
  { value: "taken_over", label: "Devralınan" },
];

export default function MessagesPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  if (!isMounted) return null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setTimeout(() => setSelectedId(null), 300);
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col -mx-4 -my-4 min-h-[calc(100dvh-7.5rem)]">
        {/* Section header */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <MessageCircle className="size-4 text-teal-600" />
            <h2 className="text-lg font-semibold tracking-tight">Mesajlar</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Misafir konuşmalarınızı yönetin
          </p>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Telefon numarası veya isim ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-3">
          <Tabs
            defaultValue="all"
            onValueChange={(v) => setFilter(v as ConversationFilter)}
          >
            <TabsList className="w-full">
              {filterTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Conversation list */}
        <div className="min-h-0 flex-1">
          <ConversationList
            filter={filter}
            searchQuery={searchQuery}
            onSelect={handleSelect}
            selectedId={selectedId}
          />
        </div>

        {/* Conversation detail sheet */}
        <ConversationDetail
          conversationId={selectedId}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
        />
      </div>
    </MobileShell>
  );
}
