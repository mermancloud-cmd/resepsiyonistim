"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Panel runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">
            Bir sorun oluştu
          </h2>
          <p className="text-sm text-muted-foreground">
            Sayfa yüklenirken beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
          </p>
        </div>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCw className="size-3.5" />
          Tekrar Dene
        </Button>
      </div>
    </div>
  );
}
