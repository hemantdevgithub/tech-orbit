# @techorbit/messaging

Messaging service. In-platform text threads with context-aware participant auto-resolution.

## Why this service matters

Customers and candidates need to talk to each other without leaving the platform. Messaging-svc owns thread membership, delivery, and read state. It emits `message.sent.v1` to notification-svc for email/SMS fan-out.

## Endpoints

All routes require a bearer token (RS256). Scope: thread participants only.

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/threads` | auth'd user (must be a participant of the context) |
| `GET` | `/api/v1/threads` | any auth'd user (own threads) |
| `GET` | `/api/v1/threads/:id` | participant only |
| `POST` | `/api/v1/threads/:id/messages` | participant only |
| `POST` | `/api/v1/threads/:id/mark-read` | participant only |

## Thread contexts & participant resolution

When a thread is created the caller specifies `contextType` + `contextId`. The service calls the owning service's `/api/v1/internal/:resource/:id` endpoint and builds the participant set. The caller is always included.

| contextType | Auto-resolved participants |
|---|---|
| `REQUIREMENT` | caller + requirement creator |
| `SUBMISSION` | caller + candidate + submitter (SRM/MSME) |
| `INTERVIEW` | caller + candidate + interviewer + scheduler |
| `PLACEMENT` | caller + candidate + placement creator (customer) |
| `GENERAL` | caller + caller-supplied `participantIds` |

Only `GENERAL` honors `participantIds` from the request body. For domain contexts, the supplied list is ignored to prevent escalation.

Thread membership is frozen at creation. Every subsequent message/read check validates against `Thread.participantIds` (no re-fetch of upstream state), so cross-service churn never changes who can see a thread.

## Events

| Event | Trigger |
|---|---|
| `message.sent.v1` | `POST /threads` (initial message) + `POST /threads/:id/messages` |

Emitted via transactional outbox (`outgoing_event` + 5s relay).

## Cross-service calls

On thread creation only (participant resolution):
- `placement-svc` `/api/v1/internal/placements/:id`
- `requirement-svc` `/api/v1/internal/requirements/:id`
- `matching-svc` `/api/v1/internal/submissions/:id`
- `interview-svc` `/api/v1/internal/interviews/:id`

All use `SERVICE`-role JWTs self-signed via the shared private key.

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (SERVICE-token signer) |
| `PORT` | no | `3010` |
| `RABBITMQ_URL` | no | — (outbox accumulates if unset) |
| `PLACEMENT_SVC_URL` | no | `http://localhost:3008` |
| `REQUIREMENT_SVC_URL` | no | `http://localhost:3005` |
| `MATCHING_SVC_URL` | no | `http://localhost:3006` |
| `INTERVIEW_SVC_URL` | no | `http://localhost:3007` |

## Real-time

v1 uses 10-second polling on the client (`GET /threads` + per-thread `GET /threads/:id`). WebSocket deferred to v1.1 — it needs sticky sessions and Redis pub/sub for fan-out.

## OpenAPI

```bash
pnpm --filter @techorbit/messaging openapi:generate
```
