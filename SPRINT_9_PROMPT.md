# Sprint 9 — Admin Console & Dispute Resolution

You completed Sprint 8.5 (communication layer polish) — 279 tests passing, all quality gates green. You're now at the **final feature sprint**.

Branch: `sprint/9-admin` (branched from `sprint/8-communications`)

---

## Why Sprint 9 is the last feature sprint

Sprints 0-8 built the marketplace for **end users** (customers, candidates, vendors). Sprint 9 builds the tools for **platform operators** (admins).

After Sprint 9:
- Platform admins can approve/reject role applications (CRM, SRM, MSME, Interviewer)
- Platform admins can manage users (suspend, ban, reset passwords)
- Platform admins can resolve disputes (timesheet disputes, commission disputes)
- Platform admins have a dashboard showing key metrics + pending actions

**This is the last sprint with new features.** Sprint 10 is testing + deployment prep only.

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.11 (admin schema — RoleApplication, Dispute, AuditLog)
   - Section 7.11 (admin-svc API)
   - Section 8.5 (Admin flows)
3. `PRD.md`:
   - Section 5.7 (Role approval process)
   - Section 5.8 (Dispute resolution)
   - Section 5.9 (Admin dashboard)

---

## Sprint 9 scope

Build the **admin service** and **admin console UI**. This is simpler than previous sprints (mostly CRUD operations, no complex business logic).

**Backend (admin-svc):**
- Role application approval/rejection
- User management (suspend, ban, reset password)
- Dispute creation and resolution
- Audit log queries
- Admin dashboard metrics

**Frontend (apps/web):**
- Admin dashboard (pending approvals, metrics, flagged disputes)
- Role applications queue (approve/reject interface)
- User management page (search, suspend, ban)
- Dispute resolution page (view dispute, add notes, resolve)
- Audit log viewer (searchable log of all admin actions)

**No third-party integrations** — all native platform features.

---

## Task breakdown

### Task 1 — Prisma schema for admin-svc

Implement `services/admin-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["admin"]
}

model RoleApplication {
  id                String   @id @default(uuid())
  userId            String
  requestedRole     RoleType
  status            ApplicationStatus @default(PENDING)
  applicationData   Json     // role-specific data (LinkedIn URL for CRM, certifications for Interviewer, etc.)
  reviewedBy        String?
  reviewedAt        DateTime?
  reviewNotes       String?  @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, createdAt])
  @@index([userId])
  @@schema("admin")
}

enum RoleType {
  CUSTOMER
  CANDIDATE
  CRM
  SRM
  MSME
  INTERVIEWER
  ADMIN
  @@schema("admin")
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
  @@schema("admin")
}

model Dispute {
  id                String   @id @default(uuid())
  type              DisputeType
  contextType       String   // "TIMESHEET", "COMMISSION_PAYOUT", "PLACEMENT", etc.
  contextId         String   // timesheetId, payoutId, placementId, etc.
  raisedBy          String   // userId who raised the dispute
  respondent        String?  // userId who is being disputed
  description       String   @db.Text
  status            DisputeStatus @default(OPEN)
  resolution        String?  @db.Text
  resolvedBy        String?
  resolvedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  notes             DisputeNote[]

  @@index([status, createdAt])
  @@index([raisedBy])
  @@schema("admin")
}

enum DisputeType {
  TIMESHEET
  COMMISSION
  PAYMENT
  CONDUCT
  OTHER
  @@schema("admin")
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED
  CLOSED
  @@schema("admin")
}

model DisputeNote {
  id          String   @id @default(uuid())
  disputeId   String
  dispute     Dispute  @relation(fields: [disputeId], references: [id])
  authorId    String   // userId (admin or disputing party)
  content     String   @db.Text
  createdAt   DateTime @default(now())

  @@index([disputeId, createdAt])
  @@schema("admin")
}

model AuditLog {
  id          String   @id @default(uuid())
  action      String   // "USER_SUSPENDED", "ROLE_APPROVED", "DISPUTE_RESOLVED", etc.
  performedBy String   // userId (admin)
  targetId    String?  // userId, disputeId, etc.
  targetType  String?  // "USER", "DISPUTE", etc.
  metadata    Json?    // additional context
  createdAt   DateTime @default(now())

  @@index([performedBy, createdAt])
  @@index([targetId])
  @@index([action, createdAt])
  @@schema("admin")
}
```

Generate migration. Apply locally.

### Task 2 — Shared types

In `packages/types/`:
- `RoleApplicationRequestSchema` (requestedRole, applicationData)
- `RoleApplicationResponseSchema`
- `ApproveApplicationSchema` (reviewNotes?)
- `RejectApplicationSchema` (reviewNotes required)
- `CreateDisputeRequestSchema` (type, contextType, contextId, description)
- `DisputeResponseSchema`
- `ResolveDisputeSchema` (resolution)
- `AddDisputeNoteSchema` (content)
- `SuspendUserSchema` (reason, duration?)
- `AuditLogResponseSchema`

Add enums to `enums.ts`: `ApplicationStatus`, `DisputeType`, `DisputeStatus`

### Task 3 — Repository layer

In `services/admin-svc/src/repositories/`:

**role-application.repository.ts:**
- `create(data)` — called when user requests a new role
- `findById(id, authContext)` — authz: admin or applicant
- `list(filters, authContext)` — authz: admin only, supports: status, requestedRole
- `approve(id, reviewerId, notes, authContext)` — authz: admin only
- `reject(id, reviewerId, notes, authContext)` — authz: admin only

**dispute.repository.ts:**
- `create(data, authContext)` — authz: authenticated users can raise disputes
- `findById(id, authContext)` — authz: admin, raisedBy, or respondent
- `list(filters, authContext)` — authz: admin sees all, users see only their own
- `addNote(disputeId, authorId, content, authContext)`
- `resolve(id, resolution, resolverId, authContext)` — authz: admin only

**user-management.repository.ts:**
- `suspend(userId, reason, duration, authContext)` — authz: admin only
- `ban(userId, reason, authContext)` — authz: admin only
- `resetPassword(userId, authContext)` — authz: admin only (sends password reset email)
- `search(query, authContext)` — authz: admin only, searches users by email/name

**audit-log.repository.ts:**
- `create(action, performedBy, targetId, targetType, metadata)` — called on every admin action
- `list(filters, authContext)` — authz: admin only, supports: action, performedBy, targetId, dateRange

### Task 4 — Service layer

In `services/admin-svc/src/services/`:

**role-application.service.ts:**
- `approveApplication(id, reviewerId, notes)` — 
  1. Update application status to APPROVED
  2. Add role to user (call identity-svc internal endpoint: `POST /api/v1/internal/users/:userId/roles`)
  3. Create audit log entry
  4. Emit `role.approved.v1` event (notification-svc sends email to user)

- `rejectApplication(id, reviewerId, notes)` — 
  1. Update application status to REJECTED
  2. Create audit log entry
  3. Emit `role.rejected.v1` event

**dispute.service.ts:**
- `createDispute(data, authContext)` — creates dispute, emits `dispute.raised.v1`
- `resolveDispute(id, resolution, resolverId)` — 
  1. Update status to RESOLVED
  2. Create audit log entry
  3. Emit `dispute.resolved.v1` event

**user-management.service.ts:**
- `suspendUser(userId, reason, duration)` — 
  1. Update user status in identity-svc (call internal endpoint)
  2. Create audit log entry
  3. Emit `user.suspended.v1`

- `banUser(userId, reason)` — similar to suspend, permanent

### Task 5 — API routes

Implement ENGINEERING_SPEC Section 7.11 endpoints:

**Role applications:**
- `POST /api/v1/role-applications` — submit application (authenticated users)
- `GET /api/v1/role-applications` — list applications (admin: all, user: own)
- `GET /api/v1/role-applications/:id` — get application
- `POST /api/v1/role-applications/:id/approve` — approve (admin-only)
- `POST /api/v1/role-applications/:id/reject` — reject (admin-only)

**Disputes:**
- `POST /api/v1/disputes` — create dispute (authenticated users)
- `GET /api/v1/disputes` — list disputes (admin: all, user: own)
- `GET /api/v1/disputes/:id` — get dispute with notes
- `POST /api/v1/disputes/:id/notes` — add note
- `POST /api/v1/disputes/:id/resolve` — resolve (admin-only)

**User management:**
- `POST /api/v1/admin/users/:userId/suspend` — suspend user (admin-only)
- `POST /api/v1/admin/users/:userId/ban` — ban user (admin-only)
- `POST /api/v1/admin/users/:userId/reset-password` — trigger password reset (admin-only)
- `GET /api/v1/admin/users/search?q=` — search users (admin-only)

**Audit logs:**
- `GET /api/v1/admin/audit-logs` — list logs (admin-only, query: `?action=&performedBy=&targetId=&from=&to=`)

**Dashboard metrics:**
- `GET /api/v1/admin/dashboard/metrics` — get key metrics (admin-only)
  - Returns: `{ pendingApplications, openDisputes, activeUsers, totalPlacements, gmvThisMonth }`

### Task 6 — Frontend: Admin dashboard

Build `/admin` page (admin-only):

**Layout (grid of cards):**

**Row 1: Key metrics**
- Pending role applications (count + "View all" link)
- Open disputes (count + "View all" link)
- Active placements (count)
- GMV this month (dollar amount)

**Row 2: Recent activity**
- Recent role applications (table, 5 most recent)
  - Columns: User, Role, Applied date, Status, Actions (Approve/Reject)
- Recent disputes (table, 5 most recent)
  - Columns: Type, Raised by, Context, Status, Actions (View)

**Row 3: Quick actions**
- Search users (search bar → navigates to user management page)
- View audit logs (button → navigates to audit log page)

**Empty states:** If no pending applications/disputes, show "All clear" message.

### Task 7 — Frontend: Role applications queue

Build `/admin/role-applications` page (admin-only):

**Table view:**
- Columns: User (name + email), Requested role, Applied date, Status, Actions
- Filters: Status (dropdown), Requested role (dropdown)
- Click row → navigate to `/admin/role-applications/[id]`

**Application detail page** (`/admin/role-applications/[id]`):

**Layout:**
- Header: User info (name, email, current roles)
- Section 1: Application data (varies by role)
  - CRM: LinkedIn URL, referral source, companies worked with
  - SRM: LinkedIn URL, recruitment experience, specializations
  - MSME: Company name, EIN, services offered
  - Interviewer: LinkedIn URL, certifications, specializations, years of experience
- Section 2: Actions (if pending)
  - Review notes (textarea)
  - Approve button (green)
  - Reject button (red)

**Approve action:**
- POST to `/api/v1/role-applications/:id/approve`
- On success: redirect to `/admin/role-applications` with "Application approved" toast

**Reject action:**
- Requires review notes (validate non-empty)
- POST to `/api/v1/role-applications/:id/reject`
- On success: redirect to `/admin/role-applications` with "Application rejected" toast

### Task 8 — Frontend: User management page

Build `/admin/users` page (admin-only):

**Search bar:**
- Input: email or name
- On submit: `GET /api/v1/admin/users/search?q=`
- Results table below

**Results table:**
- Columns: Name, Email, Roles, Status, Joined date, Actions
- Actions dropdown per row:
  - Suspend (opens modal)
  - Ban (opens confirm dialog)
  - Reset password (sends email)
  - View audit logs (navigates to `/admin/audit-logs?targetId=:userId`)

**Suspend modal:**
- Reason (textarea, required)
- Duration (dropdown: 7 days, 30 days, 90 days, Indefinite)
- Suspend button
- On success: user status updated, modal closes

**Ban confirm dialog:**
- Warning text: "Banning is permanent. This user will lose all access."
- Reason (textarea, required)
- Confirm button
- On success: user status updated, dialog closes

### Task 9 — Frontend: Dispute resolution page

Build `/admin/disputes` page (admin-only):

**Table view:**
- Columns: Type, Raised by, Respondent, Context, Status, Created date, Actions
- Filters: Type (dropdown), Status (dropdown)
- Click row → navigate to `/admin/disputes/[id]`

**Dispute detail page** (`/admin/disputes/[id]`):

**Layout:**
- Header: Type badge, Status badge, Created date
- Section 1: Dispute info
  - Raised by: user name (link to profile)
  - Respondent: user name (if applicable)
  - Context: link to related entity (timesheet, payout, placement)
  - Description: user's complaint (formatted text)
- Section 2: Notes (chronological)
  - Each note: author name, content, timestamp
  - Add note form (textarea + "Add note" button)
- Section 3: Resolution (if status != RESOLVED)
  - Resolution (textarea, required)
  - Resolve button (admin-only)

**Resolve action:**
- POST to `/api/v1/disputes/:id/resolve`
- On success: status → RESOLVED, redirect to `/admin/disputes`

### Task 10 — Frontend: Audit log viewer

Build `/admin/audit-logs` page (admin-only):

**Filters:**
- Action (dropdown: USER_SUSPENDED, ROLE_APPROVED, DISPUTE_RESOLVED, etc.)
- Performed by (user search input)
- Target (user/dispute/etc. search input)
- Date range (from/to date pickers)

**Table view:**
- Columns: Action, Performed by, Target, Timestamp, Details (expandable)
- Click "Details" → expands row to show metadata JSON
- Pagination (cursor-based, 50 per page)

**Export button:**
- "Export to CSV" → downloads filtered audit logs as CSV file
- Useful for compliance/security audits

### Task 11 — Integration tests

**admin-svc tests:**
- Approve role application → verify user.roles updated in identity-svc (mock internal call)
- Reject role application → verify status=REJECTED, audit log created
- Create dispute → verify stored in DB
- Add dispute note → verify note created, author correct
- Resolve dispute → verify status=RESOLVED, audit log created
- Suspend user → verify identity-svc called (mock), audit log created
- Search users → verify results match query
- Authz: non-admin cannot approve application
- Authz: non-admin cannot suspend user

**Playwright E2E (optional for Sprint 9, recommended for Sprint 10):**
- Admin logs in → sees dashboard with pending applications
- Admin approves CRM application → user gains CRM role
- Admin resolves dispute → status updates

### Task 12 — Documentation

- `services/admin-svc/README.md` — endpoints, role approval flow, dispute resolution
- Regenerate OpenAPI spec for admin-svc
- Update root `README.md` with admin console description

---

## Definition of Done (Sprint 9)

**Functional:**
- [ ] Admin can view dashboard with key metrics (pending applications, open disputes, GMV)
- [ ] Admin can approve/reject role applications
- [ ] User gains requested role after approval
- [ ] Admin can create disputes (or users can create, admin can view)
- [ ] Admin can resolve disputes with resolution text
- [ ] Admin can suspend/ban users
- [ ] Admin can search users by email/name
- [ ] Audit log records all admin actions
- [ ] Audit log viewer shows filterable log entries

**Security:**
- [ ] Only ADMIN role can access admin endpoints
- [ ] Only ADMIN role can access `/admin` routes (redirect non-admins)
- [ ] Audit log cannot be edited (append-only)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (admin-svc integration tests green)
- [ ] OpenAPI spec generated for admin-svc

**Visual:**
- [ ] Admin dashboard clean and scannable (cards + tables)
- [ ] Role application detail page shows all relevant data
- [ ] Dispute detail page has clear notes timeline

---

## Before you start

Produce a **written plan** covering:

1. Task ordering (I recommend: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12)
2. Admin role seeding: how to create the first admin user? (Add a script or manual DB insert)
3. Internal endpoint for adding roles to users: does identity-svc have `POST /api/v1/internal/users/:userId/roles`? (If not, add it in Task 4)
4. Dispute context linking: how to link to timesheet/payout/placement from dispute detail page? (Fetch context details via respective service APIs)
5. Commit estimate (expect 60–90 for this sprint — lighter than Sprint 6-7, heavier than Sprint 8)

**CRITICAL: Admin role bootstrapping**

The first admin user needs to be created manually (or via seed script) since there's no admin to approve the first admin application.

**Option A (recommended):** Add a seed script:
```bash
# services/admin-svc/scripts/seed-admin.ts
# Inserts a user with ADMIN role directly into identity DB
```

**Option B:** Manual SQL insert:
```sql
INSERT INTO identity."User" (id, email, password_hash, roles)
VALUES ('admin-seed-id', 'admin@techorbit.com', '<argon2id hash>', ARRAY['ADMIN']);
```

Decide which approach before coding.

**Do not code until you say "proceed to Sprint 9."**

This is the last feature sprint. After Sprint 9, you have a complete marketplace + admin console. Sprint 10 is pure testing + deployment.
