# Playwright E2E Verification — Full Stack

Purpose: verify the onboarding flow actually works end-to-end against your real local stack, not just in isolation. Do this **after Sprint 1.5 is merged** (or in parallel if you're confident the cleanup won't break flows — your call).

Allow ~30 minutes.

---

## Step 1 — Bring up the full stack

Open 3 terminal windows.

**Terminal 1 — Infrastructure:**
```bash
cd techorbit
docker-compose up -d
# Verify everything is healthy:
docker-compose ps
# Should see: postgres, redis, rabbitmq, mailpit all Up
```

**Terminal 2 — Services + web app:**
```bash
pnpm dev
# Wait until ALL services print "listening on port XXXX"
# Web app should be on :3000, identity on :3002 (or whatever your final port is)
```

**Terminal 3 — For running tests:**
(leave empty for now)

---

## Step 2 — Smoke test manually first (5 min)

Before running Playwright, do a 5-minute manual click-through. If something is broken at the human level, Playwright will just give you a cryptic timeout.

Open `http://localhost:3000` and verify:

1. **Landing page loads with Calibra styling**
   - Forest green logo tile
   - Cream background (#FAF4EA, NOT pure white)
   - Rounded buttons
   - Generous whitespace
   - If it looks like a generic Next.js default page, STOP — the design tokens aren't wired. Fix before Playwright.

2. **Register flow (happy path)**
   - Click "Sign up"
   - Enter: `test1@example.com` / `TestPassword123!`
   - Submit
   - Should redirect to email verification OR role selection (depending on whether email verification was built as mandatory)

3. **Check Mailpit for the verification email**
   - Open `http://localhost:8025`
   - Should see the welcome/verification email
   - If no email appears: SMTP config is wrong or event/notification wiring is broken

4. **Check RabbitMQ for events**
   - Open `http://localhost:15672` (guest/guest)
   - Queues tab → look for events in the identity exchange
   - Should see `user.registered.v1` emitted
   - If no events: outbox worker isn't running or isn't connected

5. **Check Postgres for the user**
   ```bash
   docker-compose exec postgres psql -U postgres -d techorbit
   # Then:
   SELECT id, email, status, created_at FROM identity."User";
   SELECT * FROM identity."OutgoingEvent" ORDER BY created_at DESC LIMIT 5;
   ```
   Should see the registered user and the corresponding outbox event (marked published if worker is running).

6. **Login flow**
   - Log out (if there's a logout button in the shell)
   - Log in with `test1@example.com` / `TestPassword123!`
   - Should redirect to `/dashboard`
   - Dashboard shows: "Welcome back" + role info + progress card

7. **Refresh token auto-refresh (optional but good to verify)**
   - Open DevTools → Application → Cookies — confirm `refresh_token` cookie exists, is httpOnly and Secure-in-prod
   - Leave the tab idle for 16+ minutes (access token TTL is 15 min)
   - Click around the dashboard
   - Should work seamlessly — the api-client catches the 401, hits `/refresh`, retries
   - Check Network tab: you should see the `/refresh` call happen invisibly

8. **Protected route redirect**
   - Open an incognito window
   - Navigate directly to `http://localhost:3000/dashboard`
   - Should redirect to `/login`

If any of these manual steps fail, **stop and fix them before running Playwright.** Playwright is an automated version of this same flow; it can't fix something that's broken at the manual level.

---

## Step 3 — Install Playwright browsers (first time only)

```bash
pnpm --filter @techorbit/web e2e:install
```

---

## Step 4 — Run the E2E suite

In **Terminal 3** (with full stack still running in Terminal 2):

```bash
pnpm --filter @techorbit/web e2e
```

Or, to run in headed mode so you can watch what's happening:
```bash
pnpm --filter @techorbit/web e2e --headed
```

---

## Step 5 — Interpret the results

### ✅ All green

All 3 specs (`signup.spec.ts`, `login.spec.ts`, `guards.spec.ts`) pass. You're clear to proceed to Sprint 2 (after 1.5 is done).

### 🟡 Some tests fail with "element not found" or "timeout"

This is usually one of:
- Test selectors don't match the actual rendered HTML (common when Claude builds tests and UI separately — they sometimes drift)
- Test data (email, password) doesn't match what's expected by the UI
- Async state (redirects, toasts, loading spinners) taking longer than the default Playwright wait

**Prompt Claude Code with:**
```
The Playwright E2E suite has failures. Run `pnpm --filter @techorbit/web e2e --headed`
and watch what happens. For each failing test, diagnose the root cause
(selector mismatch vs flaky timing vs real bug) and fix it. Do not increase
timeouts blindly — find and fix the real issue. If a test is genuinely
testing something that doesn't exist, flag it for discussion, don't delete it.
```

### 🔴 Tests fail in a way that suggests a real bug

Examples:
- Registration submits but user is never created in DB
- Login succeeds but dashboard shows wrong data
- Refresh rotation actually revokes current session (not just replay)

**Prompt Claude Code with:**
```
Playwright found a real bug in the [flow name]. Here's the failure output:
[paste]

Please: (1) reproduce the bug manually (via curl or browser),
(2) identify the root cause, (3) write a failing unit/integration test
that captures it, (4) fix the bug, (5) confirm the test now passes,
(6) confirm the Playwright test now passes. Do not fix the Playwright
test first — fix the underlying bug.
```

---

## Step 6 — Report back

When you're done, share with me:

1. Which of the 8 manual smoke checks passed
2. Playwright result summary (X passed / Y failed)
3. Any bugs found and fixed
4. Any deferred fixes (with justification)

Then we move to Sprint 2.

---

## Quick reference — things that often break in E2E

| Symptom                           | Likely cause                                                        |
| --------------------------------- | ------------------------------------------------------------------- |
| Registration succeeds but no email | SMTP not configured; check `.env` SMTP_HOST=localhost SMTP_PORT=1025 |
| No events in RabbitMQ              | Outbox worker not started, or RABBITMQ_URL wrong                     |
| Login returns 401 right away       | JWT keys mismatched between service and gateway/verifier             |
| Refresh cookie missing             | Cookie domain or path misconfigured                                  |
| Dashboard 404s                     | Next.js middleware mis-routing; check `middleware.ts` matcher        |
| Tests pass locally, fail in CI     | Docker-unavailable guard firing where it shouldn't; check CI envs    |
| Playwright hangs on `beforeAll`    | Webserver not up yet — check `playwright.config.ts` webServer block  |
