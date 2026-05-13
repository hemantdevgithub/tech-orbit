import { expect, test } from "@playwright/test";

const IDENTITY_URL = process.env.IDENTITY_URL ?? "http://localhost:3002";
const PASSWORD = "Z7!mvq$HeronLatch92";

async function seedUser(email: string): Promise<void> {
  const res = await fetch(`${IDENTITY_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      firstName: "Seed",
      lastName: "User",
    }),
  });
  if (!res.ok) {
    // 201 = created, or duplicate-email still returns 201 per enumeration policy.
    throw new Error(`seedUser failed: ${res.status}`);
  }
}

test("logs in with valid credentials", async ({ page }) => {
  const email = `e2e-login+${Date.now()}@techorbit.test`;
  await seedUser(email);

  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /log in|sign in/i }).click();

  // Successful login navigates away from /login.
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });
});

test("shows an error for wrong password", async ({ page }) => {
  const email = `e2e-bad+${Date.now()}@techorbit.test`;
  await seedUser(email);

  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill("WrongPassword1234!");
  await page.getByRole("button", { name: /log in|sign in/i }).click();

  // Should stay on /login and show an error.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("alert")).toBeVisible();
});
