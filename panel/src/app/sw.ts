/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, BackgroundSyncPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ─── Push Notification Payload Type ─────────────────────────────────────────
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
  };
}

// ─── Background Sync for Failed API Calls ───────────────────────────────────
const backgroundSync = new BackgroundSyncPlugin("bungalov-api-queue", {
  maxRetentionTime: 24 * 60, // 24 saat boyunca yeniden deneme
});

// ─── Serwist Instance ───────────────────────────────────────────────────────
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API istekleri için NetworkFirst stratejisi
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "bungalov-api-cache",
        networkTimeoutSeconds: 10,
        plugins: [
          backgroundSync,
          {
            cacheWillUpdate: async ({ response }) => {
              // Sadece başarılı yanıtları önbelleğe al
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },
    // Statik varlıklar için önbellek
    ...defaultCache,
  ],
});

// ─── Push Event Handler ─────────────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  const payload: PushPayload = event.data.json();
  const { title, body, icon, badge, data } = payload;

  const notificationOptions: NotificationOptions = {
    body: body || "Yeni bir bildiriminiz var.",
    icon: icon || "/icon-192.png",
    badge: badge || "/badge-72.png",
    data: data || {},
    requireInteraction: false,
    tag: "bungalov-notification",
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

// ─── Notification Click Handler ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    (self as any).clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any) => {
      // Eğer zaten açık bir pencere varsa, onu odakla
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Yoksa yeni bir pencere aç
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── Apply Serwist Configuration ────────────────────────────────────────────
serwist.addEventListeners();
