import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

// Signup happy path — /register requires picking a role card before submit.
// Unique email prevents cross-run collision on identity_user.email.
test("signs up a new user end-to-end", async ({ page }) => {
  const email = uniqueEmail("signup");

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  await page.getByRole("button", { name: /^Customer/i }).click();

  await page.getByLabel(/first name/i).fill("Eve");
  await page.getByLabel(/last name/i).fill("Example");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).not.toHaveURL(/\/register$/, { timeout: 15_000 });
});

test("surfaces validation errors for weak + mismatched passwords", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: /^Customer/i }).click();

  await page.getByLabel(/first name/i).fill("Val");
  await page.getByLabel(/last name/i).fill("Test");
  await page.getByLabel(/email address/i).fill("weak@techorbit.test");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel(/confirm password/i).fill("different");

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/at least 12 characters/i)).toBeVisible();
});

test("blocks submit when no role is selected", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/first name/i).fill("Eve");
  await page.getByLabel(/last name/i).fill("Example");
  await page.getByLabel(/email address/i).fill(uniqueEmail("norole"));
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByText(/please select a role/i)).toBeVisible();
});
