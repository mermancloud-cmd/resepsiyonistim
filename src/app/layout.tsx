import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { AnalyticsInit } from "@/components/analytics-init";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resepsiyonistim — Dijital Resepsiyonist",
  description:
    "Resepsiyoniste ihtiyaç duyan her işletme için 7/24 WhatsApp tabanlı dijital resepsiyonist.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Resepsiyonistim",
  },
  openGraph: {
    title: "Resepsiyonistim — Dijital Resepsiyonist",
    description:
      "İşletmenize 7/24 çalışan, insan gibi konuşan bir dijital resepsiyonist.",
    url: "https://panel.merman.sbs",
    siteName: "Resepsiyonistim",
    locale: "tr_TR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Analytics: Plausible (privacy-first) */}
        <script
          defer
          data-domain="panel.merman.sbs"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans">
        <Providers>
          {children}
          <AnalyticsInit />
        </Providers>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
