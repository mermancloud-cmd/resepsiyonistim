"use client";

import * as React from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Separator } from "@/components/ui/separator";
import { AIToggleCard } from "@/components/ai-control/ai-toggle-card";
import { PerformanceStats } from "@/components/ai-control/performance-stats";
import { ConversationToggles } from "@/components/ai-control/conversation-toggles";
import { PersonaSettings } from "@/components/ai-control/persona-settings";
import { Bot } from "lucide-react";

export function AIControlClient() {
  return (
    <MobileShell>
      <div className="flex flex-col gap-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Bot className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              AI Kontrol Paneli
            </h2>
            <p className="text-xs text-muted-foreground">
              Elif — AI Misafir İlişkileri Asistanı
            </p>
          </div>
        </div>

        <AIToggleCard />
        <PerformanceStats />
        <Separator />
        <ConversationToggles />
        <Separator />
        <PersonaSettings />
      </div>
    </MobileShell>
  );
}
