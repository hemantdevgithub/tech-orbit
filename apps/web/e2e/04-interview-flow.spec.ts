import { expect, test } from "@playwright/test";
import { loginViaUI, registerApiUser, uniqueEmail } from "./helpers";

// Flow 4 — Interview flow. Deep scheduling + scorecard is covered by
// interview-svc integration tests; here we verify the interviewer-facing
// pages are reachable and render the shell.
test("interviewer reaches the interviews dashboard", async ({ page }) => {
  const email = uniqueEmail("interviewer");
  await registerApiUser({ email, role: "INTERVIEWER" });
  await loginViaUI(page, email);

  await page.goto("/dashboard/interviewer");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("interviewers directory loads", async ({ page }) => {
  const email = uniqueEmail("iv-browse");
  await registerApiUser({ email, role: "CUSTOMER" });
  await loginViaUI(page, email);
  await page.goto("/interviewers");
  await expect(page).toHaveURL(/\/interviewers/);
});
