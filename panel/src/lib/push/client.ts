/**
 * Push Bildirim İstemci Yardımcı Fonksiyonları
 * Tarayıcı tarafında push bildirim abonelik yönetimi.
 */

/**
 * Push bildiriminin desteklenip desteklenmediğini kontrol et
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Mevcut bildirim izni durumunu al
 */
export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Bildirim izni iste
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("Push bildirimleri bu tarayıcıda desteklenmiyor.");
    return false;
  }

  if (Notification.permission === "denied") {
    console.warn("Bildirim izni reddedilmiş. Kullanıcı tarayıcı ayarlarından izin vermelidir.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Bildirim izni istenirken hata oluştu:", error);
    return false;
  }
}

/**
 * Service Worker'ı al
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined") return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Service Worker alınamadı:", error);
    return null;
  }
}

/**
 * Mevcut push aboneliğini kontrol et
 */
export async function isPushSubscribed(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * VAPID açık anahtarını base64'ten Uint8Array'e çevir
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Push bildirimlerine abone ol
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn("Push bildirimleri desteklenmiyor.");
    return null;
  }

  // İzin iste
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn("Bildirim izni alınamadı.");
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    console.warn("Service Worker hazır değil.");
    return null;
  }

  // Zaten abone mi kontrol et
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error("VAPID açık anahtarı bulunamadı.");
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Aboneliği sunucuya gönder
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    if (!response.ok) {
      // Sunucuya kayıt başarısız olursa aboneliği iptal et
      await subscription.unsubscribe();
      console.error("Push aboneliği sunucuya kaydedilemedi.");
      return null;
    }

    return subscription;
  } catch (error) {
    console.error("Push aboneliği oluşturulamadı:", error);
    return null;
  }
}

/**
 * Push bildirim aboneliğini iptal et
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true; // Zaten abone değil

    // Sunucudan aboneliği kaldır
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    // Tarayıcı aboneliğini iptal et
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error("Push aboneliği iptal edilemedi:", error);
    return false;
  }
}
