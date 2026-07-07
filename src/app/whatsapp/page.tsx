"use client";
import * as React from "react";

import { useState, useEffect, useCallback } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  QrCode,
  RefreshCw,
  Link2,
  Link2Off,
  Plug,
  PlugZap,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SmartphoneCharging,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: "open" | "close" | "connecting" | "error";
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  number: string | null;
  integration: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    Message: number;
    Contact: number;
    Chat: number;
  };
}

interface ProxyResponseData {
  base64?: string;
  [key: string]: unknown;
}

interface ProxyResponse {
  action: string;
  instanceName: string;
  status?: number;
  statusCode?: number;
  error?: boolean;
  message?: string;
  data?: ProxyResponseData;
  body?: ProxyResponseData;
}

const API_URL = "https://n8n.merman.sbs/webhook/evolution-proxy";

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function proxyCall(action: string, instanceName = "merman"): Promise<ProxyResponse> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, instanceName }),
  });
  const data: ProxyResponse[] = await res.json();
  return data?.[0] || { action, instanceName, error: true, message: "Empty response" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <CheckCircle2 className="size-3" /> Bağlı
        </Badge>
      );
    case "close":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <XCircle className="size-3" /> Kapalı
        </Badge>
      );
    case "connecting":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 animate-pulse">
          <Loader2 className="size-3 animate-spin" /> Bağlanıyor
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <AlertCircle className="size-3" /> Hata
        </Badge>
      );
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState("");

  // Fetch instances
  const fetchInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await proxyCall("status");
      if (res.error || res.statusCode === 500) {
        setError(res.message || "Bağlantı hatası");
        return;
      }
      // Response is the full instance list array
      const list = Array.isArray(res.data) ? res.data : [];
      setInstances(list as EvolutionInstance[]);
    } catch (e) {
      setError("API çağrısı başarısız");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchInstances();
  }, [isMounted, fetchInstances]);

  // Fetch QR code
  const showQR = async (name: string) => {
    setActionLoading(`qr-${name}`);
    try {
      const res = await proxyCall("qr", name);
      if (res.error) {
        // Maybe instance is closed — try creating one
        const createRes = await proxyCall("connect", name);
        if (createRes.error) {
          setError(`QR alınamadı: ${createRes.message}`);
          setActionLoading(null);
          setQrData(null);
          setQrInstance(null);
          return;
        }
        // Wait a moment then get QR
        await new Promise(r => setTimeout(r, 2000));
        const qrRes = await proxyCall("qr", name);
        if (qrRes.error) {
          setError(`QR alınamadı: ${qrRes.message}`);
          setActionLoading(null);
          return;
        }
        setQrData(qrRes.data?.base64 || null);
        setQrInstance(name);
      } else {
        setQrData(res.data?.base64 || null);
        setQrInstance(name);
      }
    } catch (e) {
      setError("QR alınırken hata");
    }
    setActionLoading(null);
  };

  // Disconnect instance
  const disconnect = async (name: string) => {
    if (!confirm(`${name} bağlantısını kesmek istediğine emin misin?`)) return;
    setActionLoading(`disconnect-${name}`);
    await proxyCall("disconnect", name);
    await fetchInstances();
    setActionLoading(null);
    setQrData(null);
    setQrInstance(null);
  };

  // Delete instance
  const deleteInstance = async (name: string) => {
    if (!confirm(`${name} instance'ını tamamen silmek istediğine emin misin?`)) return;
    setActionLoading(`delete-${name}`);
    await proxyCall("delete", name);
    await fetchInstances();
    setActionLoading(null);
  };

  // Create new instance
  const createInstance = async () => {
    const name = newInstanceName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!name) return;
    setActionLoading("create");
    await proxyCall("connect", name);
    setNewInstanceName("");
    await fetchInstances();
    // Get QR for the new instance
    await new Promise(r => setTimeout(r, 2000));
    const qrRes = await proxyCall("qr", name);
    setQrData(qrRes.data?.base64 || null);
    setQrInstance(name);
    setActionLoading(null);
  };

  if (!isMounted) return null;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-teal-600" />
            <h2 className="text-lg font-semibold tracking-tight">WhatsApp Bağlantıları</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={fetchInstances}
            disabled={loading}
            title="Yenile"
          >
            <RefreshCw className={`size-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>Kapat</button>
          </div>
        )}

        {/* QR Code Display */}
        {qrData && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <QrCode className="size-4" />
                {qrInstance} — QR Kod
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 pb-6">
              <img
                src={`data:image/png;base64,${qrData}`}
                alt={`${qrInstance} QR Kodu`}
                className="w-56 h-56 rounded-lg border-2 border-muted"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <SmartphoneCharging className="size-3" />
                <span>Telefonundan WhatsApp → Bağlı Cihazlar → QR okut</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showQR(qrInstance!)}
                  disabled={actionLoading === `qr-${qrInstance}`}
                >
                  {actionLoading === `qr-${qrInstance}` ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="size-3 mr-1" />
                  )}
                  QR'ı Yenile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setQrData(null); setQrInstance(null); }}
                >
                  Kapat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create new instance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plug className="size-4" />
              Yeni Numara Bağla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="instance-name" className="sr-only">Instance Adı</Label>
                <Input
                  id="instance-name"
                  placeholder="ör: musteri-bungalov-2"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                onClick={createInstance}
                disabled={!newInstanceName.trim() || actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <PlugZap className="size-3 mr-1" />
                )}
                Bağla
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Yeni bir WhatsApp numarası bağlamak için instance oluştur. Telefonundan QR kodu okutman gerekecek.
            </p>
          </CardContent>
        </Card>

        {/* Instance List */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            Bağlı Numaralar ({instances.length})
          </h3>

          {loading && instances.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Yükleniyor...
            </div>
          ) : instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Smartphone className="size-8 opacity-50" />
              <p className="text-sm">Henüz bağlı numara yok</p>
              <p className="text-xs">Yukarıdan yeni bir numara bağlayabilirsin</p>
            </div>
          ) : (
            instances.map((inst) => (
              <Card key={inst.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Name + Status */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{inst.name}</span>
                        {statusBadge(inst.connectionStatus)}
                      </div>

                      {/* Details */}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {inst.ownerJid && (
                          <p>📱 {inst.ownerJid.replace("@s.whatsapp.net", "")}</p>
                        )}
                        {inst.profileName && (
                          <p>👤 {inst.profileName}</p>
                        )}
                        <p>
                          💬 {inst._count?.Message ?? 0} mesaj · {inst._count?.Chat ?? 0} sohbet
                          · {inst._count?.Contact ?? 0} kişi
                        </p>
                        <p>🕐 {formatDate(inst.createdAt)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => showQR(inst.name)}
                        disabled={actionLoading === `qr-${inst.name}`}
                      >
                        {actionLoading === `qr-${inst.name}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <QrCode className="size-3" />
                        )}
                      </Button>
                      {inst.connectionStatus === "open" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => disconnect(inst.name)}
                          disabled={actionLoading === `disconnect-${inst.name}`}
                        >
                          {actionLoading === `disconnect-${inst.name}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Link2Off className="size-3" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => deleteInstance(inst.name)}
                          disabled={actionLoading === `delete-${inst.name}`}
                        >
                          {actionLoading === `delete-${inst.name}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  );
}
