# @techorbit/rating

Rating service. Post-placement ratings between customer and candidate. 1–5 stars overall plus optional sub-scores and free-text feedback.

## Why this service matters

Ratings create reputation signals for matching and trust. v1 is intentionally narrow: one rating per placement per rater, only after the placement completes cleanly, only between the two primary parties.

## Endpoints

All routes require a bearer token (RS256).

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/ratings` | customer or candidate on the placement; placement must be `ENDED_COMPLETED` |
| `GET` | `/api/v1/ratings?userId=<id>` | any auth'd user |
| `GET` | `/api/v1/ratings?placementId=<id>` | any auth'd user |

## Rules

- **Participants only.** Rater must be either `Placement.createdByUserId` (customer) or `Placement.candidateId` (candidate).
- **Target matching.** Customer can only rate the candidate; candidate can only rate the customer. Enforced at the service layer.
- **No self-rating.** `raterUserId !== ratedUserId`.
- **Timing.** Placement status must be `ENDED_COMPLETED`. `ENDED_EARLY` and `ACTIVE` are rejected.
- **Uniqueness.** DB unique on `(placementId, raterUserId)` — second submit → `409 CONFLICT`.
- **Scores.** Overall is required, sub-scores optional; all are 1–5 integers. Technical is only surfaced in the customer form.
- **Feedback.** Optional, max 500 chars, public.

## Aggregates

`GET /api/v1/ratings?userId=<id>` returns averages (overall + each sub-score) across all ratings for that user. Used on profile pages ("4.8 ⭐ from 12 placements").

## Events

| Event | Trigger |
|---|---|
| `rating.submitted.v1` | `POST /ratings` |

Emitted via transactional outbox. Notification-svc consumes it to notify the rated user.

## Cross-service calls

- `placement-svc` `/api/v1/internal/placements/:id` — validate placement exists, status, and caller's relationship to it.

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (SERVICE-token signer) |
| `PORT` | no | `3012` |
| `RABBITMQ_URL` | no | — |
| `PLACEMENT_SVC_URL` | no | `http://localhost:3008` |

## OpenAPI

```bash
pnpm --filter @techorbit/rating openapi:generate
```
