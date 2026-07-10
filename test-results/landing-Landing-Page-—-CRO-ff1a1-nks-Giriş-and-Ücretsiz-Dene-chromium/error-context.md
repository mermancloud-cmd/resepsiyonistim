# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing Page — CRO & Conversion >> navigation links: Giriş and Ücretsiz Dene
- Location: e2e/landing.spec.ts:17:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /Giriş/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: /Giriş/i })

```

```yaml
- text: P
- heading "Panel" [level=1]
- paragraph: Resepsiyoniste İhtiyaç Duyulan Her İşletme İçin
- button "Giriş Yap"
- button "Kayıt Ol"
- button "Telefon"
- button "E-posta"
- button "Sihirli Link"
- heading "Telefon ile Giriş" [level=2]
- paragraph: Telefon numaranıza doğrulama kodu gönderelim.
- text: Telefon Numarası +90
- textbox "Telefon Numarası":
  - /placeholder: 5XX XXX XX XX
- button "Kod Gönder" [disabled]
- paragraph: Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
- paragraph:
  - text: Hesabın yok mu?
  - link "E-posta ile Kaydol":
    - /url: /signup
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Landing Page — CRO & Conversion", () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto("/");
  6  |   });
  7  | 
  8  |   test("hero heading and subheading visible", async ({ page }) => {
  9  |     await expect(
  10 |       page.getByRole("heading", { level: 1 })
  11 |     ).toBeVisible();
  12 |     await expect(
  13 |       page.getByText(/Dijital Resepsiyonist/i)
  14 |     ).toBeVisible();
  15 |   });
  16 | 
  17 |   test("navigation links: Giriş and Ücretsiz Dene", async ({ page }) => {
> 18 |     await expect(page.getByRole("link", { name: /Giriş/i })).toBeVisible();
     |                                                              ^ Error: expect(locator).toBeVisible() failed
  19 |     await expect(
  20 |       page.getByRole("link", { name: /Ücretsiz Dene/i })
  21 |     ).toBeVisible();
  22 |   });
  23 | 
  24 |   test("Ücretsiz Dene CTA navigates to /signup", async ({ page }) => {
  25 |     await page.getByRole("link", { name: /Ücretsiz Dene/i }).first().click();
  26 |     await expect(page).toHaveURL(/\/signup/);
  27 |   });
  28 | 
  29 |   test("Giriş link navigates to /login", async ({ page }) => {
  30 |     await page.getByRole("link", { name: /Giriş/i }).click();
  31 |     await expect(page).toHaveURL(/\/login/);
  32 |   });
  33 | 
  34 |   test("features section has 6 feature cards", async ({ page }) => {
  35 |     const cards = page.locator(
  36 |       "section:has(h2:text('Yapabilecekleri')) > div > div > div"
  37 |     );
  38 |     await expect(cards.first()).toBeVisible();
  39 |   });
  40 | 
  41 |   test("WhatsApp demo butonu mevcut", async ({ page }) => {
  42 |     const waButton = page.locator('a[href*="wa.me"]').first();
  43 |     await expect(waButton).toBeVisible();
  44 |   });
  45 | 
  46 |   test("social proof metrics bar visible", async ({ page }) => {
  47 |     // K8 CRO: animated counter section
  48 |     const metricsSection = page.locator("text=/24+|/i").first();
  49 |     // Fallback: check for any animated number section on the page
  50 |     await expect(page.locator("section").first()).toBeVisible();
  51 |   });
  52 | 
  53 |   test("CTA bottom section visible", async ({ page }) => {
  54 |     await expect(page.getByText(/Denemeye Hazır mısın/i)).toBeVisible();
  55 |   });
  56 | 
  57 |   test("footer with copyright", async ({ page }) => {
  58 |     await expect(page.getByText(/Tüm hakları saklıdır/i)).toBeVisible();
  59 |   });
  60 | 
  61 |   test("page title correct", async ({ page }) => {
  62 |     await expect(page).toHaveTitle(/Resepsiyonistim/);
  63 |   });
  64 | 
  65 |   // Mobile-specific
  66 |   test("mobile: touch targets ≥44px on hero CTA", async ({ page }) => {
  67 |     test.skip(true, "needs mobile viewport, skipped in CI");
  68 |     const cta = page.getByRole("link", { name: /Ücretsiz Dene/i }).first();
  69 |     await expect(cta).toBeVisible();
  70 | 
  71 |     const box = await cta.boundingBox();
  72 |     expect(box).not.toBeNull();
  73 |     if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  74 |   });
  75 | 
  76 |   test("mobile: sticky CTA appears after scroll", async ({ page }) => {
  77 |     test.skip(true, "needs mobile viewport, skipped in CI");
  78 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  79 |     await page.waitForTimeout(500);
  80 |     // CRO sticky mobile bar should appear
  81 |   });
  82 | });
  83 | 
```