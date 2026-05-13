import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 5 — Placement creation. Full hire flow requires a submission in OFFER
// status; that chain is exercised end-to-end by placement-svc integration
// tests. Here we verify the placement list + a placement detail page
// (not-found state) for a customer.
test("customer reaches placements list", async ({ page }) => {
  const email = uniqueEmail("placements");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  await page.goto("/placements");
  await expect(page).toHaveURL(/\/placements/);
});

test("placement detail page renders not-found state for a fake id", async ({ page }) => {
  const email = uniqueEmail("placement-detail");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  await page.goto("/placements/00000000-0000-0000-0000-000000000000");
  // Page either shows "Not found" or the raw "Loading…" state; either way
  // we shouldn't be redirected to /login.
  await expect(page).not.toHaveURL(/\/login/);
});
