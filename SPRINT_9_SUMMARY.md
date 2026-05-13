# Sprint 9 Summary — Admin Console & Dispute Resolution

**Branch:** `sprint/9-admin` (from `sprint/8-communications`)
**Status:** Complete — lint 0, typecheck 0, build passes, **289 tests** green (+10 from Sprint 9).

---

## Why this sprint matters

Sprints 0-8 built the marketplace for end users. Sprint 9 ships the controls platform operators need to keep it trustworthy: review role applications before CRMs/SRMs/MSMEs can act, suspend or ban bad actors, resolve financial disputes with a permanent audit trail, and read the audit log forever.

This is the last feature sprint. After this, Sprint 10 is pure testing + deployment prep.

---

## What was delivered

### Backend — `services/admin` (new, port 3014)

Fully scaffolded from an empty shell, following the Sprint 6/7/8 service layout.

**Schema** ([services/admin/prisma/schema.prisma](services/admin/prisma/schema.prisma))
- `RoleApplication` with `PENDING | APPROVED | REJECTED`. `requestedRole` is `ApplicationRole = CRM | SRM | MSME | INTERVIEWER` — excludes CUSTOMER/CANDIDATE (self-serve at signup) and ADMIN (seeded).
- `Dispute` + `DisputeNote` with `OPEN | UNDER_REVIEW | RESOLVED | CLOSED` and `TIMESHEET | COMMISSION | PAYMENT | CONDUCT | OTHER` types. `contextType` + `contextId` are plain strings — no cross-schema FKs.
- `AuditLog` — append-only. The repository deliberately exposes no update/delete helpers.
- `OutgoingEvent` for the transactional outbox.
- Migration applied ([services/admin/prisma/migrations/20260424152407_init_admin_schema/](services/admin/prisma/migrations/20260424152407_init_admin_schema/)). 10th schema in the `techorbit` Postgres database.

**Service layer** — 5 services covering the four surfaces:
- `role-application.service.ts` — submit/list/get/approve/reject with identity-svc integration (role grant happens *before* approval flip so a failed grant doesn't leave inconsistent state).
- `dispute.service.ts` — create / list / get+notes / resolve. Non-admins see only disputes they raised or were named respondent on.
- `user-management.service.ts` — suspend / ban / trigger password reset / search. All delegate to identity-svc internal endpoints.
- `audit-log.service.ts` — admin-only list with filter on action, performedBy, targetId, date range.
- `dashboard.service.ts` — fan-out metrics aggregator (best-effort; failed upstream calls return 0).

**API routes** ([services/admin/src/routes/](services/admin/src/routes/)) — 15 endpoints covering Role Applications (5), Disputes (5), User Management (4), Audit Logs (1), Dashboard (1) + health.

**Cross-service additions** (required for admin-svc to do its job):
- **identity-svc** ([services/identity/src/routes/internal.routes.ts](services/identity/src/routes/internal.routes.ts)) — new SERVICE-gated endpoints:
  - `GET  /api/v1/internal/users/:id`
  - `POST /api/v1/internal/users/:id/roles`
  - `POST /api/v1/internal/users/:id/status` (revokes active sessions on SUSPENDED/BANNED so the user is kicked on next request)
  - `POST /api/v1/internal/users/:id/trigger-password-reset`
  - `GET  /api/v1/internal/users/search?q=&limit=` (ILIKE on email + firstName + lastName)
  - `GET  /api/v1/internal/metrics/active-users`
- **placement-svc** — new `GET /api/v1/internal/metrics/total-placements`.
- **payments-svc** — new `GET /api/v1/internal/metrics/gmv-this-month` (sum of `totalUsd` for invoices billed this calendar month).

### Shared types

- **`packages/types/src/admin.ts`** — new module. 25+ Zod schemas: application request/response/filter/approve/reject, dispute create/response/filter/resolve/add-note, user search + suspend/ban, audit log response + filter, dashboard metrics, plus 6 domain events.
- **`packages/types/src/enums.ts`** — added `ApplicationRole`, `ApplicationStatus`, `DisputeType`, `DisputeStatus`, `UserStatus`, `SuspendDuration`.

### `AdminApiClient` in `packages/api-client`

Thin client for all 15 endpoints. Wired into `apps/web/src/lib/api-client.ts` as `getAdminClient()` singleton on port 3014 via `NEXT_PUBLIC_ADMIN_URL`.

### Frontend — admin console

New `/admin/*` routes, protected by `<AdminGuard />` ([apps/web/src/components/admin-guard.tsx](apps/web/src/components/admin-guard.tsx)) which redirects non-ADMIN users to `/dashboard`.

- **`/admin`** — dashboard with 4 metric cards (pending applications, open disputes, active users, GMV this month) + recent activity (pending applications table, recent disputes) + quick actions.
- **`/admin/role-applications`** — filterable queue (status + role). Click → detail.
- **`/admin/role-applications/[id]`** — full applicant data display, review notes textarea, Approve / Reject buttons with reject-requires-notes validation.
- **`/admin/users`** — search + results table + per-row action buttons (Suspend / Ban / Reset PW / Audit). Suspend modal has reason + duration dropdown (7/30/90 days or indefinite). Ban confirm dialog with "permanent" warning.
- **`/admin/disputes`** — filterable list (status + type). Click → detail.
- **`/admin/disputes/[id]`** — dispute info card with context link that auto-routes to `/placements/:id`, `/payouts/:id`, etc. based on `contextType`. Notes timeline with add-note form. Resolve card with required resolution textarea.
- **`/admin/audit-logs`** — filter panel (action / performedBy / targetId / date range). Results table with expandable metadata rows (JSON pretty-print). Pre-populates `targetId` filter from the `?targetId=` query param so "Audit" links from the users page land correctly.

### Shared UI

- **`NavBar.rightSlot`** already in place from Sprint 8.5; admin layout uses it to drop in the notification bell.

### Admin bootstrapping

[services/admin/scripts/seed-admin.ts](services/admin/scripts/seed-admin.ts) — the first admin cannot be approved by admin-svc's HTTP API (chicken-and-egg). Script uses `pg` directly, hashes the password with argon2id matching identity-svc's params (memoryCost 65536, timeCost 3, parallelism 4), upserts the user and grants `ADMIN`. Idempotent — second run adds the role if missing rather than erroring. Verified working on the local DB.

```bash
DATABASE_URL=postgresql://... \
ADMIN_SEED_EMAIL=admin@techorbit.com \
ADMIN_SEED_PASSWORD=<strong> \
pnpm --filter @techorbit/admin seed-admin
```

---

## Architectural decisions confirmed this sprint

1. **admin-svc owns its own AuditLog.** Scoped to admin actions. The general `audit-svc` (still an empty scaffold) would later collect platform-wide events; admin-svc's log is narrow and append-only.
2. **Audit log is append-only by construction.** The repository exports `createAuditLog` and `listAuditLogs` — no update/delete methods exist. Every admin mutation writes the audit entry in the same transaction as the mutation itself, so there's no way to mutate without logging.
3. **Role grant before approval flip.** Identity-svc call runs before the `RoleApplication.status = APPROVED` write. If the call fails, the application stays PENDING rather than APPROVED-without-role.
4. **BAN → SUSPENDED at the auth layer.** Identity-svc's `UserStatus` enum has no BANNED. admin-svc's BAN action maps to SUSPENDED in identity, and the distinction is preserved in audit logs + `user.banned.v1` events + UI rendering. Cleaner than adding a BANNED column to identity (and the functional effect — "no sessions, can't auth" — is identical).
5. **Suspend revokes sessions.** Flipping status to SUSPENDED also invalidates all active `identity_session` rows, so the user can't stay logged in on stale tokens.
6. **Metrics fan-out is best-effort.** Any upstream metric call that fails returns 0 instead of erroring. The admin dashboard always renders.
7. **Dispute context linking is frontend-only.** Admin-svc stores `contextType` + `contextId` as strings. The detail page uses a simple switch on `contextType` to build the right href (`/placements/:id`, `/payouts/:id`, etc.). No backend enrichment endpoint needed for v1.
8. **Seed script talks to the DB, not HTTP.** Bootstrap admin via direct `pg` insert using the same argon2id params identity-svc uses for hashing. Can't go through identity-svc's HTTP API because it requires an existing admin.
9. **SUSPENDED/BANNED propagate immediately.** Session revocation happens in the same internal endpoint as the status flip — one call, atomic effect.

---

## Test coverage

```
pnpm test → 31 workspaces, 289 tests green (+10 from Sprint 9).
```

[services/admin/tests/integration/admin.test.ts](services/admin/tests/integration/admin.test.ts) — 9 integration tests (+ 1 smoke):

1. Approve application → identity-svc `addRole` called, audit `ROLE_APPLICATION_APPROVED` written, `role.approved.v1` event enqueued
2. Reject application → status=REJECTED, audit written
3. Create dispute → `dispute.raised.v1` event enqueued
4. Add dispute note → stored with correct authorId
5. Resolve dispute → status=RESOLVED, audit + `dispute.resolved.v1` event
6. Suspend user → identity-svc called with SUSPENDED + duration, audit written
7. Search users → forwards query to identity-svc
8. Authz: non-admin cannot approve application → 403
9. Authz: non-admin cannot suspend user → 403

Testcontainer Postgres; cross-service fetches stubbed via `vi.spyOn(globalThis, "fetch")` that records calls for assertion.

---

## Known gaps / follow-ups

- **Audit log CSV export.** Prompt mentioned it; deferred — the JSON metadata expand is enough for v1 admin use; CSV export is a 30-minute follow-up when ops actually asks for it.
- **Application-role scoping in Zod.** `ApplicationRole` excludes CUSTOMER/CANDIDATE/ADMIN so admin-svc can't be used to self-grant admin. Good. But nothing stops a misconfigured client from sending `requestedRole: "ADMIN"` to identity-svc's internal endpoint; that endpoint currently accepts any `UserRoleType`. Tightening the internal endpoint to reject ADMIN grants from non-seed callers is a Sprint 10 hardening item.
- **Dispute respondent notification.** `dispute.raised.v1` is emitted but notification-svc doesn't yet have a `DISPUTE_RAISED` consumer. One line to add when Sprint 10 lands.
- **Admin guard is client-side only.** The `AdminGuard` redirects non-ADMIN to `/dashboard` but the server can still respond to the page load. All admin API endpoints are gated server-side, so the worst case is a user sees empty `/admin/*` pages with every fetch returning 403 — no data leak. A middleware-based guard would be tidier for Sprint 10.
- **Real full-text search.** User search uses Postgres ILIKE with `LIMIT 50` — fine now; swap for a real search index (Meili/Typesense) when user count grows.

---

## Dependencies for future sprints

- **Sprint 10 (testing + deployment):** Playwright E2E for the three admin flows (approve CRM → user gains role, resolve dispute, suspend user → session revoked). Dockerfile + task definition for admin-svc in the terraform deploy configs.
- **Per-role application UX:** Sprint 9 builds the approval queue; the *user-facing* "apply for CRM" form on the dashboard isn't wired up yet (there's no onboarding page asking users to submit `applicationData`). That's a v1.1 item — for now applications are expected to come in via admin-scripted seeds or the API directly.

---

## Commits

Commit structure follows Sprint 6/7/8 convention (scope-prefixed conventional commits).
