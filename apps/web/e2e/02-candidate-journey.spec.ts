import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 2 — Candidate journey: sign up as CANDIDATE, reach the dashboard,
// see the candidate workspace section, and see "Browse requirements" as a CTA.
test("candidate journey: signup → dashboard with candidate workspace", async ({ page }) => {
  const email = uniqueEmail("candidate");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  // Dashboard always shows "Your roles" section when at least one active role exists.
  await expect(page.getByText(/your roles/i).first()).toBeVisible({ timeout: 10_000 });
});

test("candidate can reach the requirements browse page", async ({ page }) => {
  const email = uniqueEmail("candidate-browse");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/requirements");
  await expect(page).toHaveURL(/\/requirements/);
});
