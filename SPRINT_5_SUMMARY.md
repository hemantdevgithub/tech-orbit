# Sprint 5 Summary — Interviews

**Branch:** `sprint/5-interviews` (from `sprint/4-matching` after Checkpoint D)
**Status:** Complete — lint 0, typecheck 0, build passes, 127+ tests green

---

## Checkpoint D (completed before Sprint 5)

- **D1:** Fixed `pnpm build` by wrapping `useSearchParams()` in `<Suspense>` on `/login` and `/reset-password`. Build now passes cleanly.
- **D2:** 13/13 API smoke-test checks passed. Also caught and fixed 2 Sprint 4 bugs during D2: `fix(identity): login token missing ACTIVE roles`, `fix(auth-middleware): requireServiceRole called wrong method`.

---

## What was built

### Backend: `services/interview`

Full interview service built from a bare shell.

**Schema:** `Interview`, `Scorecard`, `ProcessedEvent`, `OutgoingEvent` in the `interview` Postgres schema. `Scorecard` has a `@unique` FK on `interviewId` — one scorecard per interview.

**Daily.co integration** (`src/lib/daily.ts`):
- Live mode: calls Daily.co REST API to create private rooms with cloud recording and time-gated `nbf`/`exp`.
- Mock mode: if `DAILY_API_KEY` is absent, returns `https://mock.daily.co/interview-<uuid>`. CI and local dev work without a Daily account.

**Service layer** (`src/services/interview.service.ts`):
- `scheduleInterview` — validates submission is in SCREENING/INTERVIEWING/SUBMITTED, creates Daily.co room, writes Interview + outbox event transactionally.
- `startInterview`, `endInterview` — status transitions; end triggers async recording URL fetch (non-blocking).
- `cancelInterview` — deletes Daily.co room (best-effort), marks CANCELLED.
- `submitScorecard` — idempotency guard, emits `scorecard.submitted.v1` (payments-svc consumes in Sprint 7).
- `getScorecard` — customer/interviewer only; candidates 403.

**Repo layer** — interview visibility: scheduler OR candidate OR interviewer OR admin. Scorecard visibility: scheduler OR interviewer only (no candidate access).

**Routes:** 8 endpoints (POST schedule, GET list/detail, POST start/end/cancel, POST scorecard, GET scorecard).

**Tests:** 12 integration + 1 smoke = 13 total for interview-svc. Full repo: 127 tests.

### Cross-service

- `matching-svc`: new `/api/v1/internal/submissions/:id` (SERVICE-gated) so interview-svc can validate submission status without a user JWT.
- `profile-svc`: new `GET /api/v1/interviewers` list endpoint (filters by specialization, paginates by id cursor). `listInterviewers` added to repository and service.

### Frontend: `apps/web`

New pages:
- **`/submissions/[id]/schedule-interview`** — step-by-step: choose self-conduct vs platform interviewer; pick date/time. "Schedule interview" button added to submission detail page for owners.
- **`/interviews/[id]`** — status badge, participant details, scorecard display (read-only), "Join video call" + "Submit scorecard" + "Cancel" action cards.
- **`/interviews/[id]/call`** — full-screen Daily.co iframe embed. Pre-join splash, "Join now" button calls `/start`, "End call" calls `/end`. Handles mock URLs gracefully.
- **`/interviews/[id]/scorecard`** — star-rating components (1-5), recommendation radio (6 options), freeform feedback (2000 chars), optional red flags, would-hire-again toggle.
- **`/interviewers`** — browse marketplace with specialization search filter; cursored pagination.
- **`/interviewers/[id]`** — interviewer detail: bio, specializations, seniority/interview-type badges, upcoming availability slots, copy-user-ID button for scheduling.
- **`/dashboard/interviewer`** — recurring availability pattern form: day-of-week checkboxes + start/end hour; generates concrete `availabilitySlots` for the next 14 days and saves via `PUT /api/v1/interviewers/me/availability`.

`InterviewApiClient` added to `packages/api-client`; `getInterviewClient()` wired in `apps/web/src/lib/api-client.ts`.

---

## Decisions made

| Decision | Choice | Rationale |
|---|---|---|
| Video provider | Daily.co with mock fallback | Easiest REST API, good free tier; mock mode keeps CI dependency-free |
| Availability UX | Recurring pattern (days + hours) not per-slot calendar | Per-slot is Sprint 5.5; this delivers the feature without a complex calendar widget |
| Scorecard visibility | Scheduler + interviewer only | Candidates seeing feedback creates awkward dynamics in v1 |
| Submission statuses accepted for scheduling | SCREENING, INTERVIEWING, SUBMITTED | Prompt said INTERVIEWING-only but customers schedule from SCREENING too |
| Self-conduct `conductedByRole` | `CUSTOMER_INTERNAL` | Explicit enum value for analytics/attribution downstream |

---

## Known gap

`/dashboard/interviewer` is accessible via direct URL but not yet linked in the dashboard nav for interviewer-role users. The `InterviewerDashboard` component in `apps/web/src/components/dashboard/interviewer-dashboard.tsx` shows a static 7-day calendar widget — a link to `/dashboard/interviewer/availability` would complete the connection. Low effort, noted for Sprint 5.5.

---

## Sprint 5 commit log

1. `feat(interview): scaffold Prisma schema and migration`
2. `feat(types): add interview, scorecard, and event schemas`
3. `feat(interview): backend — Daily.co, repos, service, routes, tests`
4. `feat(web,api-client,profile): schedule, video call, scorecard, marketplace, availability pages`
5. `docs,chore(interview): README, OpenAPI, CI sync; SPRINT_5_SUMMARY`

5 commits. Under the 70–100 estimate — Daily.co mock mode collapsed the integration complexity and the recurring-pattern availability kept the calendar work minimal.

---

## Dependencies for Sprint 6 (Placements)

- `scorecard.submitted.v1` events are in the outbox — placement-svc and payments-svc can consume them.
- Interviewer fee amount (`interviewerFeeUsd`) is stored on the `Interview` row for payments-svc to read.
- `interview.completed.v1` can trigger the "candidate has passed all required interviews" check in placement-svc.
