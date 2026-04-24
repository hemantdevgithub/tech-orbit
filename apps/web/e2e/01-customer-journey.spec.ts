import { expect, test } from "@playwright/test";
import { loginViaUI, PASSWORD, registerApiUser, uniqueEmail } from "./helpers";

// Flow 1 — Customer journey: sign up as CUSTOMER, land on dashboard, land
// on the requirements page, reach the "new requirement" form.
test("customer journey: signup → dashboard → requirements", async ({ page }) => {
  const email = uniqueEmail("customer");
  // Seed via API to skip the multi-step UI signup (covered in signup.spec.ts).
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  // Dashboard reachable and rendered.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /welcome|dashboard/i })).toBeVisible();

  // Requirements list + new-requirement page reachable.
  await page.goto("/requirements");
  await expect(page).toHaveURL(/\/requirements/);
  await page.goto("/requirements/new");
  await expect(page).toHaveURL(/\/requirements\/new/);
});

test("login page rejects bad credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill("nobody@techorbit.test");
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("alert")).toBeVisible();
});
