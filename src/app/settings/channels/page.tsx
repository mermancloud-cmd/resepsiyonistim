"use client";
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import {
  MessageCircle,
  Send,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Link2Off,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Globe,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelForm {
  // Telegram
  telegram_token: string;
  telegram_chat_id: string;
  telegram_enabled: boolean;

  // Facebook Messenger
  fb_page_id: string;
  fb_verify_token: string;
  fb_app_secret: string;
  fb_enabled: boolean;

  // Common
  greeting_message: string;
}

// ─── Mock data for UI development (replace with API fetch) ──────────────────

const MOCK_CHANNELS = [
  {
    id: "ch-wa-001",
    channel_type: "whatsapp" as const,
    name: "WhatsApp",
    is_active: true,
    connected: true,
    details: "+90 542 745 06 54",
    icon: Smartphone,
  },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function ChannelStatusBadge({
  connected,
  active,
}: {
  connected: boolean;
  active: boolean;
}) {
  if (!active) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1">
        <XCircle className="size-3" />
        Pasif
      </Badge>
    );
  }
  if (connected) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="size-3" />
        Bağlı
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
      <Link2Off className="size-3" />
      Bağlı Değil
    </Badge>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelsSettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChannelForm>({
    defaultValues: {
      telegram_token: "",
      telegram_chat_id: "",
      telegram_enabled: false,
      fb_page_id: "",
      fb_verify_token: "",
      fb_app_secret: "",
      fb_enabled: false,
      greeting_message: "Merhaba! 👋 Size nasıl yardımcı olabilirim?",
    },
  });

  const telegramEnabled = watch("telegram_enabled");
  const fbEnabled = watch("fb_enabled");

  const channels = MOCK_CHANNELS;

  const onSubmit = async (data: ChannelForm) => {
    setSaving(true);
    setTestResult(null);

    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setSaving(false);
  };

  const testTelegram = async () => {
    const token = watch("telegram_token");
    const chatId = watch("telegram_chat_id");
    if (!token || !chatId) {
      setTestResult({ ok: false, msg: "Token ve Chat ID gerekli" });
      return;
    }

    setTestingTelegram(true);
    setTestResult(null);

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "✅ *Resepsiyonistim* bağlantı testi başarılı! 🎉\n\nBundan sonra bildirimleriniz buraya gelecek.",
            parse_mode: "Markdown",
          }),
        }
      );
      const data = await res.json();

      if (data.ok) {
        setTestResult({ ok: true, msg: "Test mesajı gönderildi! Telegram\'ı kontrol edin." });
      } else {
        setTestResult({
          ok: false,
          msg: `Hata: ${data.description || "Bilinmeyen hata"}`,
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        msg: "Telegram API\'ye bağlanılamadı. Token\'ı kontrol edin.",
      });
    }

    setTestingTelegram(false);
  };

  const setTelegramWebhook = async () => {
    const token = watch("telegram_token");
    if (!token) {
      setTestResult({ ok: false, msg: "Önce bot token\'ı girin" });
      return;
    }

    setTestingTelegram(true);
    setTestResult(null);

    try {
      const origin = window.location.origin;
      const res = await fetch(
        `/api/channels/telegram?token=${encodeURIComponent(token)}&webhook=${encodeURIComponent(origin)}`
      );
      const data = await res.json();

      if (data.ok) {
        setTestResult({ ok: true, msg: `Webhook başarıyla kuruldu ✅` });
      } else {
        setTestResult({ ok: false, msg: data.error || "Webhook kurulamadı" });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: "Webhook kurulurken hata oluştu" });
    }

    setTestingTelegram(false);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-5 pb-4">
        {/* Header with back button */}
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
              WhatsApp, Telegram ve Facebook Messenger bağlantıları
            </p>
          </div>
        </div>

        {/* ─── Connected Channels Overview ──────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="size-4" />
              Bağlı Kanallar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ch.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ch.name}</p>
                      {ch.details && (
                        <p className="text-xs text-muted-foreground">
                          {ch.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelStatusBadge
                      connected={ch.connected}
                      active={ch.is_active}
                    />
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              ))}

              {/* Telegram Status Card */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Send className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Telegram</p>
                    <p className="text-xs text-muted-foreground">
                      {telegramEnabled ? "Yapılandırıldı" : "Henüz ayarlanmadı"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChannelStatusBadge
                    connected={telegramEnabled}
                    active={telegramEnabled}
                  />
                </div>
              </div>

              {/* Facebook Messenger Status Card */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <MessageCircle className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Facebook Messenger</p>
                    <p className="text-xs text-muted-foreground">
                      {fbEnabled ? "Yapılandırıldı" : "Henüz ayarlanmadı"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChannelStatusBadge
                    connected={fbEnabled}
                    active={fbEnabled}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Telegram Bot Setup ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="size-5 text-sky-600 dark:text-sky-400" />
              Telegram Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Telegram Bot Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    Misafirler Telegram üzerinden sizinle iletişime geçebilir
                  </p>
                </div>
                <Switch
                  checked={telegramEnabled}
                  onCheckedChange={(checked) =>
                    setValue("telegram_enabled", checked ?? false)
                  }
                />
              </div>

              {telegramEnabled && (
                <>
                  {/* Setup guide */}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-medium">🔧 Kurulum Adımları</p>
                    <ol className="list-decimal list-inside space-y-0.5 opacity-80">
                      <li>
                        Telegram&apos;da <strong>@BotFather</strong>&apos;a gidin
                      </li>
                      <li>
                        <code>/newbot</code> yazın ve talimatları izleyin
                      </li>
                      <li>Size verilen token&apos;ı aşağıya yapıştırın</li>
                      <li>
                        Botunuza mesaj atın, ardından{" "}
                        <strong>Test Et</strong>&apos;e tıklayın
                      </li>
                      <li>
                        Chat ID otomatik algılanır veya <code>@userinfobot</code>{" "}
                        ile öğrenebilirsiniz
                      </li>
                    </ol>
                  </div>

                  {/* Bot Token */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="telegram_token">
                      Bot Token <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="telegram_token"
                      {...register("telegram_token", {
                        required: "Bot token zorunludur",
                      })}
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className={cn(
                        "font-mono text-xs",
                        errors.telegram_token && "border-destructive"
                      )}
                    />
                    {errors.telegram_token && (
                      <p className="text-xs text-destructive">
                        {errors.telegram_token.message}
                      </p>
                    )}
                  </div>

                  {/* Chat ID */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="telegram_chat_id">
                      Bildirim Chat ID
                    </Label>
                    <Input
                      id="telegram_chat_id"
                      {...register("telegram_chat_id")}
                      placeholder="123456789" 
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Bildirimlerin gönderileceği sohbetin ID&apos;si. İşletme sahibi olarak sizinle
                      iletişim için kullanılır.
                    </p>
                  </div>

                  {/* Test & Webhook Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={testTelegram}
                      disabled={testingTelegram}
                    >
                      {testingTelegram ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Send className="size-3 mr-1" />
                      )}
                      Test Et
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={setTelegramWebhook}
                      disabled={testingTelegram}
                    >
                      {testingTelegram ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Link2 className="size-3 mr-1" />
                      )}
                      Webhook Kur
                    </Button>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div
                      className={cn(
                        "rounded-lg p-3 text-sm border",
                        testResult.ok
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                      )}
                    >
                      {testResult.ok ? "✅ " : "❌ "}
                      {testResult.msg}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Facebook Messenger Setup ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="size-5 text-blue-600 dark:text-blue-400" />
              Facebook Messenger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Messenger Bot Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    Facebook Sayfanız üzerinden mesajları yanıtlayın
                  </p>
                </div>
                <Switch
                  checked={fbEnabled}
                  onCheckedChange={(checked) =>
                    setValue("fb_enabled", checked ?? false)
                  }
                />
              </div>

              {fbEnabled && (
                <>
                  {/* Setup guide */}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <p className="font-medium">🔧 Kurulum Adımları</p>
                    <ol className="list-decimal list-inside space-y-0.5 opacity-80">
                      <li>
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Facebook Developers
                        </a>{" "}
                        &rarr; Uygulama Oluşturun
                      </li>
                      <li>Messenger ürününü ekleyin</li>
                      <li>Sayfanızı bağlayın ve Page Access Token alın</li>
                      <li>
                        Webhook URL: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/channels/messenger</code>
                      </li>
                      <li>
                        Verify Token: aşağıda belirlediğiniz token
                      </li>
                    </ol>
                  </div>

                  {/* Page ID */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb_page_id">Sayfa ID</Label>
                    <Input
                      id="fb_page_id"
                      {...register("fb_page_id")}
                      placeholder="123456789012345"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Facebook Sayfanızın ID&apos;si (Sayfa &rarr; Hakkında &rarr; Sayfa ID)
                    </p>
                  </div>

                  {/* Verify Token */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb_verify_token">
                      Webhook Doğrulama Token&apos;ı{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fb_verify_token"
                      {...register("fb_verify_token", {
                        required: "Doğrulama token'ı zorunludur",
                      })}
                      placeholder="benzersiz-bir-token-belirleyin"
                      className={cn(
                        "font-mono text-xs",
                        errors.fb_verify_token && "border-destructive"
                      )}
                    />
                    {errors.fb_verify_token && (
                      <p className="text-xs text-destructive">
                        {errors.fb_verify_token.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Facebook webhook ayarlarında gireceğiniz doğrulama token&apos;ı. 
                      Kendiniz belirleyin (ör: merman-fb-verify-2026).
                    </p>
                  </div>

                  {/* App Secret */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb_app_secret">
                      App Secret
                    </Label>
                    <Input
                      id="fb_app_secret"
                      {...register("fb_app_secret")}
                      type="password"
                      placeholder="Facebook uygulama secret'ı"
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Greeting Message ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              Karşılama Mesajı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="greeting_message">Varsayılan Karşılama</Label>
              <textarea
                id="greeting_message"
                {...register("greeting_message")}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Merhaba! Size nasıl yardımcı olabilirim?"
              />
              <p className="text-xs text-muted-foreground">
                Yeni bir sohbet başladığında misafire gönderilecek ilk mesaj.
                Telegram ve Messenger için geçerlidir.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* ─── Save Button ─────────────────────────────────────────────── */}
        <div className="fixed bottom-16 inset-x-0 max-w-lg mx-auto px-4 z-20">
          <Button
            type="button"
            size="lg"
            className={cn(
              "w-full shadow-lg transition-all",
              saveSuccess && "bg-emerald-600 hover:bg-emerald-700"
            )}
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            {saveSuccess ? "Kaydedildi ✓" : "Ayarları Kaydet"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
