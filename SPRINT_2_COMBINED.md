# Sprint 1.5 Verification → Sprint 2 (Profiles)

You completed Sprint 1.5 cleanup on branch `sprint/1.5-cleanup`. Before starting Sprint 2, you MUST complete two verification checkpoints. Sprint 2 begins **only after** both checkpoints pass.

This prompt is structured as a **gated progression**: Checkpoint A → Checkpoint B → Sprint 2. Do not skip ahead.

---

## CHECKPOINT A — Sprint 1.5 Verification (15 min)

Before merging `sprint/1.5-cleanup` to `main`, verify the two critical properties of the encryption work.

### A1. KEK fail-fast at boot

**What to test:** The encryption service loads and validates the KEK at service boot, not lazily.

**How:**

1. In `services/identity/.env`, comment out or remove `FIELD_ENCRYPTION_KEK_V1`
2. Attempt to start the service: `pnpm --filter @techorbit/identity dev`

**Expected:** Service fails to boot immediately with a clear error message referencing the missing KEK.

**If it boots anyway:** STOP. The encryption service is lazy-loading the KEK, which means a misconfigured production deploy will silently accept 2FA setups, encrypt secrets with a broken/missing key, and lock users out. Fix this before proceeding:
- The `EncryptionService` constructor (or factory) must validate the KEK exists and is valid (32 bytes when base64-decoded)
- The identity service's `server.ts` must call this during boot, not on first use
- Add a unit test: `EncryptionService` with missing KEK throws immediately

**Once fixed:** Restore the KEK to `.env`, verify the service boots cleanly, commit the fix.

### A2. Integration tests exercise encrypted 2FA flow

**What to test:** The 2FA integration tests pass AND actually store encrypted secrets in the DB.

**How:**

1. Ensure Docker is up: `docker-compose up -d`
2. Run identity integration tests: `pnpm --filter @techorbit/identity test`
3. Specifically look for tests covering 2FA setup and verify — they should pass
4. While tests are running (or after), inspect the DB:
   ```bash
   docker-compose exec postgres psql -U postgres -d techorbit -c \
     "SELECT id, email, two_fa_secret_encrypted FROM identity.\"User\" WHERE two_fa_secret_encrypted IS NOT NULL LIMIT 3;"
   ```

**Expected:** The `two_fa_secret_encrypted` column contains JSON like:
```json
{"ciphertext":"A1b2C3...","iv":"D4e5F6...","authTag":"G7h8...","keyId":"v1","version":1}
```

**If it's a plaintext base32 string:** STOP. The encryption wiring failed. The repository or service layer is bypassing encryption. Debug and fix before proceeding.

**Once verified:** Commit any fixes. Merge `sprint/1.5-cleanup` to `main`.

---

## CHECKPOINT B — Playwright E2E Verification (30 min)

Verify the full onboarding flow works end-to-end against the real stack.

### B1. Manual smoke test (prerequisite)

Before running Playwright, do a quick manual click-through. If something is fundamentally broken, Playwright will just timeout cryptically.

**Bring up the full stack** (3 terminals):

```bash
# Terminal 1
docker-compose up -d

# Terminal 2
pnpm dev
# Wait for all services to print "listening on port..."

# Terminal 3
# (leave open for Playwright later)
```

**Manual checks** (do all 8):

1. **Open `http://localhost:3000`** — page loads with forest green + cream aesthetic (not default Next.js blue/white)
2. **Sign up** with `test-manual@example.com` / `TestPassword123!` — redirects to role selection or email verification
3. **Check Mailpit** at `http://localhost:8025` — welcome/verification email appears
4. **Check RabbitMQ** at `http://localhost:15672` (guest/guest) → Queues tab — `user.registered.v1` event visible
5. **Check Postgres:**
   ```bash
   docker-compose exec postgres psql -U postgres -d techorbit -c \
     "SELECT id, email, status FROM identity.\"User\" WHERE email = 'test-manual@example.com';"
   ```
   User exists with status `ACTIVE`.

6. **Log out, log back in** — reaches dashboard
7. **Protected route redirect** — in an incognito window, navigate to `http://localhost:3000/dashboard` → redirects to `/login`
8. **Refresh token rotation (optional but recommended)** — in DevTools → Application → Cookies, confirm `refresh_token` exists and is httpOnly

**If ANY of these fail:** STOP. Fix the broken flow before running Playwright. Playwright automates these same steps; if they fail manually, Playwright can't pass.

### B2. Install Playwright (first time only)

```bash
pnpm --filter @techorbit/web e2e:install
```

### B3. Run Playwright suite

```bash
# In Terminal 3, with the stack still running:
pnpm --filter @techorbit/web e2e

# Or, to watch what's happening:
# pnpm --filter @techorbit/web e2e --headed
```

### B4. Interpret results

**✅ All green:** All specs pass. Proceed to Sprint 2 below.

**🟡 Some tests fail:**
- If tests fail with "element not found" or "timeout" — likely selector mismatches or timing issues. Debug using `--headed` mode to watch what's happening.
- Common causes: test selectors don't match rendered HTML, async redirects taking longer than expected, test data doesn't match UI expectations.
- Fix selectors and timing issues. Do NOT just increase timeouts blindly — find the real cause.

**🔴 Tests reveal a real bug** (e.g., registration doesn't create user, login succeeds but session isn't created, refresh revokes current session):
- Reproduce manually via `curl` or browser
- Write a failing unit/integration test that captures the bug
- Fix the bug
- Verify the test passes
- Verify Playwright now passes

**Do not proceed to Sprint 2 until Playwright is green.**

---

## SPRINT 2 — Profiles

**Prerequisites:** Checkpoints A and B above are complete and green.

Branch: Start from `main` (with 1.5 merged) on a new branch `sprint/2-profiles`.

### Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.3 (profile schema) — Candidate, MSME, Customer, Interviewer profiles
   - Section 6 (events) — `candidate.profile_completed.v1`, etc.
   - Section 7.2 (profile-svc API)
3. `PRD.md` Section 3 (Personas) and Section 5.1.2 (role-specific verification)
4. `DESIGN_REFERENCE.md` — for profile forms

### Sprint 2 scope

Build the profile service and all profile UIs. After Sprint 1 (auth + onboarding), users have accounts and roles. Sprint 2 gives them **full profiles** so they can participate in the marketplace.

**Backend (profile-svc):** CRUD for Candidate, MSME, Customer Company, and Interviewer profiles. Event-driven: consume `user.registered.v1` to create shell profiles; emit `candidate.profile_completed.v1` when profiles are filled.

**Frontend (apps/web):** Multi-step profile forms for each role, with role-specific fields, file uploads (resume, contracts), and verification steps (KYC, LinkedIn, W-9).

**Third-party integrations (mocked for now):**
- Persona (ID verification for Candidates)
- LinkedIn OAuth (for CRM/SRM/Interviewer verification)
- File storage (S3 via file-svc, already scaffolded)

Do NOT build the actual matching or job-posting features yet — that's Sprint 3. This sprint ends at "every role has a complete profile and can see a personalized dashboard."

---

### Sprint 2 task breakdown

#### Task 1 — Prisma schema for profile-svc

Implement `services/profile-svc/prisma/schema.prisma` per ENGINEERING_SPEC Section 5.3:
- `CandidateProfile`
- `MsmeProfile`
- `MsmeBenchEntry`
- `CustomerCompanyProfile`
- `InterviewerProfile`
- All enums: `Seniority`, `BackgroundCheckStatus`, `BenchAvailability`, `CompanySizeRange`, `CustomerStatus`, `InterviewType`, `CalendarProvider`, `InterviewerStatus`, `MsmeStatus`
- Schema name: `profile`
- Indexes on all foreign keys + frequently queried fields (userId, msmeId, status)

Generate migration. Apply to local DB.

#### Task 2 — Shared types

In `packages/types/`:
- Profile request/response schemas for all 4 profile types
- Profile event schemas: `candidate.profile_completed.v1`, `msme.profile_created.v1`, etc.
- File upload schemas (resume, W-9, contracts, video intro)

#### Task 3 — Repository layer (profile-svc)

In `services/profile-svc/src/repositories/`:
- `candidate.repository.ts` — CRUD + `findByUserId`, `updateBackgroundCheckStatus`, `updateAverageRating`
- `msme.repository.ts` — CRUD + `findByOwnerUserId`, `listBenchEntries`, `addBenchEntry`, `removeBenchEntry`
- `customer.repository.ts` — CRUD + `findByPrimaryUserId`, `updateAttributedCrm`
- `interviewer.repository.ts` — CRUD + `findByUserId`, `updateCalendarRefreshToken`, `updateStripeAccountId`

Every repository method enforces authz: users can only read/write their own profiles (or profiles they own via MSME/Customer relationship).

#### Task 4 — Service layer

- `candidate.service.ts` — profile CRUD, trigger background check (call Checkr API or mock), update ratings from event
- `msme.service.ts` — profile CRUD, bench management, link candidates to bench
- `customer.service.ts` — profile CRUD, CRM attribution logic
- `interviewer.service.ts` — profile CRUD, calendar integration helpers (Google/Outlook OAuth state management), Stripe Connect onboarding

#### Task 5 — Event consumers

Profile-svc consumes these events from identity-svc:
- `user.registered.v1` → create shell profile based on the user's role (Candidate gets a `CandidateProfile` with just userId filled; MSME gets `MsmeProfile`, etc.)
- `user.role_added.v1` → if a user adds a second role, create the corresponding profile shell

Set up RabbitMQ subscriber via `@techorbit/event-bus`. Wire into profile-svc startup.

**Test this:** Register a new user in identity-svc → verify profile-svc creates the shell profile automatically.

#### Task 6 — API routes

Implement ENGINEERING_SPEC Section 7.2 endpoints:

**Candidate:**
- `GET /api/v1/candidates/:id`
- `PATCH /api/v1/candidates/me`
- `POST /api/v1/candidates/me/resume` (multipart upload → delegates to file-svc)
- `POST /api/v1/candidates/me/kyc/start` (returns Persona session URL, or mocks success if Persona not configured)

**MSME:**
- `POST /api/v1/msmes`
- `GET /api/v1/msmes/:id`
- `PATCH /api/v1/msmes/:id`
- `GET /api/v1/msmes/:id/bench`
- `POST /api/v1/msmes/:id/bench` (add candidate to bench)
- `DELETE /api/v1/msmes/:id/bench/:entryId`

**Customer:**
- `POST /api/v1/customer-companies`
- `GET /api/v1/customer-companies/:id`
- `PATCH /api/v1/customer-companies/:id`
- `POST /api/v1/customer-companies/:id/attribute-crm` (customer initiates CRM attribution; requires approval flow)

**Interviewer:**
- `POST /api/v1/interviewers`
- `GET /api/v1/interviewers/:id`
- `PATCH /api/v1/interviewers/me`
- `POST /api/v1/interviewers/me/calendar/connect` (OAuth to Google/Outlook)
- `GET /api/v1/interviewers/me/availability?from=&to=`
- `POST /api/v1/interviewers/me/availability` (set available slots)

Every route validates with Zod, enforces authn + authz, emits events on mutations.

#### Task 7 — Frontend: Profile forms

Build multi-step profile forms for each role at:
- `/onboarding/candidate`
- `/onboarding/msme`
- `/onboarding/customer`
- `/onboarding/interviewer`

**Form structure (all roles):**
- Step 1: Basic info (name, headline, location)
- Step 2: Role-specific details
- Step 3: Verification (KYC, documents, LinkedIn)
- Step 4: Review & submit

**Candidate form specifics:**
- Skills (multi-select tags from controlled vocabulary)
- Seniority (dropdown)
- Work authorization (dropdown + expiry date if applicable)
- Availability date
- Resume upload (drag-drop)
- Rate range (min/max sliders)
- Location preferences (onsite/hybrid/remote checkboxes + city/state if onsite/hybrid)
- KYC launch button (opens Persona modal or mocks success)

**MSME form specifics:**
- Legal entity name, DBA
- EIN (US) or GSTIN (India)
- Country of incorporation
- Website
- Years in business, total employees, current bench size
- Upload W-9 or W-8BEN-E
- Primary contact info

**Customer form specifics:**
- Company legal name, DBA
- EIN
- Industry (dropdown)
- Company size range (dropdown)
- Website
- Billing address (structured: street, city, state, zip, country)
- Default net terms (dropdown: net-15, net-30, net-45, net-60)

**Interviewer form specifics:**
- Display name, headline, bio
- Current role & company (text fields)
- Specializations (multi-select: tech stacks)
- Seniority levels coverable (multi-select: Junior, Mid, Senior, Staff, Principal)
- Interview types (multi-select: Technical Coding, System Design, Behavioral, etc.)
- Per-interview fee (USD input)
- Timezone (dropdown)
- Video intro upload (optional, mp4/webm)
- LinkedIn verification (OAuth button)
- Calendar connection (Google/Outlook OAuth buttons)

All forms:
- Use `@techorbit/ui` components
- Show progress indicator (4 steps)
- Validate per-step before allowing next
- Save draft state to API on each step completion
- Final submit emits `profile_completed` event

#### Task 8 — Frontend: Dashboard updates

Update `/dashboard` to show role-specific content:

**Candidate dashboard:**
- Profile completion progress card
- "Ready to work" toggle (sets availability date to today)
- Placeholder for "Matching opportunities" (Sprint 3)

**MSME dashboard:**
- Profile completion progress
- Bench roster card (table: candidate name, availability, expected rate)
- "Add to bench" button
- Placeholder for "Active submissions" (Sprint 3)

**Customer dashboard:**
- Profile completion progress
- "Post a requirement" button (disabled with tooltip: "Available in Sprint 3")
- Placeholder for "Active requirements" (Sprint 3)

**Interviewer dashboard:**
- Profile completion progress
- Availability calendar widget (shows next 7 days, editable)
- Earnings summary (upcoming, pending payout, total earned — all $0 for now)
- Placeholder for "Scheduled interviews" (Sprint 5)

**CRM/SRM dashboard:**
- Profile completion progress (LinkedIn verification)
- Commission summary placeholder
- "Invite customer" / "Invite candidate" buttons (trigger invite-link generation)

#### Task 9 — File-svc integration

The file-svc was scaffolded in Sprint 0 but has no implementation yet. For Sprint 2, implement **minimal file handling**:

**Backend (file-svc):**
- `POST /api/v1/files/upload-url` — generates presigned S3 PUT URL (or local file path if S3 not configured)
- `POST /api/v1/files/:id/confirm` — marks file as finalized in DB, runs virus scan (mocked for now)
- `GET /api/v1/files/:id/download-url` — generates presigned S3 GET URL (or serves from local)

**Prisma schema (file-svc):**
```prisma
model File {
  id          String   @id @default(uuid())
  uploadedBy  String   // userId
  filename    String
  contentType String
  sizeBytes   Int
  purpose     FilePurpose
  s3Key       String?  // if using S3
  localPath   String?  // if using local storage
  status      FileStatus @default(PENDING)
  virusScanResult String?
  createdAt   DateTime @default(now())
  @@schema("file")
}
enum FilePurpose { RESUME, CONTRACT, W9, VIDEO_INTRO, PROFILE_PHOTO }
enum FileStatus { PENDING, CONFIRMED, VIRUS_DETECTED, DELETED }
```

**Local storage fallback:** If `AWS_S3_BUCKET` is not set, store files in `/home/claude/file-storage/` and serve via static file handler. Add `.env` flag `FILE_STORAGE_MODE=local|s3`.

**Frontend:**
- `packages/ui` gets a `<FileUpload>` component (drag-drop + progress bar)
- On drop: call `/upload-url`, PUT to presigned URL (or local endpoint), call `/confirm`, display success/error

#### Task 10 — Integration tests

**profile-svc tests** (Vitest + Testcontainers):
- Create candidate profile → verify in DB
- Update candidate profile → verify changes persisted
- Add candidate to MSME bench → verify `MsmeBenchEntry` created
- Event consumer: emit `user.registered.v1` with role=CANDIDATE → verify shell `CandidateProfile` created
- Authz: user A cannot read user B's candidate profile

**file-svc tests:**
- Upload flow: request URL → PUT file → confirm → verify status=CONFIRMED
- Download URL generation
- Virus scan (mocked) marks file as VIRUS_DETECTED

**E2E (Playwright):**
- Sign up → complete candidate profile → reach dashboard showing "Profile complete"
- Sign up → complete MSME profile → add a candidate to bench → verify bench roster visible

#### Task 11 — Documentation

- `services/profile-svc/README.md` — endpoints, event consumers, local run
- `services/file-svc/README.md` — upload flow, storage modes
- Regenerate OpenAPI specs for both services
- Update root `README.md` with profile onboarding flow description

---

### Definition of Done (Sprint 2)

**Functional:**
- [ ] A Candidate can complete their profile (all steps) and reach a dashboard showing profile completion
- [ ] An MSME can complete their profile and add candidates to their bench roster
- [ ] A Customer can complete their company profile
- [ ] An Interviewer can complete their profile and set availability
- [ ] File uploads work (resume, W-9, video intro) via the file-svc flow
- [ ] Event consumer: new user registration auto-creates shell profile in profile-svc
- [ ] All 4 role dashboards render with role-specific content (even if placeholders)

**Security:**
- [ ] Users cannot read/edit other users' profiles (authz enforced at repository layer)
- [ ] File uploads go through presigned URLs (no direct file POST to service)
- [ ] Virus scan hook exists (even if mocked)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (profile-svc + file-svc integration tests green)
- [ ] Playwright E2E suite passes (Sprint 1 flows + Sprint 2 profile completion flows)

**Visual:**
- [ ] Profile forms match DESIGN_REFERENCE aesthetic
- [ ] Progress indicators clear and accurate
- [ ] Form validation errors specific and helpful
- [ ] Mobile-responsive (test at 375px width)

---

### Before you start

Produce a **written plan** covering:

1. Your task ordering and dependencies (I recommend: 1 → 2 → 9 → 3 → 4 → 5 → 6 → 7 → 8 → 10 → 11, so file-svc is ready before profile forms need it)
2. Checkpoints A and B verification results (paste the actual output — KEK test result, Playwright results)
3. Any ambiguities:
   - CRM attribution approval flow (how does customer approve?)
   - Persona integration depth (just mock success, or actually integrate the SDK?)
   - Calendar OAuth scopes (read-only or read-write?)
4. Commit estimate (expect 60–100 for this sprint)

**Do not start coding until:**
- You've run Checkpoints A and B
- You've shared the results with me
- I say "proceed to Sprint 2"

This ensures we don't build Sprint 2 on a broken Sprint 1 foundation.
