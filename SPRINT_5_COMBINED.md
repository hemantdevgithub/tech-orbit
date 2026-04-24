# Sprint 4.5 Polish → Sprint 5 (Interviews)

You completed Sprint 4 (matching + submissions). Before starting Sprint 5, do a quick polish pass to fix the build failure and verify the UI works end-to-end.

Continue on `sprint/4-matching` or create `sprint/5-interviews` after Checkpoint D passes (your call).

---

## CHECKPOINT D — Build Fix + UI Verification (30 min)

### D1. Fix the Next.js build failure (5 min)

**Problem:** `/login` and `/reset-password` use `useSearchParams()` without Suspense boundaries. This causes `pnpm build` to fail.

**Fix:**

In `apps/web/src/app/login/page.tsx`:
```tsx
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  // ... rest of existing component logic
  return (
    // ... existing JSX
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-100 flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
```

Do the same for `apps/web/src/app/reset-password/page.tsx` (or wherever the reset password page lives).

**Verify:**
```bash
pnpm --filter @techorbit/web build
```

Should complete without errors. If it still fails, paste the error and we'll debug.

**Commit:**
```
fix(web): wrap useSearchParams in Suspense boundaries

Next.js App Router requires Suspense around useSearchParams
to handle streaming SSR. Fixes build failure on /login and
/reset-password pages.
```

### D2. UI smoke test (15 min)

Bring up the full stack and manually verify the Sprint 1-4 flows work:

```bash
# Terminal 1
docker-compose up -d

# Terminal 2
pnpm dev

# Terminal 3 (for testing)
```

**Test checklist (do these quickly, 2 min each):**

1. **Sign up flow:** Register a new user → verify email (check Mailpit at localhost:8025) → select CUSTOMER role → reach dashboard ✓
2. **Profile completion:** Fill out customer company profile → save → see "Profile complete" ✓
3. **Post requirement:** Post a job requirement (3-step form) → publish → see it in browse list ✓
4. **Browse requirements:** Open `/requirements` → see your posted req + filters work ✓
5. **Submit as candidate:** Register a 2nd user as CANDIDATE → complete profile → submit to the req → see success toast ✓
6. **View shortlist:** As customer, open `/requirements/[id]/shortlist` → see the submission in "Submitted" column ✓
7. **Drag submission:** Drag the submission card from "Submitted" to "Screening" → verify status updates ✓
8. **Submission detail:** Click the submission card → see match score + candidate profile summary ✓

**If any of these fail:** Note which one, we'll fix it before Sprint 5. Common issues:
- Ports wrong → check `.env` has all service URLs correct
- Service not starting → check logs in Terminal 2
- 404s → Next.js routing issue, check `app/` folder structure
- Empty states everywhere → database not seeded, services not emitting events

**If all pass:** You're clear for Sprint 5.

### D3. Commit the polish

If you made any fixes during the smoke test (besides the Suspense fix already committed), commit them now as:
```
fix(web): polish Sprint 1-4 UI flows

- [describe what you fixed]
```

**Once Checkpoint D is complete:** proceed to Sprint 5 below.

---

## SPRINT 5 — Interviews

**Prerequisites:** Checkpoint D complete; Sprint 4 merged or ready to merge.

Branch: `sprint/5-interviews` (branched from `sprint/4-matching` after Checkpoint D)

### Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.6 (interview schema — Interview, Scorecard)
   - Section 6.2 (events — `interview.scheduled.v1`, `scorecard.submitted.v1`)
   - Section 7.5 (interview-svc API)
   - Section 8.2 (Flow: Interview)
3. `PRD.md`:
   - Section 4.4 (Interview types and flow)
   - Section 5.3 (Interviewer marketplace)
4. `DESIGN_REFERENCE.md` — for interview UI

### Sprint 5 scope

Build the **interview service** and **video interview flows**. After Sprint 4, customers have submissions. After Sprint 5, customers can schedule interviews, conduct them via embedded video, and collect scorecards.

**Backend (interview-svc):**
- Interview CRUD (schedule, reschedule, cancel)
- Video session management (Daily.co integration)
- Scorecard submission and storage
- Interviewer availability matching

**Frontend (apps/web):**
- Schedule interview flow (pick interviewer + time slot)
- Video call interface (embed Daily.co)
- Scorecard form (post-interview feedback)
- Interviewer marketplace (browse available interviewers)
- Interviewer availability management (calendar widget)

**Third-party integration:**
- Daily.co for video calls (rooms + recordings)

Do NOT build placements yet — that's Sprint 6. This sprint ends at "customers can interview candidates and get scorecards."

---

### Task breakdown

#### Task 1 — Prisma schema for interview-svc

Implement `services/interview-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["interview"]
}

model Interview {
  id                   String   @id @default(uuid())
  requirementId        String
  submissionId         String
  candidateId          String
  interviewerUserId    String?  // null if customer self-conducts
  conductedByRole      InterviewerRole
  scheduledStart       DateTime
  scheduledEnd         DateTime
  videoProviderId      String?  // Daily.co room name
  videoRoomUrl         String?
  videoRecordingUrl    String?
  status               InterviewStatus @default(SCHEDULED)
  startedAt            DateTime?
  endedAt              DateTime?
  cancelledAt          DateTime?
  cancelledBy          String?
  cancelReason         String?
  interviewerFeeUsd    Decimal?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  scorecard            Scorecard?

  @@index([scheduledStart])
  @@index([candidateId])
  @@index([interviewerUserId])
  @@index([requirementId])
  @@schema("interview")
}

enum InterviewerRole {
  PLATFORM_INTERVIEWER
  CUSTOMER_INTERNAL
  @@schema("interview")
}

enum InterviewStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  NO_SHOW
  CANCELLED
  @@schema("interview")
}

model Scorecard {
  id                   String   @id @default(uuid())
  interviewId          String   @unique
  interview            Interview @relation(fields: [interviewId], references: [id])
  recommendation       Recommendation
  technicalScore       Int?     // 1-5 scale
  communicationScore   Int?     // 1-5 scale
  problemSolvingScore  Int?     // 1-5 scale
  culturalFitScore     Int?     // 1-5 scale
  freeformFeedback     String   @db.Text
  redFlags             String?  @db.Text
  wouldHireAgain       Boolean?
  submittedAt          DateTime @default(now())
  submittedBy          String   // userId of submitter

  @@schema("interview")
}

enum Recommendation {
  STRONG_YES
  YES
  WEAK_YES
  WEAK_NO
  NO
  STRONG_NO
  @@schema("interview")
}

model OutgoingEvent {
  id        String   @id @default(uuid())
  eventType String
  payload   Json
  status    OutgoingEventStatus @default(PENDING)
  attempts  Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  @@schema("interview")
}

enum OutgoingEventStatus {
  PENDING
  PUBLISHED
  FAILED
  @@schema("interview")
}
```

Generate migration. Apply locally.

#### Task 2 — Shared types

In `packages/types/`:
- `ScheduleInterviewRequestSchema` (requirementId, submissionId, interviewerUserId, scheduledStart, scheduledEnd)
- `InterviewResponseSchema`
- `InterviewListResponseSchema`
- `CancelInterviewSchema` (reason)
- `ScorecardRequestSchema` (recommendation, scores, feedback, redFlags, wouldHireAgain)
- `ScorecardResponseSchema`
- Event schemas: `interview.scheduled.v1`, `interview.completed.v1`, `scorecard.submitted.v1`

Add enums to `enums.ts`: `InterviewerRole`, `InterviewStatus`, `Recommendation`

#### Task 3 — Daily.co integration

In `services/interview-svc/src/lib/daily.ts`:

**Wrapper around Daily.co REST API:**
- `createRoom(name, startTime, endTime)` — returns room URL
- `getRoomUrl(name)` — fetches existing room
- `deleteRoom(name)` — cleanup after interview ends
- `getRecording(roomName)` — fetches recording URL (async, Daily processes this after call ends)

**Config:**
- `DAILY_API_KEY` from env (sign up at https://daily.co for a free API key)
- `DAILY_DOMAIN` (your Daily subdomain, e.g., `techorbit.daily.co`)

**Mock mode:** If `DAILY_API_KEY` is not set, return mock URLs (`https://mock-video-room.example.com/interview-123`). This lets dev work without a Daily account.

#### Task 4 — Repository layer

In `services/interview-svc/src/repositories/`:

**interview.repository.ts:**
- `create(data, authContext)` — authz: customer who owns the requirement
- `findById(id, authContext)` — visibility: customer, candidate, interviewer involved
- `list(filters, authContext)` — supports: requirementId, candidateId, interviewerUserId, status, dateRange
- `updateStatus(id, newStatus, authContext)`
- `cancel(id, reason, authContext)` — authz: customer or interviewer (within 24h of scheduled time)

**scorecard.repository.ts:**
- `create(interviewId, data, authContext)` — authz: interviewer or customer who conducted
- `findByInterview(interviewId, authContext)` — visibility: customer only (scorecards are confidential from candidate)

#### Task 5 — Service layer

In `services/interview-svc/src/services/interview.service.ts`:

**scheduleInterview:**
1. Validate submission is in INTERVIEWING status (call matching-svc)
2. If `interviewerUserId` provided, check interviewer availability (call profile-svc for availability slots)
3. Create Daily.co room
4. Insert Interview with room URL
5. Emit `interview.scheduled.v1`

**startInterview (webhook from Daily or manual call):**
- Update status to IN_PROGRESS
- Set `startedAt`

**endInterview (webhook from Daily or manual call):**
- Update status to COMPLETED
- Set `endedAt`
- Fetch recording URL (async — Daily processes this, poll or webhook)
- Emit `interview.completed.v1`

**cancelInterview:**
- Delete Daily.co room
- Update status to CANCELLED
- Set `cancelledAt`, `cancelledBy`, `cancelReason`

**submitScorecard:**
- Insert Scorecard
- Emit `scorecard.submitted.v1` (consumed by payments-svc in Sprint 7 for interviewer fee payment)

#### Task 6 — API routes

Implement ENGINEERING_SPEC Section 7.5 endpoints:

- `POST /api/v1/interviews` — schedule interview
- `GET /api/v1/interviews/:id` — get interview details
- `GET /api/v1/interviews` — list interviews (query: `?requirementId=&candidateId=&interviewerUserId=&status=`)
- `POST /api/v1/interviews/:id/cancel` — cancel interview
- `POST /api/v1/interviews/:id/start` — mark as started (also accepts Daily webhook)
- `POST /api/v1/interviews/:id/end` — mark as ended (also accepts Daily webhook)
- `POST /api/v1/scorecards` — submit scorecard
- `GET /api/v1/scorecards?interviewId=` — get scorecard (customer-only)

Every route validates with Zod, enforces authn + authz, emits events on mutations.

#### Task 7 — Frontend: Schedule interview flow

Build `/submissions/[id]/schedule-interview` page (customer-only):

**Flow:**

**Step 1: Choose interview type**
- Radio group: "Platform interviewer" vs "I'll conduct this myself"

**Step 2: If platform interviewer selected:**
- Browse available interviewers (fetch from profile-svc: `GET /api/v1/interviewers?specializations=[techStack]&available=true`)
- Filter by specialization (match requirement's tech stack)
- Show: interviewer name, specializations, rating, per-interview fee, available slots
- Select interviewer + time slot

**Step 3: If self-conduct:**
- Date/time picker (customer picks when they're available)

**Step 4: Confirm and schedule**
- POST to `/api/v1/interviews`
- On success: redirect to `/submissions/[id]` with "Interview scheduled" toast

#### Task 8 — Frontend: Video call interface

Build `/interviews/[id]/call` page (authenticated participants only):

**Layout:**
- Full-screen Daily.co iframe embed
- Top bar: Interview title, candidate name, time remaining
- Bottom bar: Mute/unmute, camera on/off, end call button
- Side panel (optional): Notes textarea (auto-saves to local storage)

**Embed Daily.co:**
Use Daily's iframe or React SDK: https://docs.daily.co/reference/daily-react

```tsx
import { DailyProvider, useDaily } from '@daily-co/daily-react'

function VideoCall({ roomUrl }: { roomUrl: string }) {
  return (
    <DailyProvider>
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen"
        className="w-full h-full"
      />
    </DailyProvider>
  )
}
```

**Join flow:**
1. Fetch interview: `GET /api/v1/interviews/:id`
2. If `videoRoomUrl` is null → error ("Video room not ready")
3. Embed iframe with `videoRoomUrl`
4. On user joins → call `POST /api/v1/interviews/:id/start` (mark as IN_PROGRESS)
5. On user leaves → call `POST /api/v1/interviews/:id/end` (mark as COMPLETED)

#### Task 9 — Frontend: Scorecard form

Build `/interviews/[id]/scorecard` page (interviewer or customer who conducted):

**Form fields:**
- Recommendation (radio: Strong Yes → Strong No)
- Technical score (1-5 stars)
- Communication score (1-5 stars)
- Problem solving score (1-5 stars)
- Cultural fit score (1-5 stars)
- Freeform feedback (textarea, 1000 chars)
- Red flags (textarea, optional, 500 chars)
- Would you hire this candidate again? (yes/no radio)

**Submit:**
- POST to `/api/v1/scorecards`
- On success: redirect to `/interviews/:id` with "Scorecard submitted" toast

**Access control:**
- Only interviewer or customer who conducted can submit
- Once submitted, scorecard is read-only (customer can view, candidate cannot)

#### Task 10 — Frontend: Interviewer marketplace

Build `/interviewers` page (customer-only):

**Table view:**
- Columns: Name, Specializations (pills), Seniority levels covered, Interview types, Rating, Fee, Availability
- Filters: Specialization (multi-select), Interview type, Seniority level
- Click row → navigate to `/interviewers/[id]`

**Empty state:** "No interviewers match your filters. Clear filters or check back later."

**Interviewer detail page** (`/interviewers/[id]`):
- Profile: name, headline, bio, specializations, seniority levels, interview types
- Video intro (if uploaded)
- Rating + review count
- Fee per interview
- Availability calendar (7-day view)
- "Book this interviewer" button → pre-fills interviewer in schedule-interview flow

#### Task 11 — Frontend: Interviewer availability management

Build `/dashboard/interviewer/availability` (interviewer-only):

**Calendar widget:**
- 7-day horizontal calendar view
- Each day has time slots (9am-5pm in 1-hour blocks)
- Click a slot → toggle available/unavailable
- Batch save → PUT to `/api/v1/interviewers/me/availability`

**Alternative (simpler for v1):**
- Form with "Available days" (checkboxes: Mon-Sun)
- "Available hours" (start time, end time)
- Saves a recurring pattern rather than per-slot granularity

Use the simpler version unless you want full calendar UX.

#### Task 12 — Integration tests

**interview-svc tests** (Vitest + Testcontainers):
- Schedule interview with platform interviewer → verify in DB
- Schedule interview self-conduct → verify `interviewerUserId` is null
- Schedule interview for non-INTERVIEWING submission → 400
- Cancel interview as customer → verify status=CANCELLED
- Cancel interview as interviewer within 24h → verify success
- Cancel interview as interviewer >24h before → 403
- Submit scorecard as interviewer → verify in DB
- Submit scorecard as non-participant → 403
- List interviews for customer → all for their requirements visible
- List interviews for candidate → only their own visible
- Daily.co integration: createRoom (mocked) → verify room URL returned

**E2E (Playwright — optional for Sprint 5, recommended for Sprint 5.5):**
- Customer schedules interview → sees it in calendar
- Interviewer joins video call → room loads
- Interviewer submits scorecard → customer sees it

#### Task 13 — Documentation

- `services/interview-svc/README.md` — endpoints, Daily.co setup, webhooks
- Regenerate OpenAPI spec for interview-svc
- Update root `README.md` with interview flow description

---

### Definition of Done (Sprint 5)

**Functional:**
- [ ] Customer can schedule an interview (platform interviewer or self-conduct)
- [ ] Interviewer can view scheduled interviews
- [ ] Participants can join video call via embedded Daily.co
- [ ] Interview status transitions (SCHEDULED → IN_PROGRESS → COMPLETED) automatically
- [ ] Interviewer or customer can submit a scorecard post-interview
- [ ] Customer can view submitted scorecards (candidate cannot)
- [ ] Interviewer can cancel interview within 24h of scheduled time
- [ ] Interviewer can manage availability via calendar widget
- [ ] Customer can browse interviewer marketplace and filter by specialization
- [ ] `interview.scheduled.v1` event emitted
- [ ] `scorecard.submitted.v1` event emitted (for payments-svc in Sprint 7)

**Security:**
- [ ] Only participants can join the video call (room URL not publicly accessible)
- [ ] Scorecards visible only to customer (not candidate)
- [ ] Cancellation authz enforced (customer always, interviewer within 24h)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (interview-svc integration tests green)
- [ ] `pnpm build` passes (no Suspense errors)
- [ ] OpenAPI spec generated and committed for interview-svc

**Visual:**
- [ ] Schedule interview flow matches DESIGN_REFERENCE aesthetic
- [ ] Video call interface clean and full-screen
- [ ] Scorecard form uses star ratings (not just number inputs)
- [ ] Interviewer marketplace table is responsive and filterable

---

### Before you start

Produce a **written plan** covering:

1. **Checkpoint D results** — confirm build passes after Suspense fix; confirm all 8 UI smoke tests pass
2. Task ordering and dependencies (I recommend: D → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13)
3. Any ambiguities:
   - Daily.co vs Zoom vs custom WebRTC? (I recommend Daily.co — easiest API, good free tier)
   - Interviewer availability: full calendar UX vs simple recurring pattern? (I recommend simple for v1)
   - Scorecard visibility: should SRMs see scorecards? (I recommend customer-only for v1)
4. Commit estimate (expect 70–100 for this sprint — video integration + calendar UI are heavy)

**Do not code until:**
- Checkpoint D is complete (build passes + UI smoke tests done)
- You share the plan with me
- I say "proceed to Sprint 5"

This sprint is the first one with a real third-party integration (Daily.co). Test the integration early — sign up for a Daily account in Task 3 and verify room creation works before building the entire flow around it.
