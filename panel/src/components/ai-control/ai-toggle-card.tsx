"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bot, Power, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export function AIToggleCard() {
  const [isAIEnabled, setIsAIEnabled] = React.useState(true);
  const [lastToggleTime, setLastToggleTime] = React.useState<Date>(new Date());

  const handleToggle = () => {
    setIsAIEnabled(!isAIEnabled);
    setLastToggleTime(new Date());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          AI Asistan Kontrolü
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center size-12 rounded-2xl transition-colors",
                  isAIEnabled
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-gray-100 dark:bg-gray-800"
                )}
              >
                <Power
                  className={cn(
                    "size-6 transition-colors",
                    isAIEnabled ? "text-emerald-600" : "text-gray-400"
                  )}
                />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {isAIEnabled ? "Elif Aktif" : "Elif Devre Dışı"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAIEnabled
                    ? "Misafir mesajlarını yanıtlıyor"
                    : "Tüm mesajlar size yönlendirilecek"}
                </p>
              </div>
            </div>
            <Switch checked={isAIEnabled} onCheckedChange={handleToggle} />
          </div>

          {/* Status Message */}
          <div
            className={cn(
              "rounded-xl p-4 text-sm transition-colors",
              isAIEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30"
                : "bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800/30"
            )}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={cn(
                  "size-2 rounded-full mt-1.5 shrink-0",
                  isAIEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                )}
              />
              <div>
                <p className="font-medium text-foreground">
                  {isAIEnabled
                    ? "Elif aktif olarak misafir mesajlarını yanıtlıyor"
                    : "Elif devre dışı, tüm mesajlar size yönlendirilecek"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAIEnabled
                    ? "AI, belirlenen kurallar çerçevesinde otomatik yanıtlar gönderiyor."
                    : "Tüm misafir mesajları doğrudan size iletilecek. AI hiçbir mesajı yanıtlamayacak."}
                </p>
              </div>
            </div>
          </div>

          {/* Last Toggle */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              Son değişiklik:{" "}
              {formatDistanceToNow(lastToggleTime, {
                addSuffix: true,
                locale: tr,
              })}{" "}
              ({format(lastToggleTime, "HH:mm", { locale: tr })})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
