import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL ?? "admin@techorbit.test";
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD ?? "TestAdminPass1234";

// Flow 9 — Admin console. Admin-svc integration tests cover the backend;
// here we verify the admin UI is reachable for an ADMIN user and non-admins
// are bounced.
test("non-admin is redirected away from /admin", async ({ page }) => {
  const email = uniqueEmail("non-admin");
  await registerApiUser({ email, role: "CANDIDATE" });
  await loginViaUI(page, email);

  await page.goto("/admin");
  // AdminGuard client-side redirects non-admins to /dashboard.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

test("admin reaches the admin console with all sections", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });

  for (const path of [
    "/admin",
    "/admin/role-applications",
    "/admin/users",
    "/admin/disputes",
    "/admin/audit-logs",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
  }
});
