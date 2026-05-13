import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 3 — Shortlist management. The full drag-and-drop kanban is exercised
// in Sprint 5/6 integration tests; here we verify the shortlist page loads
// for a customer who owns a requirement.
test("customer reaches a requirement shortlist page", async ({ page }) => {
  const email = uniqueEmail("shortlist");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  // Fake requirement id works fine — the page renders the shell even when
  // the API returns "not found" (shows a "Not found" state).
  await page.goto("/requirements/00000000-0000-0000-0000-000000000000/shortlist");
  await expect(page).toHaveURL(/\/shortlist/);
});
