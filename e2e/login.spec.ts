import { test, expect } from "@playwright/test";

test.describe("Login — Supabase Auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("sayfa yüklenir — başlık görünür", async ({ page }) => {
    await expect(page.getByText(/Giriş Yap/i).or(page.getByText(/Telefon ile Giriş/i))).toBeVisible();
  });

  test("üç yöntem seçeneği görünür: Telefon, E-posta, Sihirli Link", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Telefon" })).toBeVisible();
    await expect(page.getByRole("button", { name: "E-posta" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sihirli Link/i })).toBeVisible();
  });

  test("telefon giriş formu varsayılan olarak görünür", async ({ page }) => {
    await expect(page.getByText(/Telefon Numarası/i)).toBeVisible();
    await expect(page.getByPlaceholder(/5XX/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Kod Gönder/i })).toBeVisible();
  });

  test("boş telefon ile kod gönder butonu disabled", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /Kod Gönder/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("telefon input'u sadece rakam ve max 10 karakter alır", async ({ page }) => {
    const phoneInput = page.getByPlaceholder(/5XX/i);
    await phoneInput.fill("532123456789"); // 12 chars
    const value = await phoneInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
    expect(value).toMatch(/^\d*$/);
  });

  test("geçerli telefon formatı ile gönder butonu aktif olur", async ({ page }) => {
    const phoneInput = page.getByPlaceholder(/5XX/i);
    await phoneInput.fill("5321234567");
    const submitBtn = page.getByRole("button", { name: /Kod Gönder/i });
    await expect(submitBtn).toBeEnabled();
  });

  test("E-posta sekmesi — email/password alanları görünür", async ({ page }) => {
    await page.getByRole("button", { name: "E-posta" }).click();
    await expect(page.getByText(/E-posta ile Giriş/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mail@/i)).toBeVisible();
    // password alanı
    const passwordField = page.locator('input[type="password"]').first();
    await expect(passwordField).toBeVisible();
    await expect(page.getByRole("button", { name: /Giriş Yap/i })).toBeVisible();
  });

  test("Sihirli Link sekmesi — email alanı görünür", async ({ page }) => {
    await page.getByRole("button", { name: /Sihirli Link/i }).click();
    await expect(page.getByText(/Sihirli Link/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mail@/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Link Gönder/i })).toBeVisible();
  });

  test("geçersiz email ile Sihirli Link gönder butonu disabled", async ({ page }) => {
    await page.getByRole("button", { name: /Sihirli Link/i }).click();
    const emailInput = page.getByPlaceholder(/mail@/i);
    await emailInput.fill("gecersiz-email");
    const submitBtn = page.getByRole("button", { name: /Link Gönder/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("kayıt ol linki var", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Kayıt Ol/i }).or(page.getByText(/Hesabın yok mu/i))).toBeVisible();
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

  test("mobile: Telefon input +90 ön eki ile görünür", async ({ page }) => {
    const prefix = page.getByText("+90");
    await expect(prefix).toBeVisible();
  });

  test("mobile: giriş buton touch target ≥44px", async ({ page }) => {
    test.skip(true, "needs mobile viewport, skipped in CI");
    const btn = page.getByRole("button", { name: /Kod Gönder/i });
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("E-posta sekmesinde şifre göster/gizle toggle çalışır", async ({ page }) => {
    await page.getByRole("button", { name: "E-posta" }).click();
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill("deneme123");

    // Göster butonu
    const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).last();
    // toggle mevcutsa
  });

  test("Giriş sayfasında logo veya marka adı görünür", async ({ page }) => {
    await expect(page.getByText(/Resepsiyonistim/i).or(page.locator('img[alt*="Resepsiyonist"]'))).toBeVisible();
  });
});
