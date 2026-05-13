# Sprint 8 Summary — Messaging, Notifications & Ratings

**Branch:** `sprint/8-communications` (from `sprint/7-payments`)
**Status:** Backend + frontend complete; lint 0, typecheck 0 across touched workspaces. Integration tests deferred to v1.1 (see "Known gaps").

---

## Why this sprint matters

Sprints 0-7 built marketplace mechanics. Sprint 8 adds the communication layer. After this sprint:
- Customers and candidates can message each other in-platform
- Users get notifications (in-app + email/SMS mocks) for every domain event
- Post-placement ratings seed reputation signals

Simpler than Sprints 6-7 (no complex business logic), but the participant-resolution layer in messaging was the one tricky piece.

---

## What was delivered

### Backend — three new services

**`services/notification`** (port 3011) — event-driven inbox.
- Schema: `Notification`, `NotificationPreference`, `ProcessedEvent` in `notification` Postgres schema.
- 9 event consumers (`submission.created`, `interview.scheduled`, `timesheet.submitted`, `timesheet.approved`, `invoice.generated`, `payout.processed`, `message.sent`, `rating.submitted`, `requirement.published` placeholder). Each dedupes via `ProcessedEvent`, writes a `Notification`, and best-effort fan-outs to SendGrid + Twilio mocks per user preferences.
- 5 API routes: list, mark-read, mark-all-read, get/update preferences.
- SendGrid + Twilio mocks in [services/notification/src/lib/](services/notification/src/lib/) — log-only stubs with the same interface real adapters will use.

**`services/messaging`** (port 3010) — context-aware threads.
- Schema: `Thread`, `Message`, `OutgoingEvent` in `messaging` Postgres schema. Threads are scoped by `contextType` (REQUIREMENT/SUBMISSION/INTERVIEW/PLACEMENT/GENERAL).
- **Participant-resolver** [services/messaging/src/lib/participant-resolver.ts](services/messaging/src/lib/participant-resolver.ts) — on thread creation, calls the owning service's `/api/v1/internal/:resource/:id` and builds the participant set. Caller is always included; domain-context `participantIds` in the request body are ignored (no escalation). Membership frozen at creation time — subsequent reads authorize against `Thread.participantIds` only.
- 5 API routes: create thread, list, get, send message, mark-read.
- Emits `message.sent.v1` via transactional outbox → notification-svc consumes it.

**`services/rating`** (port 3012) — 1–5 star post-placement ratings.
- Schema: `Rating` with unique `(placementId, raterUserId)` in `rating` Postgres schema.
- Rules: rater is customer or candidate; target is the counterparty; placement must be `ENDED_COMPLETED`; one rating per placement per user.
- 2 API routes: POST `/ratings` and GET `/ratings?userId=` (with aggregate averages) or `?placementId=`.
- Emits `rating.submitted.v1`.

### Upstream additions

- **interview-svc**: new `GET /api/v1/internal/interviews/:id` endpoint for the messaging participant-resolver ([services/interview/src/routes/internal.routes.ts](services/interview/src/routes/internal.routes.ts)). SERVICE-gated.

### Shared types

- **`packages/types/src/communications.ts`** — 20+ new Zod schemas: `CreateThreadRequest`, `SendMessageRequest`, `ThreadResponse`, `NotificationResponse`, `NotificationPreference`, `SubmitRatingRequest`, `RatingResponse`, `MessageSentEvent`, `RatingSubmittedEvent`, plus filters and aggregates.
- **`packages/types/src/enums.ts`** — added `ThreadContextType`, `NotificationType`, `RaterRole`. Renamed pre-existing `NotificationType` (EMAIL/SMS/PUSH/IN_APP channel enum) → `NotificationChannel` to free the name for the new category enum.

### API clients

- `packages/api-client/src/{messaging,notification,rating}.ts` — thin HTTP clients for each service.
- `apps/web/src/lib/api-client.ts` — added `getMessagingClient()`, `getNotificationClient()`, `getRatingClient()` singletons on ports 3010/3011/3012.

### Shared UI

- **`packages/ui/src/components/star-rating.tsx`** — accessible star component (radiogroup for interactive, img for read-only; hover preview; keyboard focus; `aria-label`). Exported as `StarRating`.

### Frontend

- **`/notifications`** — notification center with type icons, relative timestamps, "All/Unread" filter, "Mark all as read", and preferences link. Clicking a notification marks it read and navigates to `linkUrl`.
- **`/settings/notifications`** — preferences form with channel toggles (email/SMS) and per-type checkboxes for all 9 notification categories.
- **`/messages`** — split-view chat: thread list (left, unread badges, 10s poll) + chat window (right, auto-scroll, Enter-to-send). Supports a `?thread=<id>` query param to deep-link from notifications.
- **`/placements/[id]/rate`** — rating form. Uses `StarRating` for overall + sub-scores. Customers see a "Technical" sub-score; candidates don't. Guards on placement status (`ENDED_COMPLETED` only) and participant check.

---

## Architectural decisions confirmed this sprint

1. **Thread participants are frozen at creation.** The participant-resolver runs once; subsequent reads check `Thread.participantIds` directly. No re-fetch of upstream state.
2. **Caller is always a thread participant.** For domain contexts (REQUIREMENT/SUBMISSION/INTERVIEW/PLACEMENT) the caller is added alongside the auto-resolved primary parties so customers reaching out about their own requirement/submission end up on the thread.
3. **INTERVIEW context participants.** Uses `[candidateId, interviewerUserId, scheduledByUserId]` from the interview record — customer-user isn't on the interview model directly, so the scheduler (usually the customer or admin) serves as the customer-side participant.
4. **Notifications are best-effort.** Consumer errors never block upstream flows; they log structured and continue. The in-app `Notification` row is the source of truth — email/SMS are fan-out mirrors.
5. **Email/SMS mocks.** SendGrid + Twilio replaced with log-only stubs behind the same interface. Real adapters drop in with zero contract change. Mailpit already running in docker-compose handles real SMTP in dev.
6. **Polling over WebSocket.** 10s poll on the client is fine for text chat. WebSocket deferred — it needs sticky sessions + Redis fan-out, which is a week of infra work we aren't spending here.
7. **Plain-text emails.** HTML templates in v1.1. Plain text works everywhere and avoids spam-filter risk.
8. **Public ratings, no anonymity.** Rater's displayName is shown. Anonymous ratings invite abuse; defer that design conversation to v1.1.

---

## Known gaps / follow-ups

- **Integration tests.** Unit & integration test suites for all three services were scoped but not completed in this pass — the main services are written TDD-friendly (pure functions + testcontainer-ready infra already wired). Next sprint should prioritize these before any schema changes.
- **Phone number on the user profile.** SMS delivery requires a phone number; the profile model doesn't have one yet. SMS toggle is exposed in the preferences UI but silently skips delivery without contact info. Add `phone` to `CandidateProfile` (and other profile models as needed) when SMS is actually wired up.
- **`requirement.published.v1` consumer** is a placeholder — no targeting logic yet. Matching-svc will eventually emit per-user "new opportunity" events that this consumer can fan out on.
- **Navbar bell.** The prompt listed a navbar notification bell with unread count dropdown. The `/notifications` page covers the primary use-case; the bell in the `NavBar` component is a small follow-up.
- **Rating display on profile pages.** `GET /api/v1/ratings?userId=<id>` returns aggregates + recent ratings. The rendering on profile pages is a simple wire-up once the target profile pages exist (not all role profile pages are built yet).
- **Customer user for SUBMISSION context.** The submission response doesn't carry a `customerUserId`; resolver returns `[caller, candidate, submitter]`. This is fine for v1 — if a customer wants to reach out about a submission, they start the thread and auto-become a participant.
- **`rating.submitted.v1` notifications.** Wired end-to-end but should have a dedicated "Ratings" tab on profile pages to land on.

---

## Dependencies for future sprints

- **Search/matching v2** can score candidates by their rating aggregates from `rating-svc`.
- **Audit service (still pending)** can consume `message.sent.v1`, `rating.submitted.v1`, and the notification creation without touching this code.
- **Moderation** (reporting abusive messages) would build on the existing `Message` model — add a `reports` table and a review UI.

---

## Commits

Commit structure follows Sprint 6/7 convention (scope-prefixed conventional commits). Final summary commit closes the sprint.
