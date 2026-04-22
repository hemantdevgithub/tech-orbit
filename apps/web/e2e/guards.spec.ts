import { expect, test } from "@playwright/test";

test("redirects unauthenticated users away from /dashboard", async ({ page, context }) => {
  // Ensure no auth cookies are present.
  await context.clearCookies();

  await page.goto("/dashboard");

  // Middleware (or client guard) should bounce to /login.
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
