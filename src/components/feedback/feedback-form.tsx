"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  Meh,
  Frown,
  Angry,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubmitFeedback, FEEDBACK_CATEGORIES, getCategoryLabel } from "@/hooks/use-feedback";
import type { FeedbackCategory } from "@/lib/types";
import { toast } from "sonner";

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Puan">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && star < 5) onChange(star + 1);
            if (e.key === "ArrowLeft" && star > 1) onChange(star - 1);
          }}
          className={cn(
            "rounded-md p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            disabled && "opacity-50 cursor-not-allowed",
            star <= value
              ? "text-amber-400 scale-110"
              : "text-muted-foreground/30 hover:text-muted-foreground/60"
          )}
          aria-label={`${star} yıldız`}
          aria-pressed={star <= value}
        >
          <Star
            className={cn(
              "size-7 transition-transform",
              star <= value ? "fill-amber-400" : "fill-none"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Rating Emoji ────────────────────────────────────────────────────────────

function RatingEmoji({ rating }: { rating: number }) {
  if (rating === 0) return null;
  const icons = {
    1: Angry,
    2: Frown,
    3: Meh,
    4: ThumbsUp,
    5: ThumbsUp,
  };
  const colors = {
    1: "text-red-500",
    2: "text-orange-400",
    3: "text-yellow-400",
    4: "text-lime-500",
    5: "text-green-500",
  };
  const labels = {
    1: "Çok Kötü",
    2: "Kötü",
    3: "Orta",
    4: "İyi",
    5: "Harika",
  };
  const Icon = icons[rating as keyof typeof icons];
  return (
    <div className="flex items-center gap-2 mt-1">
      <Icon className={cn("size-5", colors[rating as keyof typeof colors])} />
      <span className="text-sm font-medium text-muted-foreground">
        {labels[rating as keyof typeof labels]}
      </span>
    </div>
  );
}

// ─── Quick Category Picker ───────────────────────────────────────────────────

function CategoryPicker({
  value,
  onChange,
}: {
  value: FeedbackCategory;
  onChange: (v: FeedbackCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kategori">
      {FEEDBACK_CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === cat.value
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          )}
          aria-pressed={value === cat.value}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main FeedbackForm Component ────────────────────────────────────────────

export interface FeedbackFormProps {
  conversationId?: string;
  onSubmitted?: () => void;
  compact?: boolean;
}

export function FeedbackForm({ conversationId, onSubmitted, compact }: FeedbackFormProps) {
  const [rating, setRating] = React.useState(0);
  const [category, setCategory] = React.useState<FeedbackCategory>("genel");
  const [comment, setComment] = React.useState("");
  const [step, setStep] = React.useState<"rating" | "details" | "done">("rating");
  const submitFeedback = useSubmitFeedback();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmitRating = () => {
    if (rating === 0) {
      toast.error("Lütfen bir puan seçin");
      return;
    }
    if (rating <= 3 || comment.trim()) {
      setStep("details");
    } else {
      // Rating 4-5 and no comment needed — submit directly
      handleSubmit("");
    }
  };

  const handleSubmit = async (finalComment?: string) => {
    setIsSubmitting(true);
    try {
      await submitFeedback.mutateAsync({
        conversation_id: conversationId ?? null,
        rating,
        category,
        comment: (finalComment ?? comment).trim() || null,
      });
      setStep("done");
      toast.success("Geri bildiriminiz için teşekkürler! 🎉");
      onSubmitted?.();
    } catch {
      toast.error("Gönderilemedi, tekrar deneyin");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <ThumbsUp className="size-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Geri bildiriminiz kaydedildi!</p>
        <p className="text-xs text-muted-foreground">
          Değerlendirmeniz hizmet kalitemizi iyileştirmemize yardımcı oluyor.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { setStep("rating"); setRating(0); setComment(""); }}>
          Yeni Değerlendirme
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", compact ? "p-0" : "rounded-xl border border-border/50 bg-card p-4")}>
      {!compact && (
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Bu Görüşmeyi Değerlendirin</h3>
        </div>
      )}

      {step === "rating" ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Deneyiminizi nasıl buldunuz?
          </p>

          <StarRating value={rating} onChange={setRating} />
          <RatingEmoji rating={rating} />

          <Button
            size="sm"
            className="mt-2 h-9 min-w-[120px] text-sm"
            disabled={rating === 0}
            onClick={handleSubmitRating}
          >
            {rating >= 4 ? "Gönder" : "Devam"}
            {rating >= 4 ? <Send className="ml-1.5 size-3.5" /> : <Meh className="ml-1.5 size-3.5" />}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRating value={rating} onChange={setRating} disabled />
              <RatingEmoji rating={rating} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Kategori</Label>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Yorumunuz <span className="text-[10px]">(isteğe bağlı)</span>
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deneyiminizi kısaca anlatın..."
              className="min-h-[80px] resize-none text-sm"
              maxLength={1000}
            />
            <span className="text-[10px] text-muted-foreground text-right">
              {comment.length}/1000
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs flex-1"
              onClick={() => setStep("rating")}
              disabled={isSubmitting}
            >
              Geri
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs flex-1"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Gönderiliyor..." : "Gönder"}
              <Send className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
