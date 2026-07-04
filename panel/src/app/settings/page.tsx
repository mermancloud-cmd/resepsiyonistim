"use client";
import * as React from "react";


import { useForm } from "react-hook-form";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Clock,
  CalendarDays,
  FileText,
  Bell,
  LogOut,
  Save,
  Settings,
  Bot,
  Sparkles,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockBusinessSettings, mockAIPersona } from "@/lib/mock-data";

// ─── Form Types ────────────────────────────────────────────────────────────────

interface FormData {
  businessName: string;
  phone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  minimumStay: number;
  cancellationPolicy: string;
  webPushEnabled: boolean;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  aiName: string;
  aiTone: "warm" | "professional" | "casual" | "luxury";
  aiResponseSpeed: "fast" | "balanced" | "thoughtful";
  aiMaxTurns: number;
}

function validateForm(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.businessName.trim()) errors.businessName = "İşletme adı zorunludur";
  if (!data.phone.trim()) errors.phone = "Telefon numarası zorunludur";
  if (!data.address.trim()) errors.address = "Adres zorunludur";
  if (!data.checkInTime) errors.checkInTime = "Giriş saati zorunludur";
  if (!data.checkOutTime) errors.checkOutTime = "Çıkış saati zorunludur";
  if (data.minimumStay < 1) errors.minimumStay = "En az 1 gece olmalıdır";
  if (!data.aiName.trim()) errors.aiName = "AI asistan adı zorunludur";
  return errors;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Business Hours ────────────────────────────────────────────────────────────

const DAYS = [
  { key: "monday", label: "Pazartesi" },
  { key: "tuesday", label: "Salı" },
  { key: "wednesday", label: "Çarşamba" },
  { key: "thursday", label: "Perşembe" },
  { key: "friday", label: "Cuma" },
  { key: "saturday", label: "Cumartesi" },
  { key: "sunday", label: "Pazar" },
] as const;

interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

// ─── Amenities ─────────────────────────────────────────────────────────────────

const SUGGESTED_AMENITIES = [
  "WiFi",
  "Klima",
  "Havuz",
  "Otopark",
  "Kahvaltı dahil",
  "Barbekü alanı",
  "Doğa manzarası",
  "Şömine",
  "Jakuzi",
  "Mutfak",
  "Çamaşır makinesi",
  "TV",
  "Sauna",
  "Bisiklet",
  "Deniz manzarası",
  "Özel bahçe",
  "Hamak",
  "Mangal",
  "Oyun odası",
  "Evcil hayvan dostu",
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      businessName: mockBusinessSettings.businessName,
      phone: mockBusinessSettings.phone,
      address: mockBusinessSettings.address,
      checkInTime: mockBusinessSettings.checkInTime,
      checkOutTime: mockBusinessSettings.checkOutTime,
      minimumStay: mockBusinessSettings.minimumStay,
      cancellationPolicy: mockBusinessSettings.cancellationPolicy,
      webPushEnabled: mockBusinessSettings.webPushEnabled,
      telegramEnabled: mockBusinessSettings.telegramEnabled,
      whatsappEnabled: mockBusinessSettings.whatsappEnabled,
      aiName: mockAIPersona.name,
      aiTone: mockAIPersona.tone,
      aiResponseSpeed: mockAIPersona.responseSpeed,
      aiMaxTurns: mockAIPersona.maxConversationTurns,
    },
  });

  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [amenities, setAmenities] = React.useState<string[]>(
    mockBusinessSettings.amenities
  );
  const [newAmenity, setNewAmenity] = React.useState("");
  const [businessHours, setBusinessHours] = React.useState<
    Record<string, DayHours>
  >(mockBusinessSettings.businessHours);

  const webPushEnabled = watch("webPushEnabled");
  const telegramEnabled = watch("telegramEnabled");
  const whatsappEnabled = watch("whatsappEnabled");
  const aiTone = watch("aiTone");
  const aiResponseSpeed = watch("aiResponseSpeed");

  const onSubmit = (data: FormData) => {
    const errs = validateForm(data);
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    console.log("Settings saved:", { ...data, amenities, businessHours });
  };

  const addAmenity = (amenity: string) => {
    if (amenity.trim() && !amenities.includes(amenity.trim())) {
      setAmenities([...amenities, amenity.trim()]);
    }
    setNewAmenity("");
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(amenities.filter((a) => a !== amenity));
  };

  const toggleDayHours = (day: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen },
    }));
  };

  const toneOptions = [
    { value: "warm" as const, label: "Sıcak", desc: "Samimi ve misafirperver" },
    { value: "professional" as const, label: "Profesyonel", desc: "Resmi ve kurumsal" },
    { value: "casual" as const, label: "Günlük", desc: "Rahat ve arkadaşça" },
    { value: "luxury" as const, label: "Lüks", desc: "Premium hizmet dili" },
  ];

  const speedOptions = [
    { value: "fast" as const, label: "Hızlı", desc: "Anında yanıt (~1s)" },
    { value: "balanced" as const, label: "Dengeli", desc: "Doğal tempo (~3s)" },
    { value: "thoughtful" as const, label: "Düşünceli", desc: "Detaylı yanıt (~5s)" },
  ];

  return (
    <MobileShell>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 pb-20"
      >
        {/* Page header */}
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ayarlar</h2>
            <p className="text-xs text-muted-foreground">
              İşletme, AI ve uygulama ayarları
            </p>
          </div>
        </div>

        {/* ─── AI Persona ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-5 text-violet-600 dark:text-violet-400" />
              AI Asistan Yapılandırması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <FormField label="Asistan Adı" error={validationErrors.aiName}>
                <Input
                  {...register("aiName")}
                  placeholder="Elif"
                  className={cn(
                    validationErrors.aiName && "border-destructive"
                  )}
                />
              </FormField>

              {/* Tone selector */}
              <FormField label="Konuşma Tonu">
                <div className="grid grid-cols-2 gap-2">
                  {toneOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("aiTone", opt.value)}
                      className={cn(
                        "rounded-lg border p-2.5 text-left transition-all",
                        aiTone === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-medium",
                          aiTone === opt.value
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Response speed */}
              <FormField label="Yanıt Hızı">
                <div className="grid grid-cols-3 gap-2">
                  {speedOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("aiResponseSpeed", opt.value)}
                      className={cn(
                        "rounded-lg border p-2 text-center transition-all",
                        aiResponseSpeed === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-medium",
                          aiResponseSpeed === opt.value
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Max turns */}
              <FormField label="Maksimum Konuşma Turu">
                <Input
                  {...register("aiMaxTurns", { valueAsNumber: true })}
                  type="number"
                  min={5}
                  max={100}
                  className="w-24 text-center"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Bu sayıya ulaşıldığında otomatik olarak insana devredilir.
                </p>
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* ─── Business Info ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5 text-primary" />
              İşletme Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <FormField
                label="İşletme Adı"
                error={validationErrors.businessName}
              >
                <Input
                  {...register("businessName")}
                  placeholder="İşletmenizin adı"
                  className={cn(
                    validationErrors.businessName && "border-destructive"
                  )}
                />
              </FormField>

              <FormField label="Telefon" error={validationErrors.phone}>
                <Input
                  {...register("phone")}
                  placeholder="+90 242 555 1234"
                  type="tel"
                />
              </FormField>

              <FormField label="Adres" error={validationErrors.address}>
                <Input
                  {...register("address")}
                  placeholder="İşletme adresi"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* ─── Business Hours ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-5 text-primary" />
              Çalışma Saatleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {DAYS.map((day) => {
                const hours = businessHours[day.key];
                return (
                  <div
                    key={day.key}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-2.5"
                  >
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Switch
                        checked={hours.isOpen}
                        onCheckedChange={() => toggleDayHours(day.key)}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          !hours.isOpen && "text-muted-foreground line-through"
                        )}
                      >
                        {day.label}
                      </span>
                    </div>
                    {hours.isOpen && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) =>
                            setBusinessHours((prev) => ({
                              ...prev,
                              [day.key]: { ...hours, open: e.target.value },
                            }))
                          }
                          className="h-7 rounded border border-input bg-transparent px-1.5 text-xs text-center flex-1"
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) =>
                            setBusinessHours((prev) => ({
                              ...prev,
                              [day.key]: { ...hours, close: e.target.value },
                            }))
                          }
                          className="h-7 rounded border border-input bg-transparent px-1.5 text-xs text-center flex-1"
                        />
                      </div>
                    )}
                    {!hours.isOpen && (
                      <span className="text-xs text-muted-foreground">
                        Kapalı
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ─── Check-in/Check-out ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-5 text-primary" />
              Check-in / Check-out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Giriş Saati"
                error={validationErrors.checkInTime}
              >
                <Input
                  {...register("checkInTime")}
                  type="time"
                  className="text-center"
                />
              </FormField>

              <FormField
                label="Çıkış Saati"
                error={validationErrors.checkOutTime}
              >
                <Input
                  {...register("checkOutTime")}
                  type="time"
                  className="text-center"
                />
              </FormField>
            </div>

            <Separator className="my-3" />

            <FormField
              label="Minimum Gece Sayısı"
              error={validationErrors.minimumStay}
            >
              <Input
                {...register("minimumStay", { valueAsNumber: true })}
                type="number"
                min={1}
                max={30}
                className="w-24 text-center"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rezervasyonlar en az bu kadar gece için kabul edilir.
              </p>
            </FormField>
          </CardContent>
        </Card>

        {/* ─── Amenities ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5 text-primary" />
              Olanaklar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Current amenities */}
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <Badge
                  key={amenity}
                  variant="secondary"
                  className="gap-1 pr-1 py-1"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeAmenity(amenity)}
                    className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Add custom */}
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAmenity(newAmenity);
                  }
                }}
                placeholder="Yeni olanak ekle..."
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addAmenity(newAmenity)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Öneriler</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_AMENITIES.filter(
                  (a) => !amenities.includes(a)
                ).map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => addAmenity(amenity)}
                    className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + {amenity}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Cancellation Policy ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-primary" />
              İptal Politikası
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField label="İptal Koşulları">
              <textarea
                {...register("cancellationPolicy")}
                rows={4}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="İptal politikanızı buraya yazın..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bu metin misafirlere rezervasyon sırasında gösterilecektir.
              </p>
            </FormField>
          </CardContent>
        </Card>

        {/* ─── Notification Preferences ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-5 text-primary" />
              Bildirim Tercihleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Web Push Bildirimleri</p>
                  <p className="text-xs text-muted-foreground">
                    Tarayıcı üzerinden anlık bildirimler (önerilen)
                  </p>
                </div>
                <Switch
                  checked={webPushEnabled}
                  onCheckedChange={(checked) =>
                    setValue("webPushEnabled", checked ?? false)
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Telegram Bildirimleri</p>
                  <p className="text-xs text-muted-foreground">
                    Telegram üzerinden bildirim alın (isteğe bağlı)
                  </p>
                </div>
                <Switch
                  checked={telegramEnabled}
                  onCheckedChange={(checked) =>
                    setValue("telegramEnabled", checked ?? false)
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">WhatsApp Bildirimleri</p>
                  <p className="text-xs text-muted-foreground">
                    WhatsApp üzerinden bildirim alın (isteğe bağlı)
                  </p>
                </div>
                <Switch
                  checked={whatsappEnabled}
                  onCheckedChange={(checked) =>
                    setValue("whatsappEnabled", checked ?? false)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* ─── Account ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hesap</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              size="lg"
              type="button"
            >
              <LogOut className="size-4" />
              Çıkış Yap
            </Button>
          </CardContent>
        </Card>

        {/* ─── Save Button ─────────────────────────────────────────────── */}
        <div className="fixed bottom-16 inset-x-0 max-w-lg mx-auto px-4 z-20">
          <Button
            type="submit"
            size="lg"
            className={cn(
              "w-full shadow-lg transition-all",
              saveSuccess && "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Save className="size-4" />
            {saveSuccess ? "Kaydedildi ✓" : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      </form>
    </MobileShell>
  );
}
