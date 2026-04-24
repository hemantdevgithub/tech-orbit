# @techorbit/notification

Notification service. In-app notifications plus email/SMS fan-out. Subscribes to domain events and creates per-user notifications gated by user preferences.

## Why this service matters

Sprints 0-7 built the mechanics. Sprint 8 makes the platform feel alive: when something happens (submission, interview, invoice), the right user gets a ping on the right channel. This service is the switchboard — domain events in, user-facing notifications + email/SMS out.

## Endpoints

All routes require a bearer token (RS256). Scope: current user only.

| Method | Path | Authz |
|---|---|---|
| `GET` | `/api/v1/notifications` | any auth'd user (own inbox) |
| `POST` | `/api/v1/notifications/:id/mark-read` | owner only |
| `POST` | `/api/v1/notifications/mark-all-read` | any auth'd user (own inbox) |
| `GET` | `/api/v1/notification-preferences` | current user |
| `PUT` | `/api/v1/notification-preferences` | current user |

## Event consumers

| Event | Target | Notification |
|---|---|---|
| `requirement.published.v1` | CRMs/SRMs (v1: admin broadcast placeholder) | `REQUIREMENT_PUBLISHED` |
| `submission.created.v1` | Customer | `SUBMISSION_RECEIVED` |
| `interview.scheduled.v1` | Candidate + interviewer | `INTERVIEW_SCHEDULED` |
| `timesheet.submitted.v1` | Customer | `TIMESHEET_SUBMITTED` |
| `timesheet.approved.v1` | Candidate | `TIMESHEET_APPROVED` |
| `invoice.generated.v1` | Customer | `INVOICE_GENERATED` |
| `payout.processed.v1` (COMPLETED) | Beneficiary | `PAYOUT_COMPLETED` |
| `message.sent.v1` | Each recipient | `MESSAGE_RECEIVED` |
| `rating.submitted.v1` | Rated user | `RATING_RECEIVED` |

Every consumer:
1. Dedupes via `ProcessedEvent` (unique on `eventId`)
2. Creates a `Notification` row (in-app, always on)
3. Checks `NotificationPreference` for email + SMS toggles and per-type overrides
4. Fan-outs to SendGrid / Twilio mocks (logs only in v1)

Consumer failures log and continue — notifications are best-effort and never block upstream flows.

## Preference model

`NotificationPreference.preferences` is a JSON map keyed by `NotificationType`. Default = true when unset. Per-type false overrides channel-level on; channel-level off skips email/SMS entirely.

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `PORT` | no | `3011` |
| `RABBITMQ_URL` | no | — (consumers disabled if unset) |
| `SENDGRID_API_KEY` | no | — (mock logs only) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | no | — (mock logs only) |
| `EMAIL_FROM` | no | `no-reply@techorbit.test` |

## OpenAPI

```bash
pnpm --filter @techorbit/notification openapi:generate
```

Writes `services/notification/openapi.yaml`. CI verifies the committed spec is in sync with the Zod schemas.
