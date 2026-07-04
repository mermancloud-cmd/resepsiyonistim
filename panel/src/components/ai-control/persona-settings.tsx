"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Pencil,
  Globe,
  MessageSquare,
  AlertTriangle,
  Gauge,
  Lock,
} from "lucide-react";
import { mockAIPersona } from "@/lib/mock-data";
import type { AIPersona } from "@/lib/types";

const languageLabels: Record<string, string> = {
  TR: "Türkçe",
  EN: "İngilizce",
  AR: "Arapça",
};

export function PersonaSettings() {
  const persona: AIPersona = mockAIPersona;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-5 text-primary" />
          AI Persona Ayarları
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" disabled className="opacity-60">
            <Pencil className="size-3.5" />
            Düzenle
            <Lock className="size-3" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">AI Adı</span>
              </div>
              <p className="text-sm font-semibold">{persona.name}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Yanıt Dili</span>
              </div>
              <p className="text-sm font-semibold">
                {languageLabels[persona.language]}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Maks Konuşma Turu
                </span>
              </div>
              <p className="text-sm font-semibold">
                {persona.maxConversationTurns} tur
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Otomatik Devralma Eşiği
                </span>
              </div>
              <p className="text-sm font-semibold">
                {persona.autoHandoffThreshold} mesaj
              </p>
            </div>
          </div>

          <Separator />

          {/* Handoff Trigger Phrases */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="size-3.5 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Devralma Tetikleyici İfadeler
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Misafir bu ifadeleri kullandığında konuşma otomatik olarak size
              devredilir.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {persona.handoffTriggerPhrases.map((phrase) => (
                <Badge
                  key={phrase}
                  variant="secondary"
                  className="text-xs py-1 px-2"
                >
                  &ldquo;{phrase}&rdquo;
                </Badge>
              ))}
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-dashed border-border p-3">
            <Lock className="size-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Persona düzenleme özelliği yakında aktif olacak. Şu anda ayarlar
              salt okunur moddadır.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
