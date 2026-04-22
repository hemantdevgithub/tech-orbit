# Sprint 2 Summary — Profile, File, Shared Types, and Role Dashboards

**Branch:** `sprint/1-identity` (Sprint 2 work built on top of Sprint 1)
**Status:** Complete — all quality gates passing

---

## What Was Built

### Task 1 — `packages/types`: Profile schemas

Extended `packages/types/src/profile.ts` with all profile-domain Zod schemas:
- `CandidateProfileResponseSchema`, `UpdateCandidateProfileSchema`
- `MsmeProfileResponseSchema`, `CreateMsmeProfileSchema`, `UpdateMsmeProfileSchema`
- `CustomerCompanyProfileResponseSchema`, `CreateCustomerCompanySchema`
- `InterviewerProfileResponseSchema`, `CreateInterviewerProfileSchema`
- `SetAvailabilitySchema`, `AvailabilitySlotSchema`
- `StartKycResponseSchema`
- `CandidateBenchEntrySchema`, `AddBenchEntrySchema`
- `FileUploadUrlRequestSchema`, `FileUploadUrlResponseSchema`, `FileResponseSchema`
- Event schemas: `CandidateProfileCompletedEventSchema`, `MsmeProfileCreatedEventSchema`

All types derived via `z.infer` and re-exported from `packages/types/src/index.ts`.

### Task 2 — `services/profile`: Profile service

Full Fastify microservice at `http://localhost:3004` with:

**Candidate routes** (`/api/v1/candidates/me`, `/api/v1/candidates/:userId`):
- `PATCH /api/v1/candidates/me` — upsert profile (all fields optional)
- `GET /api/v1/candidates/me` — get own profile (404 if none)
- `GET /api/v1/candidates/:userId` — admin-only or owner-only access
- `POST /api/v1/candidates/me/kyc/start` — mock KYC session

**MSME routes** (`/api/v1/msme/me`, `/api/v1/msme/me/bench`):
- `POST /api/v1/msme/me` — create MSME profile; EIN encrypted with AES-256-GCM
- `PATCH /api/v1/msme/me` — update profile; EIN re-encrypted on change
- `GET /api/v1/msme/me` — get own profile (hasEin derived from encrypted field)
- `POST /api/v1/msme/me/bench` — add bench entry (tracks candidateUserId, skills, rate range)
- `DELETE /api/v1/msme/me/bench/:entryId` — remove bench entry

**Customer routes** (`/api/v1/customers/me`):
- `POST /api/v1/customers/me` — create company profile; EIN encrypted
- `PATCH /api/v1/customers/me` — update profile
- `GET /api/v1/customers/me` — get own profile
- `PATCH /api/v1/customers/:userId/attribution` — admin/CRM attribute a customer

**Interviewer routes** (`/api/v1/interviewers/me`):
- `POST /api/v1/interviewers/me` — create interviewer profile
- `PATCH /api/v1/interviewers/me` — update profile
- `GET /api/v1/interviewers/me` — get own profile
- `PUT /api/v1/interviewers/me/availability` — set availability slots (stored as JSON)

**Prisma schema** (`services/profile/prisma/schema.prisma`):
- `CandidateProfile`, `MsmeProfile`, `MsmeBenchEntry`, `CustomerCompanyProfile`, `InterviewerProfile`
- Custom output: `output = "../src/generated/client"` (avoids pnpm monorepo client collision)
- Migration: `20260423000000_init_profile_schema`

**Service architecture:**
- `candidateRepository`, `msmeRepository`, `customerRepository`, `interviewerRepository` — data layer
- `candidateService` (singleton), `createMsmeService(encryptionService)`, `createCustomerService(encryptionService)` — business logic with DI for encryption
- `user-events.consumer.ts` — listens on RabbitMQ for `user.registered.v1` and `user.role_added.v1`; auto-provisions CANDIDATE and INTERVIEWER shell profiles

### Task 9 — `services/file`: File service

Fastify microservice at `http://localhost:3003` for file lifecycle management:

**Routes:**
- `POST /api/v1/files/upload-url` — validates content type vs. purpose, creates DB record, returns upload URL
- `PUT /api/v1/files/:id/upload` — binary body upload (local mode); registered `application/octet-stream` parser
- `POST /api/v1/files/:id/confirm` — runs mock virus scan, marks status `CONFIRMED`
- `GET /api/v1/files/:id` — file metadata (owner-only)
- `GET /api/v1/files/:id/download-url` — returns serve URL (local) or S3 presigned URL
- `GET /api/v1/files/:id/serve` — streams file from local disk

**Content type allow-list:**
| Purpose | Allowed |
|---------|---------|
| RESUME | pdf, doc, docx |
| CONTRACT | pdf |
| W9 | pdf, png, jpeg |
| VIDEO_INTRO | mp4, webm |
| PROFILE_PHOTO | png, jpeg, webp |

**Prisma schema:** `FileRecord` model with `FilePurpose` and `FileStatus` enums; custom output to `src/generated/client`.

### Task 3 & 4 — `packages/api-client`: Profile and File API clients

`ProfileApiClient` and `FileApiClient` in `packages/api-client/src/profile.ts` covering all endpoints. Exposed from `apps/web/src/lib/api-client.ts` as `getProfileApiClient()` and `getFileApiClient()`.

### Task 5, 6, 7 — `apps/web`: Onboarding forms and role dashboards

**Onboarding pages** (`apps/web/src/app/onboarding/`):
- `candidate/page.tsx` — 2-step form (headline/skills → work auth/rate), react-hook-form + Zod
- `msme/page.tsx` — MSME creation form (legalName, EIN, contact info)
- `customer/page.tsx` — Customer company form (legalName, industry, billing address)
- `interviewer/page.tsx` — Interviewer profile (specializations, seniority coverage, interview types)
- Shared `layout.tsx` with auth guard

**Dashboard components** (`apps/web/src/components/dashboard/`):
- `candidate-dashboard.tsx` — "Ready to work" availability toggle
- `msme-dashboard.tsx` — Bench roster table with live fetch
- `customer-dashboard.tsx` — Placeholder (Post Requirement disabled until Sprint 3)
- `interviewer-dashboard.tsx` — 7-day calendar, earnings grid placeholders

**Dashboard `page.tsx`** updated with role-specific workspace sections and "Complete profile →" deep links to onboarding routes.

### Task 10 — Integration tests

**`services/profile/tests/integration/`:**
- `globalSetup.ts` — PostgreSQL testcontainer, `prisma migrate deploy`, RSA key pair for test JWTs, `FIELD_ENCRYPTION_KEK_V1`
- `helpers.ts` — `getServer`, `closeServer`, `resetDb`, `makeBearerToken` (via `jose`)
- `candidate.test.ts` — 6 tests: 404 no profile, PATCH upserts, GET returns, 403 wrong user, admin reads any, 401 no token
- `msme.test.ts` — 3 tests: POST creates, EIN encrypted in DB (not plaintext), bench entry added

**`services/file/tests/integration/`:**
- `globalSetup.ts`, `helpers.ts` — same testcontainer pattern
- `file.test.ts` — 5 tests: creates record, rejects wrong content type, full upload flow (request→upload→confirm→get), 403 wrong user, 401 no token

**`services/identity/tests/integration/helpers.ts`:** Fixed stale `@prisma/client` import → `../../src/generated/client/index.js` (the pnpm monorepo Prisma isolation fix).

### Cross-cutting fixes

- **Prisma client isolation:** All three services (`identity`, `profile`, `file`) use `output = "../src/generated/client"` in their schemas and import from that path. Prevents the pnpm shared-store collision where `prisma generate` in one service overwrites another's types.
- **`packages/db-client/src/field-encryption.ts`:** Added explicit base64 regex validation before decryption — Node's `Buffer.from(str, "base64")` silently ignores invalid chars, so the try/catch alone wasn't enough.
- **ESLint configs:** Added `src/generated/` to `ignores` in `identity`, `profile`, and `file` eslint configs; created `services/file/eslint.config.mjs`.
- **`.env.example`:** Added `NEXT_PUBLIC_PROFILE_URL`, `NEXT_PUBLIC_FILE_URL`, `PORT_FILE`, updated `PORT_PROFILE` (profile=3004, file=3003), and added `FILE_STORAGE_*` vars.

---

## Test Results

```
pnpm lint     → 32/32 tasks successful
pnpm typecheck → 32/32 tasks successful
pnpm test     → 31/31 tasks successful
```

Test counts (integration-capable services):
- `@techorbit/identity`: 46 tests (11 files)
- `@techorbit/profile`: 10 tests (3 files — 9 integration + 1 smoke)
- `@techorbit/file`: 6 tests (2 files — 5 integration + 1 smoke)
- `@techorbit/db-client`: 18 tests (field-encryption + index)

---

## Known Issues / Deferred to Sprint 3

1. **`<FileUpload>` UI component** — drag-drop with progress bar; referenced in spec but not yet built. Frontend currently uses the raw API client for file operations.
2. **MSME/Customer EIN decryption** — `toResponse()` returns `hasEin: boolean` but never decrypts for display. Actual EIN display (for settings page) deferred.
3. **KYC integration** — `startKyc()` returns a mock session URL. Real Stripe Identity integration is Sprint 4+.
4. **S3 storage mode** — `FILE_STORAGE_MODE=s3` path is stubbed (returns unsigned URL placeholder). Real S3 presigning is Sprint 3 infra work.
5. **Interviewer availability conflict detection** — slots are stored as JSON array; no overlap validation yet.
6. **`PORT_REQUIREMENT` et al. in `.env.example`** — renumbered to avoid conflict with file-svc (3003). Services that hardcode their old port numbers may need config updates when brought up together.

---

## Dependencies for Sprint 3

- Marketplace / requirements service (`services/requirement`) — needs `CustomerCompanyProfile` readable via API
- Matching service (`services/matching`) — needs `CandidateProfile` skills/seniority/availability fields
- OpenAPI spec generation for profile-svc (`pnpm --filter @techorbit/profile openapi:generate`) — blocked until `zod-to-openapi` wiring is added to the service
- S3 bucket provisioning in `infra/terraform` before FILE_STORAGE_MODE=s3 is usable
