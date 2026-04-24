// Shared helpers for the Sprint 10 E2E suite.
//
// Tests drive the real HTTP stack (identity-svc + profile-svc + ...) behind
// the Next.js web app on localhost:3000. Each run seeds fresh users with
// timestamp-suffixed emails to avoid unique-constraint collisions.

import { expect, type Page, type BrowserContext } from "@playwright/test";

export const IDENTITY_URL = process.env.IDENTITY_URL ?? "http://localhost:3002";
export const PROFILE_URL = process.env.PROFILE_URL ?? "http://localhost:3004";
export const REQUIREMENT_URL = process.env.REQUIREMENT_URL ?? "http://localhost:3005";
export const MATCHING_URL = process.env.MATCHING_URL ?? "http://localhost:3006";
export const PLACEMENT_URL = process.env.PLACEMENT_URL ?? "http://localhost:3008";

// Strong enough to pass zxcvbn — login + register both enforce min strength.
export const PASSWORD = "correct horse battery staple 42";

export type Role = "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME" | "INTERVIEWER";

export function uniqueEmail(tag = "e2e"): string {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1000)}@techorbit.test`;
}

// Register + immediately add a role via the identity API. Returns the
// access token so follow-up HTTP calls can authenticate as this user.
export async function registerApiUser(opts: {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
}): Promise<{ accessToken: string; userId: string }> {
  const res = await fetch(`${IDENTITY_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      password: PASSWORD,
      firstName: opts.firstName ?? "E2E",
      lastName: opts.lastName ?? "User",
    }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  const { accessToken } = (await res.json()) as { accessToken: string };
  const payload = JSON.parse(Buffer.from(accessToken.split(".")[1]!, "base64").toString());
  const userId: string = payload.sub;

  if (opts.role) {
    const roleRes = await fetch(`${IDENTITY_URL}/api/v1/me/roles`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ roleType: opts.role }),
    });
    if (!roleRes.ok) throw new Error(`add role failed: ${roleRes.status}`);
    // Re-login to pick up the role claim.
    const login = await fetch(`${IDENTITY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: opts.email, password: PASSWORD }),
    });
    if (!login.ok) throw new Error(`re-login failed: ${login.status}`);
    const { accessToken: fresh } = (await login.json()) as { accessToken: string };
    return { accessToken: fresh, userId };
  }
  return { accessToken, userId };
}

// Drive the browser through the UI register flow with a role pick.
export async function signupViaUI(page: Page, opts: { email: string; role: Role }): Promise<void> {
  await page.goto("/register");
  // Pick the role card. Cards render the role label (e.g. "Customer") — match
  // the heading, not the description which may also contain the word.
  await page.getByRole("button", { name: new RegExp(`^${roleLabel(opts.role)}`, "i") }).click();
  await page.getByLabel(/first name/i).fill("E2E");
  await page.getByLabel(/last name/i).fill(opts.role);
  await page.getByLabel(/email address/i).fill(opts.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  // After submit the app navigates away from /register.
  await expect(page).not.toHaveURL(/\/register$/, { timeout: 15_000 });
}

export async function loginViaUI(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
}

// Prime an authenticated browser context directly via the identity API. Faster
// than clicking through /login in tests that only care about an already-auth'd
// page state. Writes the access token to the same cookie the middleware reads.
export async function seedAuthedContext(
  ctx: BrowserContext,
  email: string,
): Promise<{ accessToken: string; userId: string }> {
  const result = await registerApiUser({ email });
  await ctx.addCookies([
    {
      name: "techorbit-access-token",
      value: result.accessToken,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
  return result;
}

function roleLabel(r: Role): string {
  switch (r) {
    case "CUSTOMER": return "Customer";
    case "CANDIDATE": return "Candidate";
    case "CRM": return "Client Relationship Manager";
    case "SRM": return "Senior Recruitment Manager";
    case "MSME": return "Vendor";
    case "INTERVIEWER": return "Interviewer";
  }
}
