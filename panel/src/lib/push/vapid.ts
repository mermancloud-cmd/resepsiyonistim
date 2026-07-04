/**
 * VAPID Anahtar Yönetimi
 * Sunucu tarafında VAPID anahtarlarını yönetir.
 */

import * as webpush from "web-push";

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let vapidConfig: VapidConfig | null = null;

/**
 * VAPID yapılandırmasını al veya ortam değişkenlerinden oluştur
 */
export function getVapidConfig(): VapidConfig {
  if (vapidConfig) return vapidConfig;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@bungalow-panel.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID anahtarları yapılandırılmamış. " +
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY ortam değişkenlerini ayarlayın."
    );
  }

  vapidConfig = { publicKey, privateKey, subject };
  return vapidConfig;
}

/**
 * VAPID açık anahtarını al (istemci tarafında kullanılır)
 */
export function getVapidPublicKey(): string {
  return getVapidConfig().publicKey;
}

/**
 * web-push kütüphanesini VAPID ile yapılandır
 */
export function configureWebPush(): void {
  const config = getVapidConfig();
  webpush.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );
}

/**
 * Yeni VAPID anahtar çifti oluştur (geliştirme için)
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
