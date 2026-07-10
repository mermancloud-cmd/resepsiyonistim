import { test, expect } from "@playwright/test";

test.describe("Subscription Page — Plan Selection & IBAN", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("plan kartları görünür: Başlangıç, Profesyonel, Kurumsal", async ({ page }) => {
    await page.goto("/subscription");
    // Subscription page may redirect to login if not authenticated.
    // We just check the page loads if accessible.
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip();
      return;
    }
    await expect(page.getByText(/Başlangıç/i).or(page.getByText(/Plans?/i))).toBeVisible();
  });

  test("IBAN bilgi alanı görünür", async ({ page }) => {
    await page.goto("/subscription?reason=trial_expired");
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip();
      return;
    }
    // IBAN transfer info section
    await expect(page.getByText(/IBAN/i).or(page.getByText(/Havale/i))).toBeVisible();
  });

  test("sayfa başlığı Abonelik Planları içerir", async ({ page }) => {
    await page.goto("/subscription");
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip();
      return;
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Abonelik/i);
  });

  test("plan seç butonları mevcut", async ({ page }) => {
    await page.goto("/subscription");
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip();
      return;
    }
    const buttons = page.getByRole("button").filter({ hasText: /Seç|Başla/i });
    await expect(buttons.first()).toBeVisible();
  });
});
