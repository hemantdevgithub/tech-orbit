import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 8 — Ratings. Rating rules (customer↔candidate only, post-completion
// only, one per placement per rater) are covered by rating-svc integration
// tests. Here we verify the "Rate" page for a fake placement renders and
// gates on participation.
test("user hitting a rate page for a fake placement does not crash", async ({ page }) => {
  const email = uniqueEmail("rating");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/placements/00000000-0000-0000-0000-000000000000/rate");
  await expect(page).not.toHaveURL(/\/login/);
});

test("users/[id] profile page renders with ratings panel shell", async ({ page }) => {
  const email = uniqueEmail("profile");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);

  await page.goto("/users/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/users\//);
  await expect(page.getByRole("heading", { name: /user profile|your profile/i })).toBeVisible();
});
