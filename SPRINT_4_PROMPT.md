# Sprint 4 — Matching & Submissions

You completed Sprint 3.5 (FK fix + OpenAPI). Branch: continue on `sprint/3-requirements` or create `sprint/4-matching` (your call — I recommend a new branch for clean sprint boundaries).

This sprint makes the marketplace **transactional**. Candidates, SRMs, and MSMEs can submit to requirements. Customers see scored submissions in a shortlist UI. The matching engine ranks candidates by fit.

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.5 (matching schema — Submission, MatchingSignal)
   - Section 6.2 (events — `submission.created.v1`, `requirement.published.v1` consumption)
   - Section 7.4 (matching-svc API)
   - Section 8.1 (Flow: Post Requirement → Shortlist)
3. `PRD.md`:
   - Section 4.3 (Submission lifecycle)
   - Section 6.3 (SRM attribution rules)
4. `DESIGN_REFERENCE.md` — for the shortlist kanban UI

---

## Sprint 4 scope

Build the **matching service** and **submission flows**. After Sprint 3, requirements exist. After Sprint 4, candidates can apply, and customers can manage a shortlist.

**Backend (matching-svc):**
- Rule-based matching engine (scores candidates 0-100 based on skills/seniority/location/work auth)
- Submission CRUD (create, read, update status, withdraw)
- Event-driven: consume `requirement.published.v1`, pre-compute candidate scores, store in `MatchingSignal`

**Frontend (apps/web):**
- Submit flow (candidate/SRM/MSME can submit a candidate to a requirement)
- Shortlist kanban board (customer view: columns for Submitted/Screening/Interviewing/Offer/Rejected)
- Submission detail page (candidate profile summary + cover note + match score)

Do NOT build interviews yet — that's Sprint 5. This sprint ends at "customers see submissions and can move them through stages."

---

## Task breakdown

### Task 1 — Prisma schema for matching-svc

Implement `services/matching-svc/prisma/schema.prisma` per ENGINEERING_SPEC Section 5.5:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["matching"]
}

model Submission {
  id                    String   @id @default(uuid())
  requirementId         String
  candidateId           String   // FK to profile.CandidateProfile (cross-schema)
  submittedByUserId     String   // who clicked submit (candidate self, SRM, MSME rep)
  submitterRole         SubmitterRole
  attributedSrmId       String?  // if SRM submitted, they get attributed
  attributedMsmeId      String?  // if MSME submitted, they get attributed
  status                SubmissionStatus @default(SUBMITTED)
  matchScore            Int?     // 0-100, filled by matching engine
  coverNote             String?  @db.Text
  proposedBillRate      Decimal?
  withdrawnAt           DateTime?
  withdrawnReason       String?
  rejectedAt            DateTime?
  rejectionReason       String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([requirementId, candidateId])  // one submission per candidate per req
  @@index([status, createdAt])
  @@index([requirementId, status])
  @@index([candidateId])
  @@schema("matching")
}

enum SubmitterRole {
  CANDIDATE_SELF
  SRM
  MSME
  @@schema("matching")
}

enum SubmissionStatus {
  SUBMITTED
  SCREENING
  INTERVIEWING
  OFFER
  PLACED
  REJECTED
  WITHDRAWN
  @@schema("matching")
}

model MatchingSignal {
  id                String   @id @default(uuid())
  requirementId     String
  candidateId       String
  skillOverlap      Int      // count of matching skills
  seniorityMatch    Boolean
  locationMatch     Boolean
  workAuthMatch     Boolean
  candidateRating   Decimal  // from CandidateProfile.averageRating
  matchScore        Int      // computed final score 0-100
  computedAt        DateTime @default(now())

  @@unique([requirementId, candidateId])
  @@index([requirementId, matchScore])  // for ranked lists
  @@schema("matching")
}

model OutgoingEvent {
  id        String   @id @default(uuid())
  eventType String
  payload   Json
  status    OutgoingEventStatus @default(PENDING)
  attempts  Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  @@schema("matching")
}

enum OutgoingEventStatus {
  PENDING
  PUBLISHED
  FAILED
  @@schema("matching")
}
```

**Key decisions:**
- `@@unique([requirementId, candidateId])` — a candidate can only submit once per requirement (prevents duplicate spam)
- `submitterRole` tracks WHO submitted (candidate self vs SRM vs MSME) for attribution
- `attributedSrmId` / `attributedMsmeId` — the SRM/MSME who submitted gets credit (commission in Sprint 7)
- `matchScore` on Submission can differ from MatchingSignal (customer might override the auto-score)

Generate migration. Apply locally.

### Task 2 — Shared types

In `packages/types/`:
- `SubmissionRequestSchema` (for POST)
- `UpdateSubmissionStatusSchema` (for PATCH status transitions)
- `WithdrawSubmissionSchema` (reason field)
- `SubmissionResponseSchema` (for GET)
- `SubmissionListResponseSchema`
- `MatchingSignalResponseSchema`
- Event: `submission.created.v1` schema

Add enums to `enums.ts`: `SubmitterRole`, `SubmissionStatus`

### Task 3 — Matching engine (business logic)

In `services/matching-svc/src/services/matching.service.ts`:

**Core function: `computeMatchScore(requirement, candidate): number`**

Scoring algorithm (simple rule-based for v1):

```ts
function computeMatchScore(requirement: Requirement, candidate: CandidateProfile): number {
  let score = 0;

  // 1. Skills overlap (max 40 points)
  const requiredSkills = new Set(requirement.techStack);
  const candidateSkills = new Set(candidate.primarySkills.concat(candidate.secondarySkills));
  const overlap = [...requiredSkills].filter(s => candidateSkills.has(s)).length;
  const skillScore = Math.min(40, (overlap / requiredSkills.size) * 40);
  score += skillScore;

  // 2. Seniority match (20 points if exact, 10 if ±1 level)
  const seniorityLevels = ['JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL'];
  const reqLevel = seniorityLevels.indexOf(requirement.seniority);
  const candLevel = seniorityLevels.indexOf(candidate.seniority);
  if (reqLevel === candLevel) score += 20;
  else if (Math.abs(reqLevel - candLevel) === 1) score += 10;

  // 3. Location match (15 points)
  if (requirement.locationType === 'REMOTE' || candidate.remoteOk) score += 15;
  else if (requirement.locationType === 'ONSITE' && candidate.onsiteOk && 
           requirement.locationCity === candidate.locationCity) score += 15;
  else if (requirement.locationType === 'HYBRID' && candidate.hybridOk) score += 10;

  // 4. Work authorization (15 points)
  if (requirement.workAuthPrefs.includes(candidate.workAuth)) score += 15;

  // 5. Candidate rating (10 points)
  // Scale 0-5 rating to 0-10
  score += (candidate.averageRating / 5) * 10;

  return Math.round(score);
}
```

**Background job: `precomputeMatches(requirementId)`**

When a requirement is published, fetch all active candidates from profile-svc, compute scores, insert `MatchingSignal` rows. This makes browsing fast (pre-computed scores, not computed on-demand).

Call this from the event consumer (see Task 4).

### Task 4 — Event consumer

In `services/matching-svc/src/events/requirement-published.consumer.ts`:

Subscribe to `requirement.published.v1` from RabbitMQ. On receipt:
1. Fetch the requirement details from requirement-svc
2. Fetch all active candidates from profile-svc (paginated if needed)
3. For each candidate, call `computeMatchScore`, insert `MatchingSignal`
4. Log completion

**Deduplication:** Use an incoming-events table with `@@unique([eventId])` to prevent double-processing.

Wire this consumer into `server.ts` startup.

### Task 5 — Repository layer

In `services/matching-svc/src/repositories/`:

**submission.repository.ts:**
- `create(data, authContext)` — authz: candidate self, SRM, MSME
- `findById(id, authContext)` — visibility: submitter, requirement owner, attributed SRM/MSME
- `findByRequirement(requirementId, authContext)` — customer sees all; candidate sees only their own
- `updateStatus(id, newStatus, authContext)` — authz: only requirement owner (customer)
- `withdraw(id, reason, authContext)` — authz: only submitter
- `list(filters, pagination, authContext)` — supports: requirementId, candidateId, status, submitterRole

**matching-signal.repository.ts:**
- `upsert(requirementId, candidateId, signals)` — called by matching engine
- `findForRequirement(requirementId, limit)` — returns top N by matchScore
- `findForCandidate(candidateId)` — which requirements match this candidate?

### Task 6 — Service layer

In `services/matching-svc/src/services/submission.service.ts`:

- `createSubmission(data, authContext)` — validates:
  - Requirement is OPEN (not DRAFT/CLOSED)
  - Candidate has a complete profile
  - No duplicate submission already exists
  - Submitter is authorized (candidate self, or SRM, or MSME with candidate on bench)
  - Sets `attributedSrmId` if submitter is SRM
  - Sets `attributedMsmeId` if submitter is MSME
  - Fetches or computes `matchScore` from MatchingSignal
  - Emits `submission.created.v1`

- `updateSubmissionStatus(id, newStatus, authContext)` — only requirement owner can change status

- `withdrawSubmission(id, reason, authContext)` — only submitter can withdraw

### Task 7 — API routes

Implement ENGINEERING_SPEC Section 7.4 endpoints:

- `POST /api/v1/submissions` — create submission (body: `{ requirementId, candidateId, coverNote?, proposedBillRate? }`)
- `GET /api/v1/submissions/:id` — get single submission (visibility-filtered)
- `GET /api/v1/submissions` — list submissions (query: `?requirementId=&candidateId=&status=&cursor=&limit=`)
- `PATCH /api/v1/submissions/:id/status` — update status (body: `{ status }`)
- `POST /api/v1/submissions/:id/withdraw` — withdraw submission (body: `{ reason }`)
- `GET /api/v1/matches/for-requirement/:reqId` — get top matches for a requirement (returns MatchingSignal list)

Every route validates with Zod, enforces authn + authz, emits events on mutations.

### Task 8 — Frontend: Submit candidate flow

Build `/requirements/[id]/submit` page (candidate/SRM/MSME view):

**Form fields:**
- Candidate selection:
  - If candidate self-submitting: pre-filled, read-only
  - If SRM submitting: dropdown of their network (fetch from a future "my candidates" API — for Sprint 4, just free-text input of candidateId or skip this; Sprint 5 will add proper candidate selection)
  - If MSME submitting: dropdown of bench candidates (fetch from `GET /api/v1/msme/me/bench`)
- Cover note (textarea, 500 chars)
- Proposed bill rate (optional, number input)

**Submission:**
- POST to `/api/v1/submissions`
- On success: redirect to `/requirements/[id]` with "Submission successful" toast
- On 409 (duplicate): show "You've already submitted to this requirement"

**Visibility:**
- Button on requirement detail page: "Submit candidate" (visible to candidates/SRMs/MSMEs)
- Disabled if requirement is not OPEN

### Task 9 — Frontend: Shortlist kanban board

Build `/requirements/[id]/shortlist` page (customer-only):

**Layout:**
- Horizontal kanban board with columns: Submitted, Screening, Interviewing, Offer, Placed, Rejected, Withdrawn
- Each column shows submission cards (candidate name, match score, skills pills, submitted date)
- Drag-and-drop between columns → PATCH status
- Click card → navigate to `/submissions/[id]`

**Implementation:**
- Use `@dnd-kit/core` for drag-and-drop (or `react-beautiful-dnd` if you prefer)
- Fetch submissions: `GET /api/v1/submissions?requirementId={id}`
- Group by status client-side
- On drop: `PATCH /api/v1/submissions/:id/status` with new status

**Empty states:**
- If no submissions yet: "No submissions yet. Share this requirement to attract candidates."

### Task 10 — Frontend: Submission detail page

Build `/submissions/[id]` page (authenticated users, visibility-filtered):

**Layout:**
- Header: Candidate name, match score badge (0-100 with color: green 80+, yellow 50-79, red <50), status badge
- Section 1: Match breakdown (skills match, seniority match, location match, work auth match — fetch this from `/api/v1/matches/for-requirement/:reqId` and find the candidate's MatchingSignal)
- Section 2: Cover note (if provided)
- Section 3: Proposed bill rate (if provided)
- Section 4: Candidate profile summary (fetch from profile-svc: skills, seniority, location, years of experience, resume link)
- Actions (role-dependent):
  - Customer: Move to [status] buttons, Reject button
  - Submitter: Withdraw button
  - Others: read-only

**Visibility:**
- If viewer is not authorized (not owner, not submitter, not attributed SRM/MSME), return 403

### Task 11 — Integration tests

**matching-svc tests** (Vitest + Testcontainers):
- Create submission as candidate → verify in DB
- Create submission as SRM → verify `attributedSrmId` set
- Create submission as MSME → verify `attributedMsmeId` set
- Duplicate submission → 409 Conflict
- Submit to non-OPEN requirement → 400
- Update submission status as customer → verify status change
- Update submission status as non-owner → 403
- Withdraw submission as submitter → verify `withdrawnAt` + `withdrawnReason`
- Withdraw submission as non-submitter → 403
- List submissions for requirement as customer → all visible
- List submissions for requirement as candidate → only own visible
- Matching engine: compute score → verify skills/seniority/location/workAuth weights
- Event consumer: `requirement.published.v1` → verify MatchingSignal rows created

**E2E (Playwright — optional for Sprint 4, recommended for Sprint 4.5):**
- Candidate submits to requirement → sees success toast
- Customer views shortlist → drags submission to Screening → status updates
- Customer views submission detail → sees match score + candidate profile

### Task 12 — Documentation

- `services/matching-svc/README.md` — endpoints, matching algorithm, event consumers
- Regenerate OpenAPI spec for matching-svc (follow Sprint 3.5 pattern)
- Update root `README.md` with submission flow description

---

## Definition of Done (Sprint 4)

**Functional:**
- [ ] A candidate can submit to a published requirement via the UI
- [ ] An SRM can submit a candidate (with attribution)
- [ ] An MSME can submit a bench candidate (with attribution)
- [ ] Duplicate submissions are prevented (409 error)
- [ ] Customer can view shortlist kanban board with submissions grouped by status
- [ ] Customer can drag-and-drop to change submission status
- [ ] Submission detail page shows match score + candidate profile summary
- [ ] Submitter can withdraw a submission with a reason
- [ ] Matching engine computes scores based on skills/seniority/location/workAuth
- [ ] `requirement.published.v1` event triggers pre-computation of MatchingSignal rows

**Security:**
- [ ] Only requirement owner can change submission status
- [ ] Only submitter can withdraw
- [ ] Visibility enforced: candidates see only their own submissions; customers see all for their reqs
- [ ] Attribution integrity: SRM/MSME attribution set at submission time, immutable

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (matching-svc integration tests green)
- [ ] OpenAPI spec generated and committed for matching-svc

**Visual:**
- [ ] Shortlist kanban matches DESIGN_REFERENCE aesthetic (forest green, cream, rounded cards)
- [ ] Match score badges color-coded (green/yellow/red)
- [ ] Drag-and-drop smooth and responsive

---

## Before you start

Produce a **written plan** covering:

1. Task ordering and dependencies (I recommend: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12)
2. Any ambiguities:
   - SRM candidate selection UX (how does an SRM pick which candidate to submit if they have 50 in their network?)
   - Matching algorithm weights (40/20/15/15/10 split seems reasonable? or different?)
   - Drag-and-drop library choice (@dnd-kit vs react-beautiful-dnd — I recommend @dnd-kit, it's more maintained)
3. Cross-service call pattern:
   - matching-svc → profile-svc to fetch candidate profiles (direct HTTP like requirement-svc does? or cache?)
   - matching-svc → requirement-svc to fetch requirement details (for the event consumer)
4. Commit estimate (expect 60–90 for this sprint)

**Do not code until I say "proceed to Sprint 4."**

This sprint is heavier than Sprint 3 — it involves event-driven async processing, a scoring algorithm, and a kanban UI. Take your time. The quality of the matching engine directly impacts user trust in the marketplace.
