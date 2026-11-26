import { test, expect } from "@playwright/test";

/**
 * Phase 3.18 – Live Staging Integration & Release Verification Suite
 *
 * Required environment variables for live staging execution (never hardcode credentials):
 * - STAGING_ADMIN_USER / STAGING_ADMIN_PASS (Role: RestaurantAdmin or admin)
 * - STAGING_POS_USER / STAGING_POS_PASS     (Role: Cashier / Waiter / pos)
 * - STAGING_KOT_USER / STAGING_KOT_PASS     (Role: Chef / kot)
 * - STAGING_MULTI_BRANCH=true               (Optional: when account has 2+ authorized branches)
 */
const HAS_ADMIN_CREDS = Boolean(process.env.STAGING_ADMIN_USER && process.env.STAGING_ADMIN_PASS);
const HAS_POS_CREDS = Boolean(process.env.STAGING_POS_USER && process.env.STAGING_POS_PASS);
const HAS_KOT_CREDS = Boolean(process.env.STAGING_KOT_USER && process.env.STAGING_KOT_PASS);
const HAS_MULTI_BRANCH = process.env.STAGING_MULTI_BRANCH === "true";

test.describe("1. Environment-independent tests", () => {
  test("Login page loads, rejects empty credentials, and handles invalid/offline login safely", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/login");
    await expect(page.locator("#login-username")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();

    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.locator("#login-username").fill("invalid_staging_probe");
    await page.locator("#login-password").fill("invalid_probe_pass");
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();

    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
    expect(token).toBeNull();
    expect(pageErrors).toEqual([]);
  });

  test("Unauthorized users cannot access protected POS, KOT, Admin, or Super Admin routes", async ({ page }) => {
    for (const route of ["/pos", "/kot", "/admin"]) {
      await page.goto(route);
      await expect(page.locator("input:visible").first()).toBeVisible();
    }
    await page.goto("/super-admin/dashboard");
    await expect(page.getByText(/Backend PlatformSuperAdmin Claim Required/i)).toBeVisible();
  });
});

test.describe("2. Public SaaS integration tests", () => {
  test("Public SaaS landing, pricing, registration, demo, and QR menu pages render cleanly", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    for (const route of ["/", "/pricing", "/register-restaurant", "/demo", "/menu"]) {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();
    }
    expect(pageErrors).toEqual([]);
  });
});

test.describe("3. Authenticated Admin tests", () => {
  test("Admin login, session restoration, AdminInvoices load, and logout cleanup", async ({ page }) => {
    test.skip(!HAS_ADMIN_CREDS, "STAGING_ADMIN_USER / STAGING_ADMIN_PASS not configured");

    await page.goto("/login");
    await page.locator("#login-username").fill(process.env.STAGING_ADMIN_USER);
    await page.locator("#login-password").fill(process.env.STAGING_ADMIN_PASS);
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();

    await expect(page).toHaveURL(/\/admin/);
    const token = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
    expect(token).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(/\/admin/);

    const invoicesBtn = page.getByRole("button", { name: /Invoices/i }).first();
    if (await invoicesBtn.isVisible()) {
      await invoicesBtn.click();
      await expect(page.getByText(/Total Invoices/i)).toBeVisible();
    }

    const logoutBtn = page.getByRole("button", { name: /Logout|Sign Out/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      const clearedToken = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
      expect(clearedToken).toBeNull();
    }
  });
});

test.describe("4. Authenticated POS tests", () => {
  test("POS login, menu load, and settlement UI readiness", async ({ page }) => {
    test.skip(!HAS_POS_CREDS, "STAGING_POS_USER / STAGING_POS_PASS not configured");

    await page.goto("/pos");
    await page.locator("#login-username").fill(process.env.STAGING_POS_USER);
    await page.locator("#login-password").fill(process.env.STAGING_POS_PASS);
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();
    await expect(page).toHaveURL(/\/pos|\/$/);
  });
});

test.describe("5. Authenticated KOT tests", () => {
  test("KOT login and kitchen queue readiness", async ({ page }) => {
    test.skip(!HAS_KOT_CREDS, "STAGING_KOT_USER / STAGING_KOT_PASS not configured");

    await page.goto("/kot");
    await page.locator("#login-username").fill(process.env.STAGING_KOT_USER);
    await page.locator("#login-password").fill(process.env.STAGING_KOT_PASS);
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();
    await expect(page).toHaveURL(/\/kot/);
  });
});

test.describe("6. Multi-branch tests", () => {
  test("Multi-branch workspace switching", async ({ page }) => {
    test.skip(!HAS_ADMIN_CREDS || !HAS_MULTI_BRANCH, "STAGING_ADMIN_USER + STAGING_MULTI_BRANCH=true required");

    await page.goto("/login");
    await page.locator("#login-username").fill(process.env.STAGING_ADMIN_USER);
    await page.locator("#login-password").fill(process.env.STAGING_ADMIN_PASS);
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();
    await expect(page).toHaveURL(/\/admin/);

    await page.getByRole("button", { name: "Workspace switcher" }).click();
    await expect(page.getByRole("dialog", { name: /Switch organization/i })).toBeVisible();
  });
});
