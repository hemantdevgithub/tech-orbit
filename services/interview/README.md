# @techorbit/interview

Interview scheduling service. Customers schedule technical interviews (self-conducted or via a platform interviewer), participants join via embedded Daily.co video rooms, and interviewers submit post-interview scorecards.

## Endpoints

All routes require a bearer token (RS256). Role and visibility checks are enforced in the service layer.

### Interviews

| Method | Path | Authz | Notes |
|---|---|---|---|
| `POST` | `/api/v1/interviews` | CUSTOMER | Creates a Daily.co room; `interviewerUserId` optional — omit for self-conduct |
| `GET` | `/api/v1/interviews` | any | Visibility-scoped: each caller sees only interviews they are a participant of (scheduler, candidate, interviewer) |
| `GET` | `/api/v1/interviews/:id` | participant or admin | |
| `POST` | `/api/v1/interviews/:id/start` | participant | Sets status → IN_PROGRESS |
| `POST` | `/api/v1/interviews/:id/end` | participant | Sets status → COMPLETED; async recording fetch from Daily.co |
| `POST` | `/api/v1/interviews/:id/cancel` | scheduler or interviewer | Only SCHEDULED interviews can be cancelled |

### Scorecards

| Method | Path | Authz | Notes |
|---|---|---|---|
| `POST` | `/api/v1/scorecards` | scheduler or assigned interviewer | One scorecard per interview (idempotency check) |
| `GET` | `/api/v1/scorecards?interviewId=` | scheduler or interviewer | Candidates cannot read scorecards |

## Daily.co integration

`src/lib/daily.ts` wraps the Daily.co REST API.

- **Live mode** (`DAILY_API_KEY` set): creates private rooms with cloud recording, respects `scheduledStart/End` for `nbf`/`exp`.
- **Mock mode** (`DAILY_API_KEY` absent): all methods return `mock.daily.co/interview-<uuid>` URLs. The rest of the flow (scheduling, scorecards, status transitions) works completely without a Daily account — useful in CI and local dev.

## Events emitted

| Event | Trigger |
|---|---|
| `interview.scheduled.v1` | POST /api/v1/interviews |
| `interview.completed.v1` | POST /api/v1/interviews/:id/end |
| `scorecard.submitted.v1` | POST /api/v1/scorecards (consumed by payments-svc in Sprint 7 for interviewer fee) |

All emitted via the transactional outbox (`outgoing_event` table + 5s polling relay).

## Cross-service calls

- `matching-svc` `/api/v1/internal/submissions/:id` (SERVICE token) — validates submission status before scheduling
- `profile-svc` `/api/v1/interviewers/:userId` (SERVICE token) — validates interviewer

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (for SERVICE token self-signing) |
| `PORT` | no | `3007` |
| `RABBITMQ_URL` | no | — (outbox accumulates if unset) |
| `PROFILE_SVC_URL` | no | `http://localhost:3004` |
| `MATCHING_SVC_URL` | no | `http://localhost:3006` |
| `DAILY_API_KEY` | no | — (mock mode if absent) |
| `DAILY_DOMAIN` | no | `techorbit.daily.co` |
| `DISABLE_RATE_LIMIT` | no | `false` |

## Tests

```bash
pnpm --filter @techorbit/interview test
```

12 integration tests (testcontainer postgres) + 1 smoke test:
- Self-conduct and platform interviewer scheduling
- Non-customer → 403
- Submission in WITHDRAWN status → 400
- Start/end transitions
- Customer cancel / non-participant → 403
- Scorecard submit (interviewer) + customer can read it
- Candidate cannot read scorecard → 403
- Visibility isolation: scheduler can't see another customer's interviews
- Outgoing event enqueued on schedule
