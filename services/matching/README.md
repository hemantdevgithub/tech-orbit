# @techorbit/matching

Marketplace matching service. Candidates, SRMs, and MSMEs submit candidates to open requirements; customers manage those submissions through a shortlist kanban (Submitted → Screening → Interviewing → Offer → Placed | Rejected | Withdrawn). A rule-based matching engine pre-computes a 0–100 score for every (requirement, candidate) pair.

## Endpoints

All routes require a bearer token (identity-svc JWT). Role and ownership checks are enforced in the service layer.

### Submissions

| Method | Path | Body / Query | Authz |
|---|---|---|---|
| `POST` | `/api/v1/submissions` | `SubmissionRequestSchema` | CANDIDATE (self), SRM, MSME, or ADMIN; `submitterRole` + `attributedSrmId` / `attributedMsmeId` are derived from the caller's roles |
| `GET` | `/api/v1/submissions` | `SubmissionFilterSchema` query params | any authed user; customers see submissions for their own requirements AND their own; candidates see only their own |
| `GET` | `/api/v1/submissions/:id` | — | submitter, attributed SRM/MSME, requirement owner, or admin |
| `PATCH` | `/api/v1/submissions/:id/status` | `UpdateSubmissionStatusSchema` | requirement owner (customer) only |
| `POST` | `/api/v1/submissions/:id/withdraw` | `{ reason: string }` | submitter only (or admin) |

### Matches

| Method | Path | Body / Query | Authz |
|---|---|---|---|
| `GET` | `/api/v1/matches/for-requirement/:reqId` | `?limit=N` (1..200, default 50) | requirement owner, attributed CRM, or admin |

### Internal (service-to-service)

None. matching-svc calls profile-svc's `/api/v1/internal/candidates` and requirement-svc's `/api/v1/internal/requirements/:id` with a self-minted `SERVICE`-role token. It does not expose any internal endpoints of its own yet.

## Matching algorithm

`computeMatchSignal(requirement, candidate)` is a pure function in `src/services/matching-engine.ts`. Weights are tunable via the `MATCH_WEIGHTS` const:

| Component | Max points | Rule |
|---|---|---|
| Skills overlap | 40 | `(overlap / requirement.techStack.length) * 40`, case-insensitive |
| Seniority exact | 20 | Same level |
| Seniority adjacent | 10 | ±1 in the `JUNIOR→PARTNER` order |
| Location exact | 15 | REMOTE + preferRemote; ONSITE + preferOnsite + fuzzy city match |
| Location hybrid | 10 | HYBRID + preferHybrid |
| Work auth | 15 | candidate.workAuthStatus ∈ requirement.workAuthPrefs (empty prefs = any) |
| Rating | 10 | `(averageRating / 5) * 10`, null → 0 |

Total is clamped to [0, 100] and rounded. Edge cases handled: empty `techStack`, null `seniority`, null `workAuthStatus`, null `averageRating`, unknown seniority values.

## Events

### Consumed
- `requirement.published.v1` — on receipt, matching-svc fetches the requirement (via requirement-svc's internal endpoint), pages through complete candidate profiles (via profile-svc's internal endpoint), computes a `MatchingSignal` per candidate, and upserts. Idempotent via `processed_event(eventId)`.

### Emitted
- `submission.created.v1` — on POST `/api/v1/submissions`
- `submission.status_changed.v1` — on PATCH `/api/v1/submissions/:id/status`
- `submission.withdrawn.v1` — on POST `/api/v1/submissions/:id/withdraw`

All emitted events use the transactional outbox pattern (`outgoing_event` table + `src/lib/outbox-worker.ts`).

## Environment

| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres DSN; the `matching` schema is created by `infra/docker/postgres-init/01-schemas.sql` |
| `JWT_PUBLIC_KEY` | yes | — | RS256 public PEM; same keypair as identity-svc |
| `JWT_PRIVATE_KEY` | yes | — | RS256 private PEM for self-minting `SERVICE`-role tokens; see `src/lib/service-token.ts`. Known tech-debt: duplicates identity-svc's signing key |
| `PORT` | no | `3006` | |
| `SERVICE_NAME` | no | `matching` | |
| `PROFILE_SVC_URL` | no | `http://localhost:3004` | |
| `REQUIREMENT_SVC_URL` | no | `http://localhost:3005` | |
| `RABBITMQ_URL` | no | — | When set, the consumer and outbox relay start on `onReady`. Without it, submission events accumulate in `outgoing_event` and no precompute runs |
| `ALLOWED_ORIGINS` | no | `http://localhost:3000` | CORS allowlist |
| `DISABLE_RATE_LIMIT` | no | `false` | Set `1` in test suites |

## Local run

```bash
# Apply migrations
pnpm --filter @techorbit/matching db:migrate:prod

# Run dev server (requires the full local stack — identity, profile, requirement)
pnpm --filter @techorbit/matching dev
```

## Tests

```bash
pnpm --filter @techorbit/matching test
```

- `tests/unit/matching-engine.test.ts` — 21 pure-function tests
- `tests/integration/submission.test.ts` — 14 Fastify/Postgres tests (testcontainer, fetch stubs for cross-service calls)
- `tests/integration/consumer.test.ts` — 2 tests: fan-out on publish, idempotency on redelivery
