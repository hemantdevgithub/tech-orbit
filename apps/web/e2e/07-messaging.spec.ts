import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 7 — Messaging. Thread lifecycle + participant authz is covered by
// messaging-svc integration tests (8 tests). Here we verify the split-view
// UI loads and shows an empty state when there are no threads.
test("user reaches messages page with empty thread list", async ({ page }) => {
  const email = uniqueEmail("messaging");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/messages");
  await expect(page).toHaveURL(/\/messages/);
  // Left panel should say "No messages yet" for a brand-new user.
  await expect(page.getByText(/no messages yet|select a conversation/i).first()).toBeVisible({ timeout: 10_000 });
});
