"use client";

import * as React from "react";
import { Sparkles, MessageSquare, User, Heart, Bot } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GreetingData } from "@/lib/onboarding/types";

interface StepGreetingProps {
  data: GreetingData;
  onChange: (data: GreetingData) => void;
}

const TONE_OPTIONS = [
  { value: "formal" as const, label: "Resmi", desc: "Profesyonel ve mesafeli", emoji: "👔" },
  { value: "friendly" as const, label: "Samimi", desc: "Sıcak ve arkadaşça", emoji: "😊" },
  { value: "warm" as const, label: "İçten", desc: "Doğal ve misafirperver", emoji: "🏡" },
];

export function StepGreeting({ data, onChange }: StepGreetingProps) {
  function updateField<K extends keyof GreetingData>(key: K, value: GreetingData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Kişisel Karşılama</h3>
        <p className="text-xs text-muted-foreground">
          AI resepsiyonistinizin kişiliğini ve karşılama mesajını özelleştirin.
        </p>
      </div>

      {/* AI Persona info card */}
      <Card size="sm" className="bg-amber-50/50 dark:bg-amber-950/20 ring-amber-200 dark:ring-amber-800">
        <CardContent>
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Bot className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                AI Resepsiyonist Kişiselleştirme
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                WhatsApp üzerinden misafirlerinize otomatik yanıt veren AI resepsiyonistinizin
                adını, tonunu ve karşılama mesajını burada belirleyebilirsiniz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Persona name */}
      <div className="space-y-1.5">
        <Label htmlFor="personaName">
          <div className="flex items-center gap-1.5">
            <User className="size-3.5" />
            Resepsiyonist Adı
          </div>
        </Label>
        <Input
          id="personaName"
          placeholder="örn: Elif, Ayşe, Zeynep"
          value={data.personaName}
          onChange={(e) => updateField("personaName", e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Misafirler bu isimle hitap edilecektir.
        </p>
      </div>

      {/* Persona tone */}
      <div className="space-y-2">
        <Label>
          <div className="flex items-center gap-1.5">
            <Heart className="size-3.5" />
            İletişim Tonu
          </div>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = data.personaTone === tone.value;
            return (
              <button
                key={tone.value}
                type="button"
                onClick={() => updateField("personaTone", tone.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-center",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-lg">{tone.emoji}</span>
                <span className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {tone.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {tone.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Greeting message */}
      <div className="space-y-1.5">
        <Label htmlFor="greetingMessage">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            Karşılama Mesajı
          </div>
        </Label>
        <Textarea
          id="greetingMessage"
          placeholder="örn: Merhaba, [İşletme Adı]&apos;na hoş geldiniz. Ben [Ad], size yardımcı olmak için buradayım."
          className="min-h-[80px]"
          value={data.greetingMessage}
          onChange={(e) => updateField("greetingMessage", e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          İlk mesaj aldığında misafire gönderilecek karşılama metni.
        </p>
      </div>

      {/* Welcome note */}
      <div className="space-y-1.5">
        <Label htmlFor="welcomeNote">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Hoş Geldiniz Notu
          </div>
        </Label>
        <Textarea
          id="welcomeNote"
          placeholder="örn: Check-in saatiniz yaklaştığında size detaylı yol tarifi ve giriş bilgileri gönderilecektir."
          className="min-h-[60px]"
          value={data.welcomeNote}
          onChange={(e) => updateField("welcomeNote", e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Rezervasyon onayından sonra gönderilecek ek not.
        </p>
      </div>

      {/* Auto-reply toggle */}
      <Card size="sm">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <div>
                <Label>Otomatik Yanıt</Label>
                <p className="text-[11px] text-muted-foreground">
                  AI misafirlere otomatik yanıt versin
                </p>
              </div>
            </div>
            <Switch
              checked={data.autoReplyEnabled}
              onCheckedChange={(checked) => updateField("autoReplyEnabled", checked as boolean)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
