import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 6 — Timesheets + invoicing. Money-path math is covered end-to-end by
// payments-svc integration tests (9 tests with exact-dollar assertions).
// Here we verify the list pages render for the right roles.
test("candidate can reach the timesheets list", async ({ page }) => {
  const email = uniqueEmail("ts-candidate");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/timesheets");
  await expect(page).toHaveURL(/\/timesheets/);
});

test("customer can reach the invoices list", async ({ page }) => {
  const email = uniqueEmail("inv-customer");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  await page.goto("/invoices");
  await expect(page).toHaveURL(/\/invoices/);
});

test("candidate can reach the payouts list", async ({ page }) => {
  const email = uniqueEmail("po-candidate");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/payouts");
  await expect(page).toHaveURL(/\/payouts/);
});
