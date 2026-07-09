"use client";
import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import {
  FlaskConical,
  BarChart3,
  Plus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ThumbsUp,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useABTests,
  useABTestSummary,
  useABTestResults,
  useCreateABTest,
  useToggleABTest,
  mockABTests,
  mockABTestSummaries,
  mockABTestResults,
} from "@/hooks/use-ab-tests";
import type { ABTest, ABTestSummary, ABTestResult, ABTestTargetMetric } from "@/lib/types";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<ABTestTargetMetric, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  satisfaction_score: { label: "Memnuniyet Puanı", icon: ThumbsUp },
  completion_rate: { label: "Tamamlama Oranı", icon: CheckCircle2 },
  response_time: { label: "Yanıt Süresi", icon: Clock },
  conversion_rate: { label: "Dönüşüm Oranı", icon: TrendingUp },
};

const METRIC_OPTIONS = [
  { value: "satisfaction_score" as ABTestTargetMetric, label: "Memnuniyet Puanı" },
  { value: "completion_rate" as ABTestTargetMetric, label: "Tamamlama Oranı" },
  { value: "response_time" as ABTestTargetMetric, label: "Yanıt Süresi" },
  { value: "conversion_rate" as ABTestTargetMetric, label: "Dönüşüm Oranı" },
];

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xl font-bold tracking-tight">{value}</span>
            {subtext && (
              <span className="text-[10px] text-muted-foreground">{subtext}</span>
            )}
          </div>
          <div className={cn(
            "rounded-lg p-2",
            trend === "up" ? "bg-green-500/10" : trend === "down" ? "bg-red-500/10" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "size-4",
              trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Comparison Row ───────────────────────────────────────────────────────────

function ComparisonBar({ label, control, treatment, metric }: {
  label: string;
  control: number | null | undefined;
  treatment: number | null | undefined;
  metric: string;
}) {
  const cVal = control ?? 0;
  const tVal = treatment ?? 0;
  const max = Math.max(cVal, tVal, 1);
  const diff = tVal - cVal;
  const isPositive = metric === 'response_time' ? diff < 0 : diff > 0;
  const pctChange = cVal !== 0 ? Math.round((diff / cVal) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {diff !== 0 && (
          <span className={cn(
            "font-semibold",
            isPositive ? "text-green-600" : "text-red-500"
          )}>
            {isPositive ? "+" : ""}{pctChange}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="w-14 shrink-0 text-right text-muted-foreground">Kontrol: {cVal}</span>
        <div className="flex-1 flex gap-0.5 h-5">
          <div
            className="bg-primary/30 rounded-l-sm transition-all"
            style={{ width: `${(cVal / max) * 50}%` }}
          />
          <div
            className={cn(
              "rounded-r-sm transition-all",
              isPositive ? "bg-green-500/50" : "bg-red-500/50"
            )}
            style={{ width: `${(tVal / max) * 50}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-muted-foreground">Tedavi: {tVal}</span>
      </div>
    </div>
  );
}

// ─── Create Test Form ─────────────────────────────────────────────────────────

function CreateTestForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createTest = useCreateABTest();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [variantA, setVariantA] = React.useState("Kontrol");
  const [variantB, setVariantB] = React.useState("Tedavi");
  const [targetMetric, setTargetMetric] = React.useState<ABTestTargetMetric>("satisfaction_score");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Test adı gerekli"); return; }

    setIsSubmitting(true);
    try {
      await createTest.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        variant_a_name: variantA.trim(),
        variant_b_name: variantB.trim(),
        target_metric: targetMetric,
      });
      toast.success("A/B test oluşturuldu!");
      onCreated();
    } catch {
      toast.error("Oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Yeni A/B Testi</h4>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors">
          <XCircle className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Test Adı *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Persona Tonu Testi" className="h-9 text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Açıklama</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Resmi vs samimi dil karşılaştırması" className="h-9 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Varyant A (Kontrol)</Label>
            <Input value={variantA} onChange={e => setVariantA(e.target.value)} placeholder="Kontrol" className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Varyant B (Tedavi)</Label>
            <Input value={variantB} onChange={e => setVariantB(e.target.value)} placeholder="Tedavi" className="h-9 text-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Hedef Metrik</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setTargetMetric(m.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs transition-all",
                  targetMetric === m.value
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                    : "border-border/50 hover:border-border text-muted-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full h-9 text-sm">
        {isSubmitting ? "Oluşturuluyor..." : "Testi Başlat"}
      </Button>
    </form>
  );
}

// ─── Test Results Dashboard ────────────────────────────────────────────────────

function TestResultsDashboard({ test, summaries, results }: {
  test: ABTest;
  summaries: ABTestSummary[];
  results: ABTestResult[];
}) {
  const controlSummary = summaries.find(s => s.variant === "control");
  const treatmentSummary = summaries.find(s => s.variant === "treatment");

  const controlAvg = (c: number | null | undefined) => c ?? 0;
  const treatmentAvg = (t: number | null | undefined) => t ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Test info header */}
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">{test.name}</CardTitle>
            </div>
            <Badge variant={test.is_active ? "default" : "secondary"} className="text-[10px]">
              {test.is_active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3.5 pt-1">
          <p className="text-xs text-muted-foreground">{test.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>Metrik: {METRIC_LABELS[test.target_metric].label}</span>
            <span>·</span>
            <span>A: {test.variant_a_name} · B: {test.variant_b_name}</span>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Control card */}
        <Card className={cn(controlSummary && "ring-1 ring-primary/20")}>
          <CardContent className="p-3.5">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">{test.variant_a_name} (Kontrol)</h4>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold">{controlAvg(controlSummary?.total_count)}</span>
              <span className="text-[10px] text-muted-foreground">toplam konuşma</span>
            </div>
            {controlSummary && (
              <div className="mt-2 flex flex-col gap-1 text-[11px]">
                <span>Memnuniyet: {controlSummary.avg_satisfaction ?? "-"}/5</span>
                <span>Tamamlama: %{controlSummary.avg_completion_rate ?? "-"}</span>
                <span>Yanıt: {controlSummary.avg_response_time ?? "-"}sn</span>
                <span>Dönüşüm: %{controlSummary.conversion_rate ?? "-"}</span>
                <span>Handoff: %{controlSummary.handoff_rate ?? "-"}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment card */}
        <Card className={cn(treatmentSummary && "ring-1 ring-green-500/20")}>
          <CardContent className="p-3.5">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">{test.variant_b_name} (Tedavi)</h4>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold">{treatmentAvg(treatmentSummary?.total_count)}</span>
              <span className="text-[10px] text-muted-foreground">toplam konuşma</span>
            </div>
            {treatmentSummary && (
              <div className="mt-2 flex flex-col gap-1 text-[11px]">
                <span>Memnuniyet: {treatmentSummary.avg_satisfaction ?? "-"}/5</span>
                <span>Tamamlama: %{treatmentSummary.avg_completion_rate ?? "-"}</span>
                <span>Yanıt: {treatmentSummary.avg_response_time ?? "-"}sn</span>
                <span>Dönüşüm: %{treatmentSummary.conversion_rate ?? "-"}</span>
                <span>Handoff: %{treatmentSummary.handoff_rate ?? "-"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison bars */}
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-semibold">Karşılaştırma</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-1 flex flex-col gap-3">
          <ComparisonBar
            label="Memnuniyet Puanı"
            control={controlSummary?.avg_satisfaction}
            treatment={treatmentSummary?.avg_satisfaction}
            metric="satisfaction_score"
          />
          <ComparisonBar
            label="Tamamlama Oranı (%)"
            control={controlSummary?.avg_completion_rate}
            treatment={treatmentSummary?.avg_completion_rate}
            metric="completion_rate"
          />
          <ComparisonBar
            label="Yanıt Süresi (sn)"
            control={controlSummary?.avg_response_time}
            treatment={treatmentSummary?.avg_response_time}
            metric="response_time"
          />
          <ComparisonBar
            label="Dönüşüm Oranı (%)"
            control={controlSummary?.conversion_rate}
            treatment={treatmentSummary?.conversion_rate}
            metric="conversion_rate"
          />
          <ComparisonBar
            label="Handoff Oranı (%)"
            control={controlSummary?.handoff_rate}
            treatment={treatmentSummary?.handoff_rate}
            metric="response_time" // lower is better for handoff
          />
        </CardContent>
      </Card>

      {/* Recent results */}
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-semibold">Son Sonuçlar ({results.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-1 flex flex-col gap-2">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Henüz sonuç kaydı yok</p>
          ) : (
            results.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={r.variant === "control" ? "secondary" : "default"} className="text-[9px] px-1.5">
                    {r.variant === "control" ? "K" : "T"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {r.satisfaction_score != null ? `${r.satisfaction_score}/5` : "-"} · %{r.completion_rate ?? "-"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {r.converted && <CheckCircle2 className="size-3 text-green-500" />}
                  {r.was_handoff && <Users className="size-3 text-amber-500" />}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ABTestPage() {
  return <ABTestPageContent />;
}

function ABTestPageContent() {
  const [showCreate, setShowCreate] = React.useState(false);
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(null);

  const { data: tests } = useABTests();
  const { data: summaries } = useABTestSummary(selectedTestId ?? undefined);
  const { data: results } = useABTestResults(selectedTestId ?? undefined);
  const toggleTest = useToggleABTest();

  // Fallback to mock
  const displayTests = tests ?? mockABTests;
  const displaySummaries = summaries ?? mockABTestSummaries;
  const displayResults = results ?? mockABTestResults;

  const selectedTest = displayTests.find(t => t.id === selectedTestId);

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleTest.mutateAsync({ id, is_active: isActive });
      toast.success(isActive ? "Test aktifleştirildi" : "Test durduruldu");
    } catch {
      toast.error("Güncellenemedi");
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">A/B Testleri</h2>
              <p className="text-xs text-muted-foreground">
                AI yanıt kalitesi test ve karşılaştırma
              </p>
            </div>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={FlaskConical}
            label="Toplam Test"
            value={displayTests.length}
            subtext={`${displayTests.filter(t => t.is_active).length} aktif`}
          />
          <StatCard
            icon={BarChart3}
            label="Toplam Sonuç"
            value={displayResults.length}
            subtext={`${displaySummaries.find(s => s.variant === "treatment")?.total_count ?? 0} tedavi`}
          />
        </div>

        {/* Create button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs flex-1"
            onClick={() => { setShowCreate(!showCreate); setSelectedTestId(null); }}
          >
            <Plus className="mr-1 size-3" />
            Yeni Test
          </Button>
          {selectedTest && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setSelectedTestId(null)}
            >
              <BarChart3 className="mr-1 size-3" />
              Tümü
            </Button>
          )}
        </div>

        {showCreate && (
          <CreateTestForm
            onClose={() => setShowCreate(false)}
            onCreated={() => setShowCreate(false)}
          />
        )}

        {/* Test dashboard (when a test is selected) */}
        {selectedTest ? (
          <TestResultsDashboard
            test={selectedTest}
            summaries={displaySummaries}
            results={displayResults}
          />
        ) : (
          /* Test list */
          <div className="flex flex-col gap-2.5">
            {displayTests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <FlaskConical className="size-8" />
                <p className="text-sm">Henüz A/B testi oluşturulmamış</p>
                <p className="text-xs">Yeni test oluşturmak için yukarıdaki butonu kullanın</p>
              </div>
            ) : (
              displayTests.map(test => {
                const MetricIcon = METRIC_LABELS[test.target_metric].icon;
                return (
                  <button
                    key={test.id}
                    onClick={() => { setSelectedTestId(test.id); setShowCreate(false); }}
                    className="flex flex-col gap-2 rounded-lg border border-border/50 p-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-1.5">
                          <FlaskConical className="size-3.5 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{test.name}</span>
                          <span className="text-[10px] text-muted-foreground">{test.description}</span>
                        </div>
                      </div>
                      <Switch
                        checked={test.is_active}
                        onCheckedChange={(checked) => handleToggle(test.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <Separator className="my-0.5" />

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MetricIcon className="size-3" />
                        {METRIC_LABELS[test.target_metric].label}
                      </span>
                      <span>·</span>
                      <span>A: {test.variant_a_name}</span>
                      <span>B: {test.variant_b_name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
