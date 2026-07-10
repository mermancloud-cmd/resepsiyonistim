"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageCircle,
  Send,
  Bot,
  Globe,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings2,
  ArrowLeft,
  ChevronRight,
  Clock,
  Bell,
  MessageSquare,
  BarChart3,
  History,
  Search,
  Filter,
  Phone,
  User,
  RefreshCw,
  Zap,
  Hash,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  useChannels,
  useChannel,
  useChannelMetrics,
  useUnifiedMessages,
  useToggleChannel,
  useUpsertChannel,
  getChannelStatusVariant,
  getChannelStatusLabel,
} from "@/hooks/use-channels";
import {
  CHANNEL_TYPE_LABELS,
  CHANNEL_DEFAULT_CONFIG,
  type ChannelInfo,
  type ChannelType,
  type UnifiedMessage,
} from "@/lib/types";

// ─── Channel icons ────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, typeof Smartphone> = {
  whatsapp: Smartphone,
  telegram: Send,
  facebook_messenger: MessageCircle,
  web_widget: Monitor,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  telegram:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  facebook_messenger:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  web_widget:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const CHANNEL_ANIMATION = {
  whatsapp: "animate-in fade-in slide-in-from-left-2 duration-300",
  telegram: "animate-in fade-in slide-in-from-left-2 duration-300 delay-75",
  facebook_messenger:
    "animate-in fade-in slide-in-from-left-2 duration-300 delay-150",
  web_widget:
    "animate-in fade-in slide-in-from-left-2 duration-300 delay-225",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function ChannelStatusBadge({
  channel,
}: {
  channel: ChannelInfo;
}) {
  const variant = getChannelStatusVariant(
    channel.connected,
    channel.is_active,
    channel.last_error
  );
  const label = getChannelStatusLabel(
    channel.connected,
    channel.is_active,
    channel.last_error
  );

  return (
    <Badge
      variant={variant === "destructive" ? "destructive" : "outline"}
      className={cn(
        "gap-1 capitalize",
        variant === "success" &&
          "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        variant === "warning" &&
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
        variant === "destructive" &&
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
        variant === "secondary" &&
          "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
      )}
    >
      {variant === "success" && <CheckCircle2 className="size-3" />}
      {variant === "warning" && <AlertTriangle className="size-3" />}
      {variant === "destructive" && <XCircle className="size-3" />}
      {variant === "secondary" && <WifiOff className="size-3" />}
      {label}
    </Badge>
  );
}

// ─── Mini Metrics Row ─────────────────────────────────────────────────────────

function MetricsRow({
  messagesToday,
  responseTime,
  activeChats,
}: {
  messagesToday: number;
  responseTime: number;
  activeChats: number;
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <MessageSquare className="size-3" />
        <strong className="text-foreground">{messagesToday}</strong> bugün
      </span>
      <span className="flex items-center gap-1">
        <Clock className="size-3" />
        <strong className="text-foreground">{responseTime}s</strong> yanıt
      </span>
      <span className="flex items-center gap-1">
        <User className="size-3" />
        <strong className="text-foreground">{activeChats}</strong> aktif
      </span>
    </div>
  );
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  onOpen,
}: {
  channel: ChannelInfo;
  onOpen: () => void;
}) {
  const Icon = CHANNEL_ICONS[channel.channel_type] ?? Smartphone;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-border/60 bg-card p-4 text-left transition-all active:scale-[0.98] hover:border-border hover:shadow-sm",
        CHANNEL_ANIMATION[channel.channel_type]
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "size-11 shrink-0 rounded-xl flex items-center justify-center",
            CHANNEL_COLORS[channel.channel_type]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {CHANNEL_TYPE_LABELS[channel.channel_type]}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {channel.is_active
              ? channel.connected
                ? "Bağlı ve aktif"
                : "Bağlantı kontrol ediliyor"
              : "Kanal pasif"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {channel.is_active && channel.connected && (
          <Wifi className="size-3.5 text-green-500" />
        )}
        {channel.is_active && !channel.connected && (
          <WifiOff className="size-3.5 text-amber-500" />
        )}
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: UnifiedMessage }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      className={cn(
        "flex gap-2.5 py-2",
        isOutbound ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isOutbound
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isOutbound ? (
          <Bot className="size-3.5" />
        ) : (
          <User className="size-3.5" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-muted text-foreground rounded-tl-md"
        )}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] opacity-70 font-medium">
            {isOutbound ? "AI Asistan" : message.sender_name}
          </span>
          <span className="text-[10px] opacity-50 flex items-center gap-1">
            <MessageSquare className="size-2.5" />
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isOutbound ? "text-primary-foreground/60" : "text-muted-foreground/60"
          )}
        >
          <span className="text-[10px]">
            {format(new Date(message.timestamp), "HH:mm")}
          </span>
          {message.is_handoff && (
            <Badge variant="outline" className="h-4 text-[9px] px-1.5">
              Handoff
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeeklyBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        Henüz veri yok
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: format(new Date(d.date), "EEE", { locale: tr }),
    mesaj: d.count,
  }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
            }}
            formatter={(value) => [`${value ?? 0} mesaj`, "Günlük"] as unknown as React.ReactNode}
          />
          <Bar dataKey="mesaj" radius={[4, 4, 0, 0]} fill="var(--primary)" maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Channel Detail Sheet ──────────────────────────────────────────────────────

function ChannelDetailSheet({
  channel,
  open,
  onOpenChange,
}: {
  channel: ChannelInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toggleMutation = useToggleChannel();
  const upsertMutation = useUpsertChannel();
  const { data: metrics, isLoading: metricsLoading } = useChannelMetrics(
    channel?.channel_type ?? null
  );

  const handleToggleActive = useCallback(() => {
    if (!channel) return;
    toggleMutation.mutate({ id: channel.id, is_active: !channel.is_active });
  }, [channel, toggleMutation]);

  const handleUpdateSetting = useCallback(
    (key: string, value: unknown) => {
      if (!channel) return;
      upsertMutation.mutate({
        channel_type: channel.channel_type,
        settings: { ...channel.settings, [key]: value } as Record<string, unknown>,
      });
    },
    [channel, upsertMutation]
  );

  if (!channel) return null;

  const Icon = CHANNEL_ICONS[channel.channel_type] ?? Smartphone;
  const isToggling = toggleMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-10 shrink-0 rounded-xl flex items-center justify-center",
                CHANNEL_COLORS[channel.channel_type]
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">
                {CHANNEL_TYPE_LABELS[channel.channel_type]}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                <ChannelStatusBadge channel={channel} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <Tabs defaultValue="settings">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="settings" className="flex-1">
                <Settings2 className="size-3.5" />
                Ayarlar
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex-1">
                <BarChart3 className="size-3.5" />
                Metrikler
              </TabsTrigger>
            </TabsList>

            {/* ─── Settings Tab ─────────────────────────────────────────── */}
            <TabsContent value="settings" className="flex flex-col gap-4">
              {/* Active/Passive Toggle */}
              <Card size="sm">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Kanal Aktif</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {channel.is_active
                        ? "Kanal açık, mesajlar alınıyor"
                        : "Kanal kapalı, mesajlar alınmıyor"}
                    </p>
                  </div>
                  <Switch
                    checked={channel.is_active}
                    onCheckedChange={handleToggleActive}
                    disabled={isToggling}
                  />
                </CardContent>
              </Card>

              {/* Auto Reply */}
              <Card size="sm">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Otomatik Yanıt</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI asistan mesajları otomatik yanıtlasın
                    </p>
                  </div>
                  <Switch
                    checked={channel.settings.auto_reply_enabled}
                    onCheckedChange={(checked) =>
                      handleUpdateSetting("auto_reply_enabled", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* Welcome Message */}
              <Card size="sm">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Hoş Geldin Mesajı</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Yeni sohbetlerde karşılama mesajı gönder
                    </p>
                  </div>
                  <Switch
                    checked={channel.settings.welcome_message_enabled}
                    onCheckedChange={(checked) =>
                      handleUpdateSetting("welcome_message_enabled", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* Greeting Message */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Karşılama Mesajı</Label>
                <Textarea
                  defaultValue={channel.settings.greeting_message}
                  onBlur={(e) =>
                    handleUpdateSetting("greeting_message", e.target.value)
                  }
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Yeni sohbet başladığında gönderilecek ilk mesaj
                </p>
              </div>

              {/* Notifications */}
              <Card size="sm">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2.5">
                    <Bell className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Bildirimler</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Bu kanaldan gelen mesajlar için bildirim gönder
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channel.settings.notification_enabled}
                    onCheckedChange={(checked) =>
                      handleUpdateSetting("notification_enabled", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* Working Hours */}
              <Card size="sm">
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Çalışma Saatleri</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Otomatik yanıtın aktif olduğu saatler
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={channel.settings.working_hours?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleUpdateSetting("working_hours", {
                          ...channel.settings.working_hours,
                          enabled: checked,
                        })
                      }
                    />
                  </div>

                  {channel.settings.working_hours?.enabled && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Başlangıç
                        </Label>
                        <Input
                          type="time"
                          defaultValue={channel.settings.working_hours.start}
                          className="mt-1 h-8 text-xs"
                          onBlur={(e) =>
                            handleUpdateSetting("working_hours", {
                              ...channel.settings.working_hours,
                              start: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Bitiş
                        </Label>
                        <Input
                          type="time"
                          defaultValue={channel.settings.working_hours.end}
                          className="mt-1 h-8 text-xs"
                          onBlur={(e) =>
                            handleUpdateSetting("working_hours", {
                              ...channel.settings.working_hours,
                              end: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Handoff Keywords */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Handoff Anahtar Kelimeleri</Label>
                <div className="flex flex-wrap gap-1.5">
                  {channel.settings.handoff_keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs gap-1">
                      <Hash className="size-2.5" />
                      {kw}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu kelimeler geçtiğinde sohbet insan operatöre devredilir
                </p>
              </div>

              {/* Connection Status */}
              {channel.connected && channel.last_error && (
                <Card size="sm" className="border-destructive/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-destructive text-xs">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>{channel.last_error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ─── Metrics Tab ──────────────────────────────────────────── */}
            <TabsContent value="metrics" className="flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card size="sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {metricsLoading ? "..." : metrics?.messages_today ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bugün Gelen
                    </p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {metricsLoading ? "..." : metrics?.messages_week ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bu Hafta
                    </p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {metricsLoading ? "..." : metrics?.avg_response_time_seconds ?? 0}
                      <span className="text-sm font-normal text-muted-foreground">s</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ort. Yanıt Süresi
                    </p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {metricsLoading ? "..." : metrics?.handoff_rate_percent ?? 0}
                      <span className="text-sm font-normal text-muted-foreground">%</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Handoff Oranı
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Chart */}
              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Haftalık Mesaj Trafiği
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <WeeklyBarChart data={metrics?.daily_messages ?? []} />
                  )}
                </CardContent>
              </Card>

              {/* Active conversations */}
              <Card size="sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <User className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Aktif Sohbetler</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Şu anda devam eden görüşmeler
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold">
                      {metricsLoading ? "..." : metrics?.active_conversations ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Message Log Timeline ──────────────────────────────────────────────────────

function MessageTimeline() {
  const [channelFilter, setChannelFilter] = useState<ChannelType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: messages, isLoading } = useUnifiedMessages({
    channelType: channelFilter === "all" ? undefined : channelFilter,
    search: searchQuery || undefined,
  });

  const CHANNEL_FILTERS: { value: ChannelType | "all"; label: string }[] = [
    { value: "all", label: "Tümü" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "telegram", label: "Telegram" },
    { value: "facebook_messenger", label: "Messenger" },
    { value: "web_widget", label: "Web" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="size-4" />
          Mesaj Geçmişi
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Mesaj veya misafir ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setChannelFilter(f.value)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                channelFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex flex-col max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Henüz mesaj yok</p>
            </div>
          ) : (
            messages.slice(0, 50).map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ChannelsSettingsPage() {
  const [selectedChannel, setSelectedChannel] = useState<ChannelInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: channels, isLoading, error } = useChannels();
  const toggleMutation = useToggleChannel();

  const handleOpenChannel = useCallback(
    (ch: ChannelInfo) => {
      setSelectedChannel(ch);
      setSheetOpen(true);
    },
    []
  );

  // Compute metrics summary for header
  const totalActive = channels?.filter((c) => c.is_active).length ?? 0;
  const totalConnected = channels?.filter((c) => c.is_active && c.connected).length ?? 0;

  return (
    <MobileShell>
      <div className="flex flex-col gap-5 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              İletişim Kanalları
            </h2>
            <p className="text-xs text-muted-foreground">
              WhatsApp, Telegram, Messenger ve Web Widget
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold">
                <Globe className="size-4 text-primary" />
                {isLoading ? "..." : totalActive}
                <span className="text-xs font-normal text-muted-foreground">
                  / {isLoading ? "..." : channels?.length ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aktif Kanal</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold">
                <Wifi className="size-4 text-green-500" />
                {isLoading ? "..." : totalConnected}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Bağlı Kanal</p>
            </CardContent>
          </Card>
        </div>

        {/* Channel List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Kanallar
            </h3>
            {toggleMutation.isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-muted"
                  style={{ animationDelay: `${i * 75}ms` }}
                />
              ))}
            </div>
          ) : error ? (
            <Card size="sm" className="border-destructive/30">
              <CardContent className="p-3 flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                Kanallar yüklenirken hata oluştu
              </CardContent>
            </Card>
          ) : channels && channels.length > 0 ? (
            channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onOpen={() => handleOpenChannel(ch)}
              />
            ))
          ) : (
            <Card size="sm">
              <CardContent className="p-6 text-center">
                <Globe className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">Henüz kanal eklenmemiş</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Yeni bir iletişim kanalı eklemek için yukarıdaki butonu kullanın
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message Timeline */}
        <MessageTimeline />
      </div>

      {/* Channel Detail Sheet */}
      <ChannelDetailSheet
        channel={selectedChannel}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedChannel(null);
        }}
      />
    </MobileShell>
  );
}
