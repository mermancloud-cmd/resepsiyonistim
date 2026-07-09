"use client";
import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessagesSquare,
  Sparkles,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  CircleX,
  Brain,
  ThumbsUp,
  FileText,
  Plus,
  X,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useHumanizationScenarios,
  useHumanizationSummary,
  useHumanizationScenarioStats,
  useHumanizationScores,
  useSubmitHumanizationScore,
  mockScenarios,
  mockSummary,
  mockScenarioStats,
} from "@/hooks/use-humanization";
import {
  HUMANIZATION_CATEGORY_LABELS,
  HUMANIZATION_SCORE_LABELS,
  type HumanizationScenario,
  type HumanizationScenarioStats,
  type HumanizationCategory,
} from "@/lib/types";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TREND_ICONS = {
  improving: { icon: TrendingUp, class: "text-green-500" },
  declining: { icon: AlertTriangle, class: "text-red-500" },
  stable: { icon: MinusIcon, class: "text-muted-foreground" },
} as const;

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-4 w-full animate-pulse rounded bg-muted", className)} />;
}

function SkeletonCard_() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-3.5">
      <SkeletonLine className="h-5 w-32" />
      <SkeletonLine className="h-8 w-16" />
      <SkeletonLine className="h-3 w-24" />
    </div>
  );
}

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
            {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
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

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, target }: { score: number | null; target: number }) {
  const s = score ?? 0;
  const pct = Math.min(s, 100);
  const isPassing = s >= target;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isPassing ? "bg-green-500" : s >= target * 0.85 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-semibold tabular-nums w-10 text-right",
        isPassing ? "text-green-600" : "text-red-500"
      )}>
        {s.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Score Bar (dimension breakdown) ─────────────────────────────────────────

function ScoreBar({ label, value, maxScore = 100 }: { label: string; value: number | null; maxScore?: number }) {
  const v = value ?? 0;
  const pct = (v / maxScore) * 100;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium tabular-nums text-foreground/80">{v.toFixed(1)}</span>
    </div>
  );
}

// ─── Scenario Card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  stats,
  onEvaluate,
  isSelected,
  onSelect,
}: {
  scenario: HumanizationScenario;
  stats?: HumanizationScenarioStats;
  onEvaluate: (s: HumanizationScenario) => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const TrendIcon = stats ? TREND_ICONS[stats.trend].icon : null;
  const trendClass = stats ? TREND_ICONS[stats.trend].class : "";

  return (
    <Card className={cn("transition-all", isSelected && "ring-2 ring-primary/30")}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                {HUMANIZATION_CATEGORY_LABELS[scenario.category] ?? scenario.category}
              </Badge>
              <span className="text-xs font-semibold truncate">{scenario.name}</span>
              {TrendIcon && (
                <TrendIcon className={cn("size-3.5 shrink-0", trendClass)} />
              )}
            </div>
            {scenario.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{scenario.description}</p>
            )}

            {stats && (
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span>{stats.total_evaluations} değerlendirme</span>
                <span>·</span>
                <span className={cn(
                  (stats.passed_count / Math.max(stats.total_evaluations, 1)) >= 0.8 ? "text-green-600" : "text-amber-600"
                )}>
                  %{(stats.passed_count / Math.max(stats.total_evaluations, 1) * 100).toFixed(0)} geçti
                </span>
                <span>·</span>
                <span>Hedef: {scenario.min_target_score}</span>
              </div>
            )}

            {!stats && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Henüz değerlendirme yok
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => { e.stopPropagation(); onEvaluate(scenario); }}
              title="Değerlendir"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              title="Detaylar"
            >
              {isSelected ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          </div>
        </div>

        {/* Score gauge */}
        {stats && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Bileşik Skor</span>
              <span className="text-[10px] text-muted-foreground">Hedef: {scenario.min_target_score}</span>
            </div>
            <ScoreGauge score={stats.avg_composite} target={scenario.min_target_score} />
          </div>
        )}

        {/* Expanded detail */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">Kriterler:</span>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {scenario.evaluation_criteria.map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{c.name}</span>
                      <span>%{Math.round(c.weight * 100)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">Beklenen Davranışlar:</span>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {scenario.expected_behaviors.map((b, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="size-1 rounded-full bg-primary/40 inline-block" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Evaluation Form ──────────────────────────────────────────────────────────

interface ScoreDimension {
  key: string;
  label: string;
  value: number;
}

const SCORE_DIMENSIONS: { key: keyof typeof HUMANIZATION_SCORE_LABELS; label: string }[] = [
  { key: 'score_naturalness', label: 'Doğallık' },
  { key: 'score_empathy', label: 'Empati' },
  { key: 'score_fluency', label: 'Akıcılık' },
  { key: 'score_context', label: 'Bağlam' },
  { key: 'score_personalization', label: 'Kişiselleştirme' },
  { key: 'score_flow', label: 'Akış' },
  { key: 'score_tone', label: 'Ton' },
];

function EvaluationForm({
  scenario,
  onClose,
}: {
  scenario: HumanizationScenario;
  onClose: () => void;
}) {
  const submitScore = useSubmitHumanizationScore();
  const [aiResponse, setAiResponse] = React.useState("");
  const [scores, setScores] = React.useState<Record<string, number>>(
    Object.fromEntries(SCORE_DIMENSIONS.map(d => [d.key, 75]))
  );
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const updateScore = (key: string, value: number[]) => {
    setScores(prev => ({ ...prev, [key]: value[0] }));
  };

  // Base UI Slider onValueChange passes (value: number | readonly number[])
  const handleSliderChange = (key: string) => (value: number | readonly number[]) => {
    const arr = Array.isArray(value) ? value : [value];
    setScores(prev => ({ ...prev, [key]: arr[0] }));
  };

  // Calculate weighted composite
  const composite = React.useMemo(() => {
    const criteria = scenario.evaluation_criteria;
    if (!criteria || criteria.length === 0) {
      // Fallback: equal weight
      const vals = Object.values(scores);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    let total = 0;
    let weightSum = 0;
    for (const c of criteria) {
      const dimKey = `score_${c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`;
      // Map criteria name to closest dimension
      const scoreKey = SCORE_DIMENSIONS.find(d =>
        d.label.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(d.label.toLowerCase())
      )?.key;
      const scoreVal = scoreKey ? (scores[scoreKey] ?? 75) : 75;
      total += scoreVal * c.weight;
      weightSum += c.weight;
    }
    return weightSum > 0 ? total / weightSum : 75;
  }, [scores, scenario.evaluation_criteria]);

  const passed = composite >= scenario.min_target_score;

  const handleSubmit = async () => {
    if (!aiResponse.trim()) {
      toast.error("AI yanıtı zorunludur");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitScore.mutateAsync({
        scenario_id: scenario.id,
        ai_response_text: aiResponse.trim(),
        score_naturalness: scores.score_naturalness,
        score_empathy: scores.score_empathy,
        score_fluency: scores.score_fluency,
        score_context: scores.score_context,
        score_personalization: scores.score_personalization,
        score_flow: scores.score_flow,
        score_tone: scores.score_tone,
        composite_score: Math.round(composite * 10) / 10,
        evaluation_method: 'manual',
        notes: notes.trim() || undefined,
        passed,
      });
      toast.success(`Değerlendirme kaydedildi! Skor: ${composite.toFixed(1)}/100`);
      onClose();
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h4 className="text-sm font-semibold">{scenario.name}</h4>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      {/* AI Response Input */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">AI Yanıtı *</Label>
        <Textarea
          value={aiResponse}
          onChange={e => setAiResponse(e.target.value)}
          placeholder="Değerlendirilecek AI yanıtını yapıştırın..."
          className="min-h-[80px] text-sm resize-none"
        />
      </div>

      {/* Dimension Scores */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Boyut Puanları (0-100)</Label>
        {SCORE_DIMENSIONS.map(dim => (
          <div key={dim.key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{dim.label}</span>
            <Slider
              className="flex-1"
              value={[scores[dim.key]]}
              onValueChange={(value: number | readonly number[], _details: unknown) => {
                const v = Array.isArray(value) ? value[0] : value;
                setScores(prev => ({ ...prev, [dim.key]: v }));
              }}
              min={0}
              max={100}
              step={5}
            />
            <span className="text-xs font-semibold tabular-nums w-8 text-right">{scores[dim.key]}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Notlar</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Değerlendirme notları (opsiyonel)..."
          className="min-h-[60px] text-sm resize-none"
        />
      </div>

      {/* Composite score preview */}
      <div className={cn(
        "rounded-lg border p-3 flex items-center justify-between",
        passed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      )}>
        <div className="flex flex-col">
          <span className="text-xs font-medium">Bileşik Skor</span>
          <span className="text-[10px] text-muted-foreground">Hedef: {scenario.min_target_score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-lg font-bold",
            passed ? "text-green-600" : "text-amber-600"
          )}>
            {composite.toFixed(1)}
          </span>
          {passed ? (
            <CircleCheckBig className="size-5 text-green-500" />
          ) : (
            <CircleX className="size-5 text-amber-500" />
          )}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !aiResponse.trim()}
        className="w-full h-9 text-sm"
      >
        {isSubmitting ? "Kaydediliyor..." : "Değerlendirmeyi Kaydet"}
      </Button>
    </div>
  );
}

// ─── Score Detail Sheet ─────────────────────────────────────────────────────────

function ScoreDetailView({ scenario, onClose }: { scenario: HumanizationScenario; onClose: () => void }) {
  const { data: scores, isLoading } = useHumanizationScores(scenario.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Puan Geçmişi: {scenario.name}</h4>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} className="h-12" />
          ))}
        </div>
      ) : !scores || scores.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Henüz değerlendirme kaydı yok</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          {scores.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 text-xs">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant={s.passed ? "default" : "secondary"} className="text-[9px] px-1.5">
                    {s.passed ? "Geçti" : "Kaldı"}
                  </Badge>
                  <span className="font-semibold">{s.composite_score?.toFixed(1)}</span>
                  <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {s.evaluation_method === 'manual' ? 'Manuel' : s.evaluation_method === 'llm_judge' ? 'AI Hakem' : 'Otomatik'}
                  {s.notes && ` · ${s.notes.slice(0, 60)}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">D:{s.score_naturalness?.toFixed(0) ?? '-'}</span>
                <span className="text-[10px] text-muted-foreground">E:{s.score_empathy?.toFixed(0) ?? '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HumanizationPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return <HumanizationPageContent />;
}

function HumanizationPageContent() {
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'scenarios'>('dashboard');
  const [evaluatingScenario, setEvaluatingScenario] = React.useState<HumanizationScenario | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = React.useState<string | null>(null);
  const [viewingScores, setViewingScores] = React.useState<HumanizationScenario | null>(null);

  const { data: scenarios, isLoading: scenariosLoading } = useHumanizationScenarios();
  const { data: summary, isLoading: summaryLoading } = useHumanizationSummary();
  const { data: scenarioStats, isLoading: statsLoading } = useHumanizationScenarioStats();

  // Fallback mock data
  const displayScenarios = scenarios ?? mockScenarios;
  const displaySummary = summary ?? mockSummary;
  const displayStats = scenarioStats ?? mockScenarioStats;

  const handleEvaluate = (s: HumanizationScenario) => {
    setEvaluatingScenario(s);
    setViewingScores(null);
  };

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(prev => prev === id ? null : id);
  };

  const handleViewScores = (s: HumanizationScenario) => {
    setViewingScores(s);
    setEvaluatingScenario(null);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Humanizasyon</h2>
              <p className="text-xs text-muted-foreground">
                AI yanıt kalitesi değerlendirme (&ge;95 hedef)
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Dashboard / Scenarios */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="dashboard" className="text-xs">Pano</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Senaryolar</TabsTrigger>
          </TabsList>

          {/* ─── Dashboard Tab ─────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="mt-4 flex flex-col gap-4">
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={BarChart3}
                label="Toplam Değerlendirme"
                value={displaySummary.total_evaluations}
                subtext={`${displaySummary.passed_count} geçti · ${displaySummary.fail_count} kaldı`}
                trend={displaySummary.pass_rate >= 80 ? 'up' : 'down'}
              />
              <StatCard
                icon={CircleCheckBig}
                label="Başarı Oranı"
                value={`%${displaySummary.pass_rate.toFixed(1)}`}
                subtext={`Hedef: %95`}
                trend={displaySummary.pass_rate >= 90 ? 'up' : 'neutral'}
              />
              <StatCard
                icon={Brain}
                label="Ort. Bileşik"
                value={displaySummary.avg_composite.toFixed(1)}
                subtext={`En iyi: ${displaySummary.best_score.toFixed(1)}`}
                trend={displaySummary.avg_composite >= 90 ? 'up' : displaySummary.avg_composite >= 80 ? 'neutral' : 'down'}
              />
              <StatCard
                icon={Target}
                label="Aktif Senaryo"
                value={displaySummary.scenario_count}
                subtext="değerlendirme bekliyor"
                trend="neutral"
              />
            </div>

            {/* Dimension averages */}
            <Card>
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ThumbsUp className="size-4 text-primary" />
                  Boyut Ortalamaları
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-1 flex flex-col gap-2">
                <ScoreBar label="Doğallık" value={displaySummary.avg_naturalness} />
                <ScoreBar label="Empati" value={displaySummary.avg_empathy} />
                <ScoreBar label="Akıcılık" value={displaySummary.avg_fluency} />
                <ScoreBar label="Bağlam" value={displaySummary.avg_context} />
                <ScoreBar label="Kişiselleştirme" value={displaySummary.avg_personalization} />
                <ScoreBar label="Akış" value={displaySummary.avg_flow} />
                <ScoreBar label="Ton" value={displaySummary.avg_tone} />
              </CardContent>
            </Card>

            {/* Best/Worst */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-3.5">
                  <span className="text-[10px] text-muted-foreground">En Yüksek Skor</span>
                  <div className="flex items-center gap-2 mt-1">
                    <CircleCheckBig className="size-4 text-green-500" />
                    <span className="text-lg font-bold text-green-600">{displaySummary.best_score.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-3.5">
                  <span className="text-[10px] text-muted-foreground">En Düşük Skor</span>
                  <div className="flex items-center gap-2 mt-1">
                    <CircleX className="size-4 text-red-500" />
                    <span className="text-lg font-bold text-red-500">{displaySummary.worst_score.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Son değerlendirme */}
            {displaySummary.last_evaluated_at && (
              <p className="text-[10px] text-muted-foreground text-center">
                Son değerlendirme: {new Date(displaySummary.last_evaluated_at).toLocaleDateString("tr-TR", {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </TabsContent>

          {/* ─── Scenarios Tab ──────────────────────────────────────────── */}
          <TabsContent value="scenarios" className="mt-4 flex flex-col gap-4">
            {/* Evaluation form (when active) */}
            {evaluatingScenario && (
              <EvaluationForm
                scenario={evaluatingScenario}
                onClose={() => setEvaluatingScenario(null)}
              />
            )}

            {/* Score detail view */}
            {viewingScores && (
              <ScoreDetailView
                scenario={viewingScores}
                onClose={() => setViewingScores(null)}
              />
            )}

            {/* Scenario list */}
            {scenariosLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard_ key={i} />)}
              </div>
            ) : displayScenarios.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Henüz senaryo yok</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lütfen seed verilerini yükleyin veya Supabase migration&apos;ı çalıştırın.
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayScenarios.map(scenario => {
                const stats = displayStats.find(s => s.scenario_id === scenario.id);
                return (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    stats={stats}
                    onEvaluate={handleEvaluate}
                    isSelected={selectedScenarioId === scenario.id}
                    onSelect={() => handleSelectScenario(scenario.id)}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileShell>
  );
}
