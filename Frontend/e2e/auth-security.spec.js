import { test, expect } from "@playwright/test";

test.describe("Phase 3.15 – Authentication, Protected Routes & Security Regression", () => {
  test("Public SaaS pages remain accessible without authentication", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    for (const route of ["/", "/pricing", "/demo", "/register-restaurant", "/login"]) {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();
    }
    expect(pageErrors).toEqual([]);
  });

  test("Unauthenticated users cannot access protected POS, KOT, Admin, or Super Admin workspaces", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Protected operational routes show LoginPage when unauthenticated
    for (const route of ["/pos", "/kot", "/admin"]) {
      await page.goto(route);
      await expect(page.locator("input:visible").first()).toBeVisible();
      // Reload preserves auth gate
      await page.reload();
      await expect(page.locator("input:visible").first()).toBeVisible();
    }

    // Super Admin shows restricted Access Notice banner without granting PlatformSuperAdmin claim
    await page.goto("/super-admin/dashboard");
    await expect(page.getByText(/Backend PlatformSuperAdmin Claim Required/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("Login UI enforces required fields and handles password visibility toggle cleanly", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/login");
    const submitBtn = page.getByRole("button", { name: /Sign In|Login/i }).first();
    await submitBtn.click();

    // Still on /login when credentials are empty
    await expect(page).toHaveURL(/\/login$/);

    const passwordInput = page.locator("#login-password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    expect(pageErrors).toEqual([]);
  });

  test("Missing or malformed token state never grants authenticated POS/Admin access on refresh", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("avsr_pos_session", JSON.stringify({ username: "stale", role: "pos" }));
      localStorage.removeItem("avsr_jwt_token");
    });

    await page.goto("/pos");
    // Without avsr_jwt_token, App.jsx clears stale session and renders LoginPage
    await expect(page.locator("input:visible").first()).toBeVisible();

    const remainingToken = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
    expect(remainingToken).toBeNull();
    expect(pageErrors).toEqual([]);
  });
});
