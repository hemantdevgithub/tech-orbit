# Techorbit — Live Demo Walkthrough

Stack is running. Seed data is in. Follow this page during the demo.

- **Web app:** http://localhost:3000/login
- **Mailpit (email inbox):** http://localhost:8025
- **RabbitMQ admin:** http://localhost:15672 (guest / guest)

**Password for every `*@demo.test` user:** `correct horse battery staple 42`
**Admin password:** `TestAdminPass1234`

---

## The accounts

| Role | Email | Notes |
|---|---|---|
| ADMIN | `admin@techorbit.test` | Platform operator. Password = `TestAdminPass1234`. |
| CUSTOMER | `customer@demo.test` | TechCorp Inc. Owns 1 published requirement + 1 draft. |
| CANDIDATE | `candidate@demo.test` | Alex Chen. Has active placement + timesheets + one dispute. |
| CANDIDATE | `candidate2@demo.test` | Priya Patel. Still in "submitted" state on the requirement. |
| CRM | `crm@demo.test` | Riley. Empty-state view (no attributions yet). |
| SRM | `srm@demo.test` | Sam. Empty-state view. |
| MSME | `msme@demo.test` | Morgan / Pine Ridge Consulting. |
| INTERVIEWER | `interviewer@demo.test` | Iris. Has conducted 1 interview with scorecard. |
| (pending) | `applicant@demo.test` | Has a pending CRM application awaiting admin review. |

---

## Suggested demo script (15 minutes)

### 1. The customer perspective (4 min) — `customer@demo.test`

1. **Login** — lands on the dashboard. Point out the "Welcome back, Cassie!" hero and role pill.
2. **Requirements** → shows one `OPEN` requirement ("Senior Full-Stack Engineer") and one `DRAFT`.
3. Click the open requirement → detail page. Scroll down to **Shortlist** → candidates are sorted into pipeline columns:
   - Submitted: Priya Patel
   - Interviewing: Alex Chen (now moved through Screening → Interviewing)
4. Click Alex's card → submission detail with match score, cover note, interview history.
5. **Placements** → one ACTIVE placement with Alex. Click through → see the **Value Chain graph** (customer → candidate, Platform absorbing the CRM/SRM residual because none are attributed) and the commission breakdown.
6. **Timesheets** → two APPROVED, one SUBMITTED pending your review. Approve it live — shows the approval flow.
7. **Invoices** → empty until the weekly cron runs. Mention: Monday 00:01 UTC generates a `$9,600` invoice for the two approved weeks.

### 2. The candidate perspective (3 min) — `candidate@demo.test` (open in incognito)

1. **Login** → candidate dashboard. Earnings cards: "Earnings this month: $0" (no invoice paid yet), "Timesheets to submit: 0" (all three submitted).
2. **Timesheets** → three rows visible: two APPROVED, one SUBMITTED.
3. **Placements** → the same placement from the candidate's view. Pay rate $90/hr visible; CRM/SRM commissions redacted.
4. **Messages** — if you want to start a thread: click "+ New message" → pick PLACEMENT → select the active placement → message `Cassie`.

### 3. The interviewer perspective (2 min) — `interviewer@demo.test`

1. **Dashboard** → Iris' workspace. Shows 1 completed interview.
2. **Interviews** → click the one with Alex → scorecard visible with all 5 stars and the "STRONG_YES" recommendation.

### 4. The admin console (4 min) — `admin@techorbit.test`

Password for this one is `TestAdminPass1234`.

1. **Login** → `/admin` loads automatically (admin-guarded). Dashboard shows:
   - **Pending applications: 1** (Avery's CRM application)
   - **Open disputes: 1** (Alex's timesheet dispute)
   - Active users, GMV this month
2. **Role applications** → click the pending one → see the application data (LinkedIn URL, referral source, companies list). Click **Approve** → user gets CRM role, audit log entry created, event emitted.
3. **Disputes** → open the timesheet dispute → add a note, then resolve it with a resolution message. Watch the status flip to RESOLVED.
4. **Users** → search "customer" → see results. Demonstrate the Suspend modal (don't confirm; just close it).
5. **Audit logs** → filter by action. Show the entries from the role approval + dispute resolution you just did. Click "Details" on any row for the JSON metadata.

### 5. The user menu (1 min) — any role

1. Click your avatar (top right) in any layout → dropdown with Profile / Notifications / Admin / Dashboard / Sign out.
2. Click **Profile** → `/settings/profile`. Shows account info, current roles, and an "Add another role" grid.

### 6. The seed script itself (1 min) — if they care about repeatability

Show `scripts/seed-demo.ts`. Mention:
- Fires ~40 HTTP calls across 8 services in ~4 seconds.
- Idempotent-ish (drops prior `*@demo.test` users first).
- Runs against any Techorbit instance (local dev or Docker prod).

---

## If something breaks mid-demo

- **Web returns 404 on everything.** Next's file watcher got overwhelmed at boot. `pkill -f "next dev"` then `cd apps/web && bash -c 'ulimit -n 10240 && pnpm dev'` (see DEPLOYMENT_LOCAL.md).
- **A backend service is dead.** `pnpm exec turbo dev --filter=@techorbit/<name>` brings it back standalone.
- **Password isn't working.** The demo accounts all use `correct horse battery staple 42` (yes, with spaces). Admin is `TestAdminPass1234`.
- **Nothing to show on a role dashboard.** Reseed: `docker exec techorbit-postgres psql -U techorbit -d techorbit -c "DELETE FROM identity_user WHERE email LIKE '%@demo.test';" && pnpm exec tsx scripts/seed-demo.ts`.

---

## Stack shutdown (after the demo)

```bash
pkill -f "turbo dev" ; pkill -f "next dev" ; pkill -f "tsx watch"
# Docker infra stays up (postgres/rabbitmq/redis/mailpit) — run `docker-compose down` if you want those gone too
```
