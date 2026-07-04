"use client";

import * as React from "react";
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "@/lib/push/client";

type PermissionStatus = "default" | "granted" | "denied" | "unsupported" | "unknown";

interface UsePushNotificationReturn {
  /** Mevcut izin durumu */
  permission: PermissionStatus;
  /** Push'a abone olunup olunmadığı */
  isSubscribed: boolean;
  /** İşlem devam ediyor mu */
  isLoading: boolean;
  /** Hata mesajı (varsa) */
  error: string | null;
  /** Push bildirimlerine abone ol */
  subscribe: () => Promise<void>;
  /** Push bildirim aboneliğini iptal et */
  unsubscribe: () => Promise<void>;
  /** Push destekleniyor mu */
  isSupported: boolean;
}

/**
 * Push bildirim yönetimi için React hook'u
 * Bildirim izni, abonelik durumu ve abone/iptal fonksiyonlarını yönetir.
 */
export function usePushNotification(): UsePushNotificationReturn {
  const [permission, setPermission] = React.useState<PermissionStatus>("unknown");
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isSupported = React.useMemo(() => isPushSupported(), []);

  // İlk yüklemede durumu kontrol et
  React.useEffect(() => {
    async function checkStatus() {
      const permStatus = getPermissionStatus();
      if (permStatus === "unsupported") {
        setPermission("unsupported");
        return;
      }
      setPermission(permStatus);

      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);
    }

    checkStatus();
  }, []);

  const subscribe = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        setPermission("granted");
      } else {
        setError("Push bildirimlerine abone olunamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
      } else {
        setError("Abonelik iptal edilemedi.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isSupported,
  };
}
