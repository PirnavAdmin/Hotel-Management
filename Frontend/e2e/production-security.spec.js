import { test, expect } from "@playwright/test";

test.describe("Phase 3.16 – Production Security Hardening & Legacy Fallback Removal", () => {
  test("Legacy offline Pirnav fallback credentials and mock tokens cannot grant access", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/login");
    await page.locator("#login-username").fill("pirnav");
    await page.locator("#login-password").fill("synthetic-invalid-pw");
    await page.getByRole("button", { name: /Sign In|Login/i }).first().click();

    // Must remain on /login and never store a mock token or admin session
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
    expect(token).toBeNull();

    // Injecting a legacy mock-jwt-token-pirnav-admin in localStorage must be rejected on reload
    await page.evaluate(() => {
      localStorage.setItem("avsr_admin_session", JSON.stringify({ username: "pirnav", role: "admin" }));
      localStorage.setItem("avsr_jwt_token", "mock-jwt-token-pirnav-admin");
    });

    await page.goto("/admin");
    await expect(page.locator("input:visible").first()).toBeVisible();
    const tokenAfter = await page.evaluate(() => localStorage.getItem("avsr_jwt_token"));
    expect(tokenAfter).toBeNull();

    expect(pageErrors).toEqual([]);
  });

  test("Invalid stored JSON in session keys does not crash the frontend", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("avsr_pos_session", "{corrupt_json");
      localStorage.setItem("avsr_admin_session", "{corrupt_json");
      localStorage.setItem("avsr_auth_session_v1", "{corrupt_json");
    });

    await page.goto("/pos");
    await expect(page.locator("input:visible").first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("Unrelated preferences persist while auth keys are absent and public SaaS remains usable", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("gourmet_pos_theme", "midnight-onyx");
    });

    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Plans That Grow With Your Dining Rooms/i })).toBeVisible();
    const savedTheme = await page.evaluate(() => localStorage.getItem("gourmet_pos_theme"));
    expect(savedTheme).toBe("midnight-onyx");

    expect(pageErrors).toEqual([]);
  });
});
