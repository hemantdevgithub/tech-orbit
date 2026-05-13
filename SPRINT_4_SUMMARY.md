# Sprint 4 Summary — Matching & Submissions

**Branch:** `sprint/4-matching` (branched from `sprint/3-requirements`)
**Status:** Complete — backend 38/38 tests, lint + typecheck clean across all 30 packages

---

## What was built

### Backend: `services/matching`

Scaffolded the matching service from a bare shell (Fastify + health route only) into a full transactional service.

- **Prisma schema** — `Submission`, `MatchingSignal`, `ProcessedEvent` (idempotency guard), `OutgoingEvent` (outbox), under the `matching` Postgres schema. One migration, generated via `prisma migrate diff`. Unique index on `(requirementId, candidateId)` enforces the "one submission per candidate per requirement" rule.
- **Matching engine** — `src/services/matching-engine.ts`. Pure function, no DB access. Computes a 0–100 `matchScore` from skills overlap (40pt), seniority (20/10), location (15/10), work auth (15), candidate rating (10). Weights live in `MATCH_WEIGHTS` so they're tunable without rewriting the algorithm. Handles null/empty inputs explicitly (no divide-by-zero, no null crashes). Adapted to real `CandidateProfile` fields — `skills: String[]` (no primary/secondary split), `preferRemote/preferHybrid/preferOnsite` booleans, free-text `location`. 21 unit tests cover every component plus the perfect/worst/bounded cases.
- **Submission lifecycle** — `src/services/submission.service.ts` validates the requirement is OPEN, candidate profile is complete, no duplicate. Picks `submitterRole` from `ctx.roles` (CANDIDATE_SELF / SRM / MSME) and sets attribution accordingly. Falls back to on-the-fly scoring when no `MatchingSignal` exists (candidate joined after publish). Status updates gated on requirement ownership; withdraw gated on submitter identity.
- **API routes** — `POST /api/v1/submissions`, `GET /api/v1/submissions` (filtered, visibility-scoped), `GET /api/v1/submissions/:id`, `PATCH /api/v1/submissions/:id/status`, `POST /api/v1/submissions/:id/withdraw`, `GET /api/v1/matches/for-requirement/:reqId`.
- **Event consumer** — `src/consumers/requirement-published.consumer.ts` subscribes to `requirement.published.v1`, guards idempotency via `processed_event(eventId)`, fetches the full requirement (via service token), pages through complete candidate profiles, upserts one `MatchingSignal` per candidate.
- **Outbox** — mirrors requirement-svc pattern (5s poll, 100-row batch, 10-attempt cap, transactional enqueue). Emits `submission.created.v1`, `submission.status_changed.v1`, `submission.withdrawn.v1`.

### Service-to-service auth

Cross-cutting infrastructure landed in this sprint.

- Added a `SERVICE` role and a `requireServiceRole(fastify)` middleware in `packages/auth-middleware`.
- `services/matching/src/lib/service-token.ts` self-mints short-lived (5-min) RS256 JWTs with `roles=["SERVICE"]` and caches them. Refreshes 60s before expiry.
- **New internal endpoints:**
  - `GET /api/v1/internal/candidates` (profile-svc) — paginated list of complete candidate profiles.
  - `GET /api/v1/internal/customers/:userId` (profile-svc) — skips user-level authz.
  - `GET /api/v1/internal/requirements/:id` (requirement-svc) — raw record, no blind-posting redaction.

**Trade-off (documented in `service-token.ts`):** the RS256 private key now lives in matching-svc as well as identity-svc. AWS KMS-backed signing is the proper eventual fix. A backlog item for a security-hardening sprint.

### Frontend: `apps/web`

- **`MatchingApiClient`** in `packages/api-client` + `getMatchingClient()` wired up alongside the other service clients.
- **`/requirements/[id]/submit`** — form with candidate ID (prefilled + locked for self-submission), cover note (500 chars), optional proposed bill rate. Handles 409 duplicate with a clear message. Redirects to `/submissions/:id` on success.
- **`/requirements/[id]/shortlist`** — kanban board on `@dnd-kit/core`. Seven columns (Submitted/Screening/Interviewing/Offer/Placed/Rejected/Withdrawn). Optimistic UI: drag-and-drop dispatches `PATCH /status` and reverts on failure. Empty state explains how to attract candidates.
- **`/submissions/[id]`** — header with status badge + color-coded match-score badge (green ≥80, cream 50–79, red <50). Sections: match breakdown (from `/api/v1/matches/for-requirement`), cover note, proposed rate, candidate profile summary (from profile-svc). Owner-only "Move to <status>" buttons drive valid transitions; submitter gets a Withdraw button. Tolerates 403s on follow-up lookups (renders what the viewer is allowed to see).
- **Requirement detail page** — enabled the "Submit candidate" button for CANDIDATE/SRM/MSME; added "View shortlist" button for owners.

### Tests

| Suite | Count | Notes |
|---|---|---|
| `tests/unit/matching-engine.test.ts` | 21 | Pure-function unit tests; skills/seniority/location/workAuth/rating components, edge cases, bounded output |
| `tests/integration/submission.test.ts` | 14 | Fastify/Postgres via testcontainer; stubbed cross-service HTTP; attribution, 409/400/403 paths, scoped listing, outbox row emission |
| `tests/integration/consumer.test.ts` | 2 | requirement.published.v1 fan-out + idempotency-on-redelivery |
| `tests/smoke.test.ts` | 1 | `/health` |
| **Total** | **38** | |

Repo-wide: 30/30 lint, 30/30 typecheck, 29/29 test tasks green. 115 total tests across all services.

### OpenAPI

- `services/matching/openapi.yaml` generated from Zod schemas. Covers all six submission endpoints + matches endpoint + health.
- CI's OpenAPI sync check now includes matching.

---

## Decisions / ambiguities resolved

1. **SRM candidate selection UX** — Sprint 4 ships free-text candidate ID input. Proper "my network" picker lands in Sprint 5 once SRM profiles have a candidates list.
2. **Scoring weights** — kept the prompt's 40/20/15/15/10 split. Skills-first is correct for a staffing marketplace.
3. **DnD library** — `@dnd-kit/core`. `react-beautiful-dnd` is archived.
4. **Cross-service auth** — chose self-signed SERVICE tokens over adding a token-mint endpoint to identity-svc. Smaller surface change, same security posture, known trade-off on key distribution.
5. **Status transition rules** — permissive. Owner can move through the forward flow and reject at any step; submitter can withdraw unless already placed. Stricter workflow rules land in Sprint 5 when interviews are wired.

---

## Dependencies for Sprint 5

Sprint 5 (Interviews) can rely on:
- `submission.status_changed.v1` events to trigger interview scheduling when status → INTERVIEWING
- `MatchingSignal` rows to drive "suggested candidates" panels
- The service-token pattern to call interview-svc from submission flows (and vice versa)

---

## Known issues carried over from earlier sprints

- **`pnpm build` fails on `/login` and `/reset-password`** due to `useSearchParams()` without a Suspense boundary. Verified this pre-dates Sprint 4 (sprint/3-requirements build fails identically). Needs a separate fix: wrap bodies in `<Suspense>` or move the `useSearchParams` call into a child component. Not blocking Sprint 4 functionality; blocks CI's build step.

---

## Commit log (Sprint 4)

1. `feat(matching): scaffold Prisma schema and migration`
2. `feat(types): add submission and matching-signal schemas`
3. `feat(matching): add pure-function scoring engine`
4. `feat(auth,profile,requirement,matching): add service-to-service auth`
5. `feat(matching): scaffold service (config, lib, API clients, consumer)`
6. `chore(matching): ignore Prisma generated client`
7. `feat(matching): submission lifecycle, routes, and match endpoint`
8. `test(matching): add integration suite (submissions + consumer)`
9. `feat(web,api-client): submit candidate flow`
10. `feat(web,api-client): shortlist kanban and submission detail pages`
11. `docs,chore(matching): add README, OpenAPI spec, CI sync step; SPRINT_4_SUMMARY`

11 commits, under the 60–90 plan estimate — bundled related changes rather than splitting every file.
