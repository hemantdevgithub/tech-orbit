import { expect, test } from "@playwright/test";

/**
 * Signup happy path: fill the form, submit, land somewhere authenticated.
 * Uses a unique timestamp-suffixed email so re-runs don't collide.
 */
test("signs up a new user end-to-end", async ({ page }) => {
  const email = `e2e+${Date.now()}@techorbit.test`;

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();

  await page.getByLabel(/first name/i).fill("Eve");
  await page.getByLabel(/last name/i).fill("Example");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Z7!mvq$HeronLatch92");
  await page.getByLabel(/confirm password/i).fill("Z7!mvq$HeronLatch92");

  await page.getByRole("button", { name: /create account/i }).click();

  // After register, the app navigates away from /register on success.
  await expect(page).not.toHaveURL(/\/register$/, { timeout: 10_000 });
});

test("surfaces validation errors for weak + mismatched passwords", async ({ page }) => {
  await page.goto("/register");

  await page.getByLabel(/first name/i).fill("Val");
  await page.getByLabel(/last name/i).fill("Test");
  await page.getByLabel(/email address/i).fill("weak@techorbit.test");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel(/confirm password/i).fill("different");

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByText(/at least 12 characters/i)).toBeVisible();
});
