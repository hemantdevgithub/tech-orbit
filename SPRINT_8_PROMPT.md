# Sprint 8 — Messaging, Notifications & Ratings

You completed Sprint 7 (timesheets + invoicing + payroll) — money flows are working. You're now at **the polish phase**.

Branch: `sprint/8-communications` (branched from `sprint/7-payments`)

---

## Why Sprint 8 is different

Sprints 0-7 built the core marketplace (infrastructure + business model + money flows). Sprint 8 builds the **communication layer** — the features that make the platform feel alive.

After Sprint 8:
- Customers and candidates can message each other in-platform
- Users get notified of key events (requirement published, submission received, interview scheduled, etc.)
- Post-placement ratings create reputation signals

**This is polish, not complexity.** Sprint 8 uses well-understood patterns (chat UI, email templates, star ratings).

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.9 (messaging schema — Message, Thread, Notification)
   - Section 5.10 (rating schema — Rating)
   - Section 6.2 (events consumed for notifications)
   - Section 7.8 (messaging-svc API)
   - Section 7.9 (notification-svc API)
   - Section 7.10 (rating-svc API)
3. `PRD.md`:
   - Section 5.4 (Messaging requirements)
   - Section 5.5 (Notification preferences)
   - Section 5.6 (Post-placement ratings)

---

## Sprint 8 scope

Build **three lightweight services**: messaging, notifications, ratings. These are simpler than previous sprints (no complex business logic, no financial calculations).

**Backend:**
- messaging-svc: in-platform chat between roles
- notification-svc: email/SMS alerts for key events
- rating-svc: post-placement ratings (customer ↔ candidate)

**Frontend:**
- Messaging UI (thread list + chat window)
- Notification preferences page (email/SMS toggles)
- Rating submission form (post-placement)
- Rating display (on profiles)

**Third-party integrations:**
- SendGrid or Mailgun for transactional emails (mocked for v1)
- Twilio for SMS (mocked for v1)

Do NOT build video messaging or file attachments yet — that's v1.1. This sprint ends at "text-based messaging works."

---

## Task breakdown

### PART A — Messaging Service

#### Task 1 — Prisma schema for messaging-svc

Implement `services/messaging-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["messaging"]
}

model Thread {
  id                String   @id @default(uuid())
  contextType       ThreadContextType
  contextId         String   // requirementId, placementId, etc.
  participantIds    String[] // array of userIds
  subject           String?
  lastMessageAt     DateTime @default(now())
  createdAt         DateTime @default(now())
  messages          Message[]

  @@index([contextType, contextId])
  @@schema("messaging")
}

enum ThreadContextType {
  REQUIREMENT
  SUBMISSION
  INTERVIEW
  PLACEMENT
  GENERAL
  @@schema("messaging")
}

model Message {
  id              String   @id @default(uuid())
  threadId        String
  thread          Thread   @relation(fields: [threadId], references: [id])
  senderUserId    String
  content         String   @db.Text
  readBy          String[] // array of userIds who have read this message
  createdAt       DateTime @default(now())

  @@index([threadId, createdAt])
  @@schema("messaging")
}

model OutgoingEvent {
  id        String   @id @default(uuid())
  eventType String
  payload   Json
  status    OutgoingEventStatus @default(PENDING)
  attempts  Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  @@schema("messaging")
}

enum OutgoingEventStatus {
  PENDING
  PUBLISHED
  FAILED
  @@schema("messaging")
}
```

Generate migration. Apply locally.

#### Task 2 — Messaging API routes

Implement ENGINEERING_SPEC Section 7.8 endpoints:

- `POST /api/v1/threads` — create thread (body: `{ contextType, contextId, participantIds, subject?, initialMessage }`)
- `GET /api/v1/threads` — list threads for current user
- `GET /api/v1/threads/:id` — get thread with messages
- `POST /api/v1/threads/:id/messages` — send message
- `POST /api/v1/threads/:id/mark-read` — mark all messages as read

**Authz rules:**
- Only thread participants can view/send messages
- Thread creation: auto-determine participants based on context (e.g., PLACEMENT thread = customer + candidate)

#### Task 3 — Frontend: Messaging UI

Build `/messages` page (all authenticated users):

**Layout (split view):**
- **Left panel:** Thread list (sorted by lastMessageAt desc)
  - Each row: participant names, subject, last message preview, unread badge
  - Click thread → load in right panel
- **Right panel:** Chat window
  - Messages sorted chronologically
  - Text input at bottom
  - Send button
- **Empty state (left panel):** "No messages yet"
- **Empty state (right panel):** "Select a conversation"

**New message button:**
- Opens modal: select context (Requirement, Placement, etc.), then select specific item
- Auto-populates participants based on context
- Subject field (optional)
- Initial message textarea
- Create thread → opens in right panel

**Real-time updates (optional for v1):**
- Poll `GET /threads` every 10 seconds to check for new messages
- Or use WebSocket (more complex, defer to v1.1)

### PART B — Notification Service

#### Task 4 — Prisma schema for notification-svc

Implement `services/notification-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["notification"]
}

model Notification {
  id              String   @id @default(uuid())
  userId          String
  type            NotificationType
  title           String
  message         String   @db.Text
  linkUrl         String?
  readAt          DateTime?
  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([userId, readAt])
  @@schema("notification")
}

enum NotificationType {
  REQUIREMENT_PUBLISHED
  SUBMISSION_RECEIVED
  INTERVIEW_SCHEDULED
  TIMESHEET_SUBMITTED
  TIMESHEET_APPROVED
  INVOICE_GENERATED
  PAYOUT_COMPLETED
  MESSAGE_RECEIVED
  @@schema("notification")
}

model NotificationPreference {
  id              String   @id @default(uuid())
  userId          String   @unique
  emailEnabled    Boolean  @default(true)
  smsEnabled      Boolean  @default(false)
  preferences     Json     // per-notification-type toggles
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@schema("notification")
}

model ProcessedEvent {
  id        String   @id @default(uuid())
  eventId   String   @unique
  eventType String
  processedAt DateTime @default(now())
  @@schema("notification")
}
```

Generate migration. Apply locally.

#### Task 5 — Event consumers

In `services/notification-svc/src/events/`, create consumers for:

- `requirement.published.v1` → notify CRM/SRM "New requirement matching your skills"
- `submission.created.v1` → notify customer "New submission for [requirement]"
- `interview.scheduled.v1` → notify candidate + interviewer "Interview scheduled"
- `timesheet.approved.v1` → notify candidate "Timesheet approved"
- `invoice.generated.v1` → notify customer "Invoice ready"
- `payout.processed.v1` → notify vendor "Commission payout completed"
- `message.sent.v1` (from messaging-svc) → notify recipient "New message"

Each consumer:
1. Deduplicates via `ProcessedEvent` table
2. Creates `Notification` record (in-app)
3. Checks `NotificationPreference` for user
4. If email enabled → send email via SendGrid/Mailgun (mocked)
5. If SMS enabled → send SMS via Twilio (mocked)

#### Task 6 — Notification API routes

Implement ENGINEERING_SPEC Section 7.9 endpoints:

- `GET /api/v1/notifications` — list notifications for current user (query: `?unreadOnly=true`)
- `POST /api/v1/notifications/:id/mark-read` — mark as read
- `POST /api/v1/notifications/mark-all-read` — mark all as read
- `GET /api/v1/notification-preferences` — get current user's preferences
- `PUT /api/v1/notification-preferences` — update preferences

#### Task 7 — Frontend: Notification center

Build `/notifications` page (all authenticated users):

**Layout:**
- List of notifications (sorted by createdAt desc)
- Each row: icon (based on type), title, message, timestamp, unread badge
- Click notification → mark as read, navigate to linkUrl if present
- "Mark all as read" button at top
- Filter: "All" vs "Unread"

**Empty state:** "No notifications yet"

**Notification bell (in navbar):**
- Badge with unread count
- Click → opens dropdown with recent 5 notifications
- "View all" link → navigate to `/notifications`

#### Task 8 — Frontend: Notification preferences

Build `/settings/notifications` page (all authenticated users):

**Form:**
- Email notifications: toggle (on/off)
- SMS notifications: toggle (on/off)
- Per-notification-type preferences:
  - Requirement published: checkbox
  - Submission received: checkbox
  - Interview scheduled: checkbox
  - Timesheet approved: checkbox
  - Invoice generated: checkbox
  - Payout completed: checkbox
  - New message: checkbox
- Save button

**Note:** SMS requires phone number. Add phone field to user profile if not already present.

#### Task 9 — Email/SMS integration mocks

**SendGrid mock** (`services/notification-svc/src/lib/sendgrid-mock.ts`):

```ts
export class SendGridMock {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[MOCK] Email to ${to}: ${subject}`);
    // In production: call SendGrid API
  }
}
```

**Twilio mock** (`services/notification-svc/src/lib/twilio-mock.ts`):

```ts
export class TwilioMock {
  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[MOCK] SMS to ${to}: ${message}`);
    // In production: call Twilio API
  }
}
```

Use Mailpit (already running in docker-compose) to capture outgoing emails in dev.

### PART C — Rating Service

#### Task 10 — Prisma schema for rating-svc

Implement `services/rating-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["rating"]
}

model Rating {
  id                String   @id @default(uuid())
  placementId       String
  ratedUserId       String   // who is being rated (candidate or customer)
  raterUserId       String   // who is giving the rating
  raterRole         RaterRole
  overallScore      Int      // 1-5 stars
  technicalScore    Int?     // 1-5 (if rating candidate)
  communicationScore Int?    // 1-5
  professionalismScore Int?  // 1-5
  feedback          String?  @db.Text
  createdAt         DateTime @default(now())

  @@unique([placementId, raterUserId])  // one rating per user per placement
  @@index([ratedUserId])
  @@schema("rating")
}

enum RaterRole {
  CUSTOMER
  CANDIDATE
  @@schema("rating")
}
```

Generate migration. Apply locally.

#### Task 11 — Rating API routes

Implement ENGINEERING_SPEC Section 7.10 endpoints:

- `POST /api/v1/ratings` — submit rating (body: `{ placementId, ratedUserId, overallScore, technicalScore?, feedback? }`)
- `GET /api/v1/ratings?userId=` — get ratings for a user (visible on their profile)
- `GET /api/v1/ratings?placementId=` — get ratings for a placement

**Authz rules:**
- Only customer or candidate can rate (must be participants in the placement)
- Cannot rate yourself
- Can only rate after placement ends (status = ENDED_COMPLETED)
- One rating per placement per user (@@unique constraint enforces this)

#### Task 12 — Frontend: Rating submission form

Build `/placements/[id]/rate` page (customer or candidate, post-placement):

**Form fields:**
- Overall rating: 1-5 stars (required)
- Technical skills: 1-5 stars (optional, customer rating candidate only)
- Communication: 1-5 stars (optional)
- Professionalism: 1-5 stars (optional)
- Feedback: textarea (optional, 500 chars)

**Submit:**
- POST to `/api/v1/ratings`
- On success: redirect to `/placements/[id]` with "Rating submitted" toast

**Trigger:**
- "Rate candidate" button on placement detail page (customer view, if placement status = ENDED_COMPLETED and not yet rated)
- "Rate customer" button on placement detail page (candidate view, if placement status = ENDED_COMPLETED and not yet rated)

#### Task 13 — Frontend: Rating display

**On candidate profile page:**
- Average rating badge (e.g., "4.8 ⭐ from 12 placements")
- Recent ratings section:
  - Customer name (or "Anonymous" if customer opts out)
  - Overall score (stars)
  - Feedback (if provided)
  - Placement title
  - Date

**On customer profile page (MSME/Vendor view):**
- Similar average rating + recent ratings

**On placement detail page:**
- If rated: "You rated this [candidate/customer] X stars"
- If not rated and eligible: "Rate this [candidate/customer]" button

### PART D — Integration & Documentation

#### Task 14 — Integration tests

**messaging-svc tests:**
- Create thread → verify participants can send/read messages
- Send message → verify stored in DB, recipient can see it
- Mark as read → verify readBy array updated
- Authz: non-participant cannot read thread

**notification-svc tests:**
- Event consumer: `submission.created.v1` → notification created for customer
- Notification preferences: email enabled → mock SendGrid called
- Notification preferences: SMS enabled → mock Twilio called
- Mark notification as read → verify readAt set

**rating-svc tests:**
- Submit rating as customer → verify stored, candidate's average rating updated
- Submit rating before placement ends → 400 error
- Submit duplicate rating → 409 conflict (@@unique constraint)
- Get ratings for user → verify only public ratings returned

#### Task 15 — Documentation

- `services/messaging-svc/README.md` — endpoints, thread contexts
- `services/notification-svc/README.md` — event consumers, email/SMS integrations (mocked)
- `services/rating-svc/README.md` — rating rules, score calculations
- Regenerate OpenAPI specs for all 3 services
- Update root `README.md` with communication layer description

---

## Definition of Done (Sprint 8)

**Functional:**
- [ ] Users can send/receive messages in-platform
- [ ] Thread list shows unread badge
- [ ] Notifications created for key events (submission, interview, invoice, etc.)
- [ ] Email notifications sent (visible in Mailpit)
- [ ] SMS notifications logged (Twilio mock)
- [ ] Users can manage notification preferences (email/SMS toggles)
- [ ] Notification bell in navbar shows unread count
- [ ] Post-placement ratings can be submitted (customer ↔ candidate)
- [ ] Ratings visible on profiles (average + recent ratings)
- [ ] One rating per placement per user (duplicate prevention)

**Security:**
- [ ] Only thread participants can read messages
- [ ] Only placement participants can rate each other
- [ ] Notification preferences scoped to current user

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (messaging/notification/rating integration tests green)
- [ ] OpenAPI specs generated for all 3 services

**Visual:**
- [ ] Messaging UI clean (split view, thread list + chat window)
- [ ] Notification center readable (icon + title + message)
- [ ] Rating form uses star rating component (not number input)

---

## Before you start

Produce a **written plan** covering:

1. Task ordering (I recommend: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15)
2. Real-time messaging: poll every 10s vs WebSocket? (I recommend polling for v1, WebSocket in v1.1)
3. Email templates: plain text vs HTML? (Plain text for v1, HTML in v1.1)
4. Rating visibility: public vs private? (Public by default, add "anonymous" toggle in v1.1)
5. Commit estimate (expect 50–80 for this sprint — simpler than Sprint 6-7)

**CRITICAL: Thread participant auto-population logic**

When creating a thread with `contextType=PLACEMENT` and `contextId=<placementId>`:
- Expected participants: customer (from placement.customerCompanyId), candidate (from placement.candidateId)
- Should CRM/SRM also be added? (I recommend NO for v1 — keep threads focused between hiring parties)

When creating a thread with `contextType=REQUIREMENT`:
- Expected participants: customer (from requirement.customerCompanyId), ???
- Who else? This is a "general inquiry" thread before submission exists. Maybe just customer + any interested candidate?

Clarify the participant rules before coding.

**Do not code until you say "proceed to Sprint 8."**

This sprint is lighter than 6-7 (no complex business logic), but still needs clear participant rules to avoid confusion.
