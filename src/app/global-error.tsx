"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="size-7 text-destructive"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">
              Kritik hata
            </h2>
            <p className="text-sm text-muted-foreground">
              Uygulama yüklenemedi. Sayfayı yenilemeyi deneyin.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Sayfayı Yenile
          </button>
        </div>
      </body>
    </html>
  );
}
