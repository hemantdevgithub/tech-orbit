# Session summary — 2026-04-25 UI polish pass

**Branch:** `claude/adoring-montalcini-dc0292` (worktree)
**Base:** `sprint/7-payments` at `64d2fc9`
**Tip:** 18 commits ahead
**State:** clean working tree · lint 31/31 · typecheck 31/31 · tests 30/30

This doc exists so a fresh Claude session can pick up without replaying
the entire conversation. Read this **plus** [`HANDOFF.md`](HANDOFF.md) to
get the whole picture — HANDOFF stays current, this file is the change
log for the 2026-04-25 pass.

---

## What changed this session

### New features

- **AppShell left sidebar** replacing the top NavBar across 17 layouts.
  Role-aware: shows a primary CTA, three quick-search inputs, and nav
  links that fit the viewer's role. Collapses to a drawer on mobile.
  → `apps/web/src/components/app-shell.tsx`
- **Role profile pages:** `/candidates/[id]`, `/customers/[id]`
  (narrow public subset), and enhanced `/users/[id]`.
- **CRM + SRM onboarding** welcome pages + wired into `register`'s
  `ONBOARDING_ROUTES`.
- **CRM + SRM dashboards** — earnings strip (shared `BrokerEarningsCards`)
  + attribution / submissions panels.
- **Grid ↔ list view toggle** on Requirements, Placements,
  Interviewers. Per-page preference persisted in `localStorage`.
  → `apps/web/src/components/view-toggle.tsx`
- **Breadcrumbs** on every list + detail page.
  → `apps/web/src/components/breadcrumbs.tsx`
- **Lucide-style SVG icon set** replacing emojis everywhere except seed
  strings and markdown.
  → `apps/web/src/components/icons.tsx`
- **Public profile endpoints** on profile-svc: `/customers/:id/public`,
  `/candidates/:id/public`, `/interviewers/:id/public`, plus a
  companyId-keyed variant `/customers/by-company/:id/public`. Narrow
  no-PII shapes, any authenticated viewer can read.
- **`useDisplayName` hook** resolves UUIDs to real names (candidate
  headline, customer legalName, interviewer displayName) with a
  module-level Promise cache. Falls back to `#abc12345` short-ids on
  403/404.
  → `apps/web/src/lib/display-names.ts`
- **Per-route rate limits on payments** — mark-paid (30/min) + 4
  timesheet mutations (60/min submit/update, 120/min approve/reject).
  Integration test mirrors identity's suite.
- **Replaced "Coming in Sprint 3" placeholders** in customer /
  candidate / MSME dashboards with live data from listRequirements /
  listSubmissions.

### Critical bug fixes

- **`api-client.ts` snapshot bug** — `getApiClient` /
  `makeServiceClient` were freezing a snapshot of the zustand store,
  so `getAccessToken` always returned `null`. Every authed request
  silently went anonymous, including `fetchMe` after login, which
  left the dashboard blank.
- **Zustand hydration race** — dashboard + 4 other layouts bounced
  to `/login` on hard-reload before localStorage finished rehydrating.
  New `useAuthGuard` hook waits for
  `useAuthStore.persist.onFinishHydration` before deciding.
- **Smoke-test port collisions** — six services
  (api-gateway, audit, messaging, notification, profile, rating) bound
  hardcoded dev ports. Now bind port 0 (OS-picked). `pnpm test` passes
  all 30 suites even with the dev stack running.
- **Placement titles showing candidate UUIDs** as H1s — now render
  engagement type + rate + duration.

---

## Commits (newest first)

```
6b2fa76 fix+polish: broader display names, breadcrumbs, smoke-test ports
89647ef feat(profile): customer public lookup by companyId
1f7b303 test(profile): cover public candidate endpoint + update HANDOFF
86048e4 feat(profile): public candidate + interviewer endpoints (no PII)
d04fd3d feat(web): useDisplayName hook for candidate/customer/interviewer labels
a69d366 feat(web): polish interview + money surfaces after full-flow walkthrough
72e9dad feat(web): finish emoji → SVG icon sweep
bdd667f feat(web): replace emoji icons with lucide-style SVGs
5d8b521 feat(web): breadcrumbs + pagination polish on list pages
3bcd343 feat(web): grid/list view toggle on browse surfaces
cb66d06 feat(web): polish cross-role flow — placement titles, req company label
785f153 feat(web): sidebar app shell with role-aware CTA, search, and nav
c194377 feat(web): replace Sprint 3 placeholders with live data
4ef7c60 fix(web): stop bouncing authed users to /login on hard reload
4d89c5a fix(web): api-client snapshot bug + defensive roles chain
93f0a08 feat(web): activity-based CRM and SRM dashboards
8290409 feat(web): role profile pages + CRM/SRM onboarding welcome
848384b feat(profile): public customer profile endpoint (no PII)
61be156 feat(payments): per-route rate limits on financial mutations
80bf499 docs: sprint 10 polish pass — bundle-analyzer script + handoff fixes
```

---

## Open items flagged but not yet tackled

These were raised in the session but deferred:

1. **Interview recording storage on candidate profile.** User wants:
   - The in-platform video interview to record automatically.
   - Recording saved and linked on the candidate's profile.
   - Customer can watch the recording later.
   - Candidate can feature preferred interviews + scores on their
     profile to stand out.
   - Scope: Daily.co mock currently — recording requires real provider
     or a mock storage layer. Ties into interview-svc,
     candidate-profile, and the candidate's public `/candidates/[id]`
     page ("featured interviews" section).
2. **Customer payment flow audit.** User hadn't seen the
   customer-pays-invoice path in detail. `/invoices/[id]` exists with a
   Stripe-link button for SENT status but the full "pay button →
   confirmation → receipt" flow hasn't been walked yet.
3. **Rating flow audit.** Ratings display on profiles but the
   submit-rating path (after placement end) hasn't been exercised.
4. **Interview detail polish.** Call page + scorecard form UX.

## Still open from before this session

- E2E Playwright specs 01-09 are `test.skip` stubs.
- Per-IP (not per-token) rate limits for fully anonymous register/login
  surfaces.
- Real Stripe/Gusto integration (payments-svc mocks today).
- Real SendGrid/Twilio integration (notification-svc mocks).
- Real video provider for interviews (Daily.co mock today — also
  blocks the recording-storage item above).
- Cloud deployment (single-host-ready; ECS/Fargate deferred).

---

## How to resume

1. `cd /Users/hemant/techorbit/.claude/worktrees/adoring-montalcini-dc0292`
2. Read `HANDOFF.md` for the up-to-date state (it was refreshed mid-pass
   in commit `1f7b303`).
3. Read **this file** for the session change log.
4. Bring up the dev stack — see the "How to run the app" section of
   `HANDOFF.md` (the macOS file-watcher gotcha still applies; set
   `ulimit -n 50000` and use polling mode if it's chatty).
5. Log in with any `*@demo.test` user. Password:
   `correct horse battery staple 42`. Admin is
   `admin@techorbit.test` / `TestAdminPass1234`.
6. If you're the next session tackling the interview-recording feature:
   start with interview-svc's schema + daily.co mock, decide where
   recordings live (file-svc? S3-in-prod/disk-in-dev?), then add a
   `featuredInterviewIds` field to `CandidateProfile`.
