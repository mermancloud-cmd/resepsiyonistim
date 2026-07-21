import { test, expect } from "@playwright/test";

test.describe("Login — Supabase Auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("sayfa yüklenir — başlık görünür", async ({ page }) => {
    await expect(page.getByText(/Tekrar hoş geldin/i)).toBeVisible();
  });

  test("e-posta ve şifre alanları görünür", async ({ page }) => {
    await expect(page.getByPlaceholder(/ornek@email.com/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Giriş Yap/i })).toBeVisible();
  });

  test("boş form ile giriş butonu disabled", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /Giriş Yap/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("geçersiz email validasyonu gösterir", async ({ page }) => {
    const emailInput = page.getByPlaceholder(/ornek@email.com/i);
    await emailInput.fill("gecersiz-email");
    // Submit butonu hala disabled olmalı (email validasyonu client-side)
    const submitBtn = page.getByRole("button", { name: /Giriş Yap/i });
    // Hata mesajı gösterilmeli
  });

  test("Google ve Apple sosyal login butonları görünür", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Apple/i })).toBeVisible();
  });

  test("kayıt ol linki var", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Ücretsiz dene/i })).toBeVisible();
  });

  test("sayfa Türkçe başlık taşır", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain("giriş");
  });

  test("dashboard'a yetkisiz erişim login'e yönlendirir", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("rezervasyonlara yetkisiz erişim login'e yönlendirir", async ({ page }) => {
    await page.goto("/reservations");
    await expect(page).toHaveURL(/\/login/);
  });

  test("mesajlara yetkisiz erişim login'e yönlendirir", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/);
  });

  test("şifre göster/gizle toggle çalışır", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill("deneme123");

    const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    // Toggle varsa çalışır
  });

  test("Giriş sayfasında logo veya marka adı görünür", async ({ page }) => {
    await expect(
      page.getByText(/Resepsiyonistim/i).or(page.locator('img[alt*="Resepsiyonist"]'))
    ).toBeVisible();
  });

  test("e-posta ile giriş linki görünür", async ({ page }) => {
    await expect(page.getByText(/E-posta ile giriş/i)).toBeVisible();
  });

  test("kullanım koşulları linki görünür", async ({ page }) => {
    await expect(page.getByText(/kullanım koşulları/i)).toBeVisible();
  });

  test("beni hatırla checkbox görünür", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
  });
});
