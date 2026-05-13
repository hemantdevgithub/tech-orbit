# Sprint 1 — Identity, Authentication & Onboarding

You are continuing work on **Techorbit**. Sprint 0 is complete — the monorepo, design system, and service scaffolds are in place on branch `sprint/0-bootstrap`, merged to `main`. Start this sprint from `main` on a new branch `sprint/1-identity`.

This sprint is **load-bearing**. Every future sprint depends on auth working correctly. We will not move to Sprint 2 until this sprint's Definition of Done is fully green.

---

## Context you MUST re-read before planning

1. `CLAUDE.md` (repo root) — coding conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.2 (identity schema) — your Prisma schema
   - Section 6 (domain events) — the events `user.registered.v1` and `user.role_verified.v1` you must emit
   - Section 7.1 (identity-svc API) — your endpoints
   - Section 9 (security) — non-negotiable
3. `DESIGN_REFERENCE.md` — for the onboarding UI
4. `PRD.md` Section 5.1 — onboarding and role-specific verification requirements

---

## Sprint 1 scope

Build the full authentication and onboarding experience end-to-end. Three layers:

**Backend (identity-svc):** real JWT auth with signup, login, refresh, 2FA, password reset, OAuth, role management.

**Frontend (apps/web):** the complete onboarding flow — landing → signup → role selection → role-specific verification → dashboard shell (no real dashboard content yet, just an empty-state shell).

**Cross-cutting:** event emission for other services to react to, audit logging for every security-sensitive action, proper session management.

Do NOT build Candidate/MSME/Customer/Interviewer profile forms — that's Sprint 2. This sprint ends at "user is authenticated, has a role, and can see the dashboard shell."

---

## Hard rules specific to this sprint

1. **Passwords: Argon2id only.** No bcrypt, no scrypt. Minimum 12 chars. zxcvbn score ≥ 3 required server-side (not just client-side).
2. **JWT: RS256 with asymmetric keys.** Generate keys via `openssl`; store private key in `.env` locally and in AWS Secrets Manager in prod. Access token = 15 min. Refresh token = 14 days, opaque (not JWT), stored hashed in DB, rotated on every use.
3. **Refresh token rotation is MANDATORY.** Using an already-used refresh token = immediate revocation of all sessions for that user. This is our detection mechanism for stolen tokens.
4. **Sessions stored server-side.** Refresh token → hash → lookup in `identity.Session`. No "stateless refresh" shortcuts.
5. **Rate limits** on every auth endpoint at the service level (not just gateway): 5 attempts per 15 min per IP on `/login` and `/password/reset/request`; 10 per hour on `/register`.
6. **Timing-safe comparisons** for all secret lookups (password hashes, refresh tokens, 2FA codes, password-reset tokens).
7. **Email enumeration prevention:** `/register` returns the same response whether the email exists or not; `/password/reset/request` always returns 200. Leak nothing.
8. **2FA required paths:** login success where user has 2FA enabled returns a partial auth state (`require2FA: true`) and a short-lived 2FA challenge token. The real access token is issued only after 2FA verification.
9. **Every auth mutation emits an audit event** to `audit-svc` via the event bus (even though audit-svc is scaffolded but not yet implementing storage — emit anyway; audit-svc's Sprint 9 consumer will backfill).
10. **Cookies:** use httpOnly, Secure (in prod), SameSite=Lax cookies for the web app. The refresh token lives in a cookie; the access token is returned in the JSON body and stored in memory by the SPA (not localStorage).

---

## Task breakdown

Do these in order. Plan first, get my "proceed," then execute task-by-task with lint/typecheck/test green before moving on.

### Task 1 — Shared types for auth

In `packages/types/`:
- Export Zod schemas: `EmailSchema`, `PasswordSchema` (with zxcvbn integration note), `RegisterRequestSchema`, `LoginRequestSchema`, `AuthSuccessResponseSchema`, `RefreshRequestSchema`, `PasswordResetRequestSchema`, `PasswordResetConfirmSchema`, `TwoFASetupResponseSchema`, `TwoFAVerifyRequestSchema`
- Export TS types via `z.infer`
- Export auth event schemas: `UserRegisteredEventSchema`, `UserRoleVerifiedEventSchema`, `UserLoggedInEventSchema`, `PasswordChangedEventSchema`, `SessionRevokedEventSchema`

### Task 2 — Prisma schema for identity-svc

Implement `services/identity-svc/prisma/schema.prisma` exactly matching ENGINEERING_SPEC Section 5.2:
- `User`, `UserRole`, `Session`, `TwoFAChallenge`, `PasswordResetRequest`
- All enums: `UserStatus`, `UserRoleStatus`, `UserRoleType`, `TwoFAKind`
- Schema name: `identity`
- All indexes declared
- `@map` where needed to get snake_case table/column names

Create initial migration. Run it against local Postgres. Verify with `prisma studio` or `\d identity.*` in psql that everything is there.

### Task 3 — Repository layer

In `services/identity-svc/src/repositories/`:
- `user.repository.ts` — `findById`, `findByEmail`, `findByGoogleSub`, `findByLinkedinSub`, `create`, `updatePassword`, `updateStatus`, `enableTwoFA`, `disableTwoFA`
- `session.repository.ts` — `create`, `findByRefreshTokenHash`, `rotate` (atomic: old revoked + new created in one transaction), `revokeById`, `revokeAllForUser`, `findActiveForUser`
- `role.repository.ts` — `findForUser`, `addRole`, `updateRoleStatus`, `listPendingVerifications`
- `twofa-challenge.repository.ts` — `create`, `consumeByCode` (atomic: use + mark-used)
- `password-reset.repository.ts` — `create`, `consumeByToken`

Every repository method takes an `AuthContext | SystemContext` and enforces access at this layer. Use a helper from `@techorbit/auth-middleware` to type this.

### Task 4 — Service layer (business logic)

In `services/identity-svc/src/services/`:
- `auth.service.ts` — the core: `register`, `login`, `logout`, `refreshSession`, `validateAccessToken`
- `password.service.ts` — `hashPassword` (Argon2id, correct params: memory=64MB, iterations=3, parallelism=4), `verifyPassword` (timing-safe), `validatePasswordStrength` (zxcvbn + min length), `requestReset`, `confirmReset`
- `token.service.ts` — `issueAccessToken(userId, roles, sessionId)`, `issueRefreshToken()`, `verifyAccessToken`, `hashRefreshToken` (SHA-256; refresh tokens are random, not JWT)
- `twofa.service.ts` — `setupTotp` (generates secret, returns QR data URL + backup codes), `verifyTotp`, `sendSmsCode`, `verifySmsCode`
- `oauth.service.ts` — `handleGoogleCallback`, `handleLinkedinCallback` (returns either an existing user or a new-user intent with OAuth claims attached to a signup session)
- `role.service.ts` — `addRoleForUser` (handles the role-specific verification state: some roles are AUTO_ACTIVE like Customer and Candidate; CRM/SRM/MSME/Interviewer start as PENDING_VERIFICATION)

**Critical invariants to encode:**
- Login with 2FA-enabled account does NOT return an access token. It returns a short-lived 2FA challenge token (JWT, 5-min expiry, single-purpose claim `purpose: "2fa_challenge"`) that `/2fa/verify` exchanges for the real access token.
- Refresh token rotation: if a refresh token presented is already revoked (i.e. used once and not the current one for the session), revoke ALL sessions for that user and emit a `session.revoked.v1` audit event with reason `REPLAY_DETECTED`.
- Password reset tokens are single-use; consumption is atomic.

### Task 5 — Route handlers

In `services/identity-svc/src/routes/`:

Implement every endpoint from ENGINEERING_SPEC Section 7.1:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` — reads refresh token from `refresh_token` cookie; returns new access token in body, new refresh token in cookie (rotated)
- `POST /api/v1/auth/logout` — revokes current session
- `POST /api/v1/auth/2fa/setup` (authed)
- `POST /api/v1/auth/2fa/verify` — two modes: during login (with challenge token) and during setup (with access token)
- `POST /api/v1/auth/password/reset/request` — always 200
- `POST /api/v1/auth/password/reset/confirm`
- `GET /api/v1/me` (authed) — returns user + roles + session info
- `POST /api/v1/me/roles` (authed) — add a role to current user
- `GET /api/v1/auth/oauth/google/start`
- `GET /api/v1/auth/oauth/google/callback`
- `GET /api/v1/auth/oauth/linkedin/start`
- `GET /api/v1/auth/oauth/linkedin/callback`

Every route:
- Validates input with Zod at the schema level
- Applies per-endpoint rate limits (use `@fastify/rate-limit`)
- Emits audit events via `@techorbit/event-bus` on every mutation
- Returns `{ error: { code, message, details? } }` envelope on failure

### Task 6 — Event emission

Identity-svc emits these events (wire via `@techorbit/event-bus`):
- `user.registered.v1` — on successful `/register`
- `user.logged_in.v1` — on successful auth (post-2FA if applicable)
- `user.role_added.v1` — when `/me/roles` is called
- `user.password_changed.v1`
- `session.revoked.v1` — on logout, replay detection, or admin suspension
- `user.2fa_enabled.v1`, `user.2fa_disabled.v1`

Use the outbox pattern: write to `identity.OutgoingEvent` table in the same transaction as the state change; a separate worker job (BullMQ) publishes to RabbitMQ. **Add the outbox table to the Prisma schema; it was not in the original spec** — this is a legitimate addition, document it.

### Task 7 — Frontend: auth infrastructure

In `apps/web/`:
- `lib/auth/auth-client.ts` — SPA auth state (Zustand): `accessToken` in memory, `user` object, `isAuthenticated` derived, `hydrate()` from `/api/v1/me` on mount
- `lib/auth/api-client.ts` — fetch wrapper that: attaches `Authorization: Bearer <accessToken>`, catches 401, tries refresh once (via cookie-backed refresh endpoint), retries original request, on refresh failure redirects to `/login`
- `lib/auth/guards.tsx` — `<AuthGuard>` HOC for protected pages; `<RoleGuard roles={[...]}>` for role-gated routes
- `middleware.ts` — Next.js middleware that redirects unauthenticated users away from `/dashboard/*` (server-side) based on presence of refresh cookie

### Task 8 — Frontend: onboarding UI

Build these pages using `@techorbit/ui` components from Sprint 0. **Every page must match DESIGN_REFERENCE.md aesthetic exactly** — forest green, cream background, rounded cards, generous whitespace.

- `/` — marketing landing page (simple: hero + "Sign up" + "Log in" buttons). Can be placeholder for now but styled properly.
- `/signup` — email + password + password confirmation; show zxcvbn strength meter; Google and LinkedIn OAuth buttons above the form
- `/signup/verify-email` — "Check your email" state with resend link
- `/login` — email + password; Google and LinkedIn OAuth; forgot password link
- `/login/2fa` — 6-digit code input; auto-advance between digits; submit on 6th digit
- `/password/reset` — request reset form
- `/password/reset/confirm?token=...` — new password form
- `/onboarding/role` — role selection grid (6 role cards with icon + title + 2-sentence description; use `Card` component with `hover:shadow-cardHover` — tap-to-select)
- `/onboarding/verification/:role` — role-specific verification pages. For this sprint, build ONLY the intake step (KYC launch, staff review notice, LinkedIn connect button) — not the full profile form. Profile forms come in Sprint 2.
  - Customer: EIN + company name form → "Pending verification" state
  - Candidate: "Start KYC" button → launches Persona (mock for now — just a button that fakes success and sets the state)
  - CRM/SRM/Interviewer: "Connect LinkedIn" button → OAuth flow → "Pending staff review" state
  - MSME: upload W-9/W-8BEN-E → "Pending staff review" state
- `/dashboard` — authed shell only. `NavBar` + `PageHeader` with "Welcome back, {firstName}" + one `Card` that says "Your dashboard is being set up. Roles: {role list}" + "Onboarding Progress" `ProgressCard` showing the user's verification steps. No real data yet.

### Task 9 — Integration tests

For identity-svc, use Vitest + Supertest + Testcontainers (real Postgres):

Required test coverage:
- Registration: happy path + duplicate email + weak password + malformed email
- Login: happy path + wrong password + non-existent user (same response) + account suspended + 2FA-enabled flow
- Refresh: happy path + rotated correctly + replay detection revokes all sessions
- Logout: revokes session correctly
- 2FA: setup → verify → reuse code (must fail) → wrong code
- Password reset: request + confirm flow, expired token, already-used token
- Rate limits: hit them and verify 429 response
- Role addition: each role type's initial status correctly set
- OAuth: mocked provider response leading to new user vs existing user linking

For apps/web, Playwright E2E tests:
- Full signup → email verification → role selection → (for a Candidate) dashboard access
- Login → 2FA → dashboard
- Password reset happy path
- Protected page redirects unauthenticated users
- Refresh flow works invisibly when access token expires mid-session

### Task 10 — Documentation

Update:
- `services/identity-svc/README.md` — endpoint list, env vars, how to run locally, how to generate JWT keys, how to seed a test user
- `services/identity-svc/openapi.yaml` — regenerated from Zod schemas
- Root `README.md` — add note about OAuth provider env vars needed for local dev
- `SPRINT_1_SUMMARY.md` at repo root

---

## Environment variables for this sprint

Add to root `.env.example` (and document in README):

```
# JWT
JWT_PRIVATE_KEY=  # RS256 private key, PEM
JWT_PUBLIC_KEY=   # RS256 public key, PEM

# Session cookies
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false   # true in prod

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/oauth/google/callback
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/v1/auth/oauth/linkedin/callback

# Email (use Mailpit locally — already up from compose)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=no-reply@techorbit.dev

# 2FA — SMS (Twilio sandbox for now; mock if no creds)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

Provide a `scripts/generate-jwt-keys.sh` that generates the RS256 keypair and writes to `.env`.

---

## Definition of Done

**Functional:**
- [ ] A user can sign up with email + password via the UI
- [ ] A user can sign up via Google OAuth
- [ ] A user can sign up via LinkedIn OAuth
- [ ] A user can log in and reach the dashboard shell
- [ ] A user can log out; logout revokes the session server-side
- [ ] A user can enable 2FA (TOTP) and then log in successfully through the 2FA challenge
- [ ] A user can request and confirm a password reset
- [ ] Refresh token rotation works; replaying an old refresh token revokes all sessions
- [ ] A user can select a role after signup and reach the appropriate verification page
- [ ] Protected pages redirect unauthenticated users
- [ ] The dashboard shell shows the user's current role(s) and onboarding progress

**Security:**
- [ ] Passwords hashed with Argon2id at correct params
- [ ] No password or token ever appears in logs
- [ ] Rate limits verified by test
- [ ] Timing-safe comparisons used for all secret lookups
- [ ] Access token in memory only; refresh in httpOnly cookie
- [ ] 2FA enforcement works — 2FA-enabled login cannot be bypassed
- [ ] Replay detection verified by test

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (unit + integration)
- [ ] Playwright E2E suite passes for identified flows
- [ ] OpenAPI spec regenerated and committed
- [ ] All commits use conventional-commit format
- [ ] No `@ts-ignore`, no `@ts-expect-error` without justification comment, no disabled tests

**Audit trail:**
- [ ] Every auth mutation emits an event (verifiable by tailing RabbitMQ in dev)
- [ ] Outbox pattern implemented (not direct publish)

**Visual:**
- [ ] All pages render with correct forest green + cream aesthetic
- [ ] All pages are responsive (mobile 375px, tablet 768px, desktop 1440px)
- [ ] Accessibility: every form field has a label, focus states visible, keyboard navigation works end-to-end
- [ ] Loading states on every submit button
- [ ] Error states clear and specific (but never leak security info)

---

## Deliverable

1. Working code on branch `sprint/1-identity`
2. `SPRINT_1_SUMMARY.md` with:
   - What was built
   - What was deferred (e.g., OAuth LinkedIn role-verification-depth, full Candidate profile)
   - Dependencies created for Sprint 2 (the profile-svc will consume `user.registered.v1` to create shell profiles)
   - Any security decisions worth flagging for review
3. PR to main with clear description + screenshots of the onboarding flow

---

## Before you start

Produce a **written execution plan** covering:

1. Your ordering of Tasks 1–10 and why (flag any dependency changes)
2. Any ambiguities in the spec you want me to clarify (especially around: OAuth linking to existing accounts, 2FA backup codes policy, the exact UX of the "role verification pending" state)
3. Security decisions you want me to confirm:
   - Argon2id parameters (memory / iterations / parallelism)
   - JWT issuer / audience claims for multi-service validation
   - Refresh token length and encoding
   - 2FA backup codes policy (generate N at setup? show once?)
4. Your test strategy — which flows get integration tests vs unit tests vs E2E
5. Estimated commit count (aim for 40–80; more = more reviewable)

**Do not write code until I reply "proceed."**
