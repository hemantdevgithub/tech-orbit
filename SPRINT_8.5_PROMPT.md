# Sprint 8.5 — Communication Layer Cleanup

You completed Sprint 8 core (messaging + notifications + ratings scaffolded). Before Sprint 9, finish the four deferred items to make the communication layer fully functional.

Continue on `sprint/8-communications` or create `sprint/8.5-cleanup` (your call).

**Time estimate:** 1-2 days total

---

## Task 1 — Run Prisma migrations (30 min)

**Problem:** Schemas are defined but migrations haven't been applied to the local DB. The three new services (messaging, notification, rating) need their schemas created.

### Apply migrations

```bash
# messaging-svc
cd services/messaging-svc
pnpm prisma migrate dev --name init_messaging_schema

# notification-svc
cd services/notification-svc
pnpm prisma migrate dev --name init_notification_schema

# rating-svc
cd services/rating-svc
pnpm prisma migrate dev --name init_rating_schema
```

### Verify schemas exist

```bash
# Connect to postgres
docker-compose exec postgres psql -U postgres -d techorbit

# List schemas
\dn

# Expected output should include: messaging, notification, rating
# (plus existing: identity, profile, requirement, matching, interview, placement, payments)

# Check tables
\dt messaging.*
\dt notification.*
\dt rating.*

# Exit
\q
```

**Commit:**
```
chore(migrations): apply Prisma migrations for messaging, notification, rating

- services/messaging-svc/prisma/migrations/
- services/notification-svc/prisma/migrations/
- services/rating-svc/prisma/migrations/

Three new schemas now exist in the database.
```

---

## Task 2 — Integration tests (1 day)

Write Vitest + Testcontainers integration tests for the three new services. Follow the pattern from Sprint 6 (placement-svc tests are the best reference).

### messaging-svc tests

Create `services/messaging-svc/tests/integration/messaging.test.ts`:

**Test cases (8 total):**
1. Create thread as customer → verify stored in DB, participants array correct
2. Send message in thread → verify stored, sender correct, createdAt set
3. Mark message as read → verify readBy array updated with userId
4. List threads for user → verify only threads where user is participant returned
5. Get thread with messages → verify messages sorted by createdAt
6. Authz: non-participant tries to read thread → 403
7. Authz: non-participant tries to send message → 403
8. Create thread with PLACEMENT context → verify participant auto-population (customer + candidate)

**Setup (in `globalSetup.ts` if not already):**
```ts
// Start testcontainer postgres
// Run migrations: pnpm prisma migrate deploy
// Seed test data if needed
```

**Example test:**
```ts
describe('Messaging API', () => {
  it('should create thread and allow participants to send messages', async () => {
    const customer = await createTestUser({ role: 'CUSTOMER' });
    const candidate = await createTestUser({ role: 'CANDIDATE' });
    
    // Create thread
    const threadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/threads',
      headers: { authorization: `Bearer ${customer.token}` },
      payload: {
        contextType: 'GENERAL',
        contextId: 'test-context',
        participantIds: [customer.id, candidate.id],
        subject: 'Test thread',
        initialMessage: 'Hello from customer'
      }
    });
    
    expect(threadRes.statusCode).toBe(201);
    const thread = threadRes.json();
    expect(thread.participantIds).toContain(customer.id);
    expect(thread.participantIds).toContain(candidate.id);
    
    // Send message as candidate
    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/threads/${thread.id}/messages`,
      headers: { authorization: `Bearer ${candidate.token}` },
      payload: { content: 'Hello from candidate' }
    });
    
    expect(msgRes.statusCode).toBe(201);
    
    // Verify message stored
    const messagesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/threads/${thread.id}`,
      headers: { authorization: `Bearer ${customer.token}` }
    });
    
    const messages = messagesRes.json().messages;
    expect(messages).toHaveLength(2); // initial + reply
    expect(messages[1].content).toBe('Hello from candidate');
  });
});
```

### notification-svc tests

Create `services/notification-svc/tests/integration/notification.test.ts`:

**Test cases (7 total):**
1. Event consumer: `submission.created.v1` → notification created for customer
2. Event consumer: `invoice.generated.v1` → notification created for customer
3. Event consumer: duplicate event (same eventId) → only one notification created (dedupe via ProcessedEvent)
4. Notification preferences: emailEnabled=true → SendGrid mock called
5. Notification preferences: smsEnabled=true → Twilio mock called
6. List notifications for user → verify only own notifications returned
7. Mark notification as read → verify readAt timestamp set

**Mock SendGrid/Twilio:**
```ts
import { vi } from 'vitest';

vi.mock('../src/lib/sendgrid-mock', () => ({
  SendGridMock: {
    sendEmail: vi.fn().mockResolvedValue({ success: true })
  }
}));
```

### rating-svc tests

Create `services/rating-svc/tests/integration/rating.test.ts`:

**Test cases (6 total):**
1. Submit rating as customer → verify stored, ratedUserId = candidate
2. Submit rating as candidate → verify stored, ratedUserId = customer
3. Get ratings for user → verify average calculated correctly
4. Submit duplicate rating (same placementId + raterUserId) → 409 conflict (@@unique constraint)
5. Submit rating before placement ends → 400 error (placement status must be ENDED_COMPLETED)
6. Authz: non-participant tries to rate → 403

**Update quality gates:**

After adding tests, verify:
```bash
pnpm test

# Expected new test counts:
# messaging: +8 tests
# notification: +7 tests
# rating: +6 tests
# Total: +21 tests (was ~220-250 after Sprint 7, now ~240-270)
```

**Commit:**
```
test(messaging,notification,rating): add integration test suites

- messaging-svc: 8 tests (thread CRUD, authz, participant filtering)
- notification-svc: 7 tests (event consumers, dedupe, email/SMS mocks)
- rating-svc: 6 tests (rating submission, authz, duplicate prevention)

All three services now have Testcontainers-based integration coverage.
```

---

## Task 3 — Navbar notification bell (2-3 hours)

**Problem:** Users can access `/notifications` directly but have no in-navbar indicator of unread notifications.

### Add notification bell to navbar

In `apps/web/src/components/layout/navbar.tsx` (or wherever your navbar lives):

**Add notification bell icon:**
```tsx
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getNotificationClient } from '@/lib/api-client';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Fetch unread count
    async function fetchUnread() {
      const client = getNotificationClient();
      const notifications = await client.list({ unreadOnly: true, limit: 5 });
      setUnreadCount(notifications.data.length);
      setRecentNotifications(notifications.data);
    }
    
    fetchUnread();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-sage-100 rounded-lg"
      >
        <Bell className="h-5 w-5 text-forest-800" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-sage-200 z-50">
          <div className="p-4 border-b border-sage-200">
            <h3 className="font-semibold text-forest-800">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-sage-500">
                No new notifications
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <a
                  key={notif.id}
                  href={notif.linkUrl || '/notifications'}
                  className="block p-4 hover:bg-sage-50 border-b border-sage-100"
                  onClick={() => {
                    // Mark as read
                    getNotificationClient().markRead(notif.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-2 w-2 rounded-full mt-2 ${notif.readAt ? 'bg-transparent' : 'bg-blue-500'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-forest-800">{notif.title}</p>
                      <p className="text-sm text-sage-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-sage-400 mt-1">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-sage-200">
            <a
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Add to navbar:**
```tsx
// In your navbar component
<nav className="...">
  {/* existing nav items */}
  
  <div className="flex items-center gap-4">
    <NotificationBell />
    <UserMenu />
  </div>
</nav>
```

**Click outside to close:**
```tsx
// Add useRef and click-outside handler
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// Wrap dropdown in ref
<div ref={dropdownRef} className="absolute right-0 ...">
```

**Verify:**
1. Navbar shows bell icon
2. Unread count badge appears when notifications exist
3. Click bell → dropdown opens with recent 5 notifications
4. Click notification → navigates to linkUrl, marks as read, dropdown closes
5. Click outside → dropdown closes
6. "View all" link → navigates to `/notifications`

**Commit:**
```
feat(web): add notification bell dropdown to navbar

- Bell icon with unread count badge
- Dropdown shows recent 5 notifications
- Click notification → mark as read + navigate
- Polls every 30s for new notifications
- Click outside to close

Users now have in-navbar access to notifications.
```

---

## Task 4 — Rating display on profiles (3-4 hours)

**Problem:** Ratings can be submitted but aren't visible on candidate/customer profiles. Users can't see the reputation signals.

### Add rating display to candidate profile

In `apps/web/src/app/candidates/[id]/page.tsx` (or wherever candidate profile lives):

**Fetch ratings:**
```tsx
import { getRatingClient } from '@/lib/api-client';

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const candidate = await getCandidateProfile(params.id);
  const ratingClient = getRatingClient();
  const ratings = await ratingClient.list({ userId: params.id });
  
  // Calculate average
  const avgRating = ratings.data.length > 0
    ? ratings.data.reduce((sum, r) => sum + r.overallScore, 0) / ratings.data.length
    : 0;
  
  return (
    <div>
      {/* Existing profile content */}
      
      {/* Rating section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-forest-800 mb-4">
          Ratings & Reviews
        </h2>
        
        {ratings.data.length === 0 ? (
          <p className="text-sage-500">No ratings yet</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl font-bold text-forest-800">
                {avgRating.toFixed(1)}
              </div>
              <div>
                <StarRating value={avgRating} readonly size="lg" />
                <p className="text-sm text-sage-600 mt-1">
                  Based on {ratings.data.length} placement{ratings.data.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {ratings.data.slice(0, 5).map((rating) => (
                <div key={rating.id} className="border border-sage-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <StarRating value={rating.overallScore} readonly />
                      <span className="text-sm text-sage-600">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {rating.feedback && (
                    <p className="mt-3 text-sage-700">{rating.feedback}</p>
                  )}
                  
                  <div className="mt-3 flex gap-4 text-sm text-sage-600">
                    {rating.technicalScore && (
                      <span>Technical: {rating.technicalScore}/5</span>
                    )}
                    {rating.communicationScore && (
                      <span>Communication: {rating.communicationScore}/5</span>
                    )}
                    {rating.professionalismScore && (
                      <span>Professionalism: {rating.professionalismScore}/5</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {ratings.data.length > 5 && (
              <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all {ratings.data.length} ratings →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### Add rating display to customer profile (for vendors)

Similar pattern in customer profile page. This is visible to MSMEs/Vendors who want to see how customers are rated by candidates.

### Add average rating badge to profile header

In the profile header (top of page), add:

```tsx
{avgRating > 0 && (
  <div className="flex items-center gap-2">
    <StarRating value={avgRating} readonly size="sm" />
    <span className="text-sm font-medium text-sage-700">
      {avgRating.toFixed(1)} ({ratings.data.length} reviews)
    </span>
  </div>
)}
```

**Verify:**
1. Candidate profile shows average rating + star display
2. Recent ratings listed (max 5 visible)
3. Each rating shows: stars, date, feedback (if provided), subscores
4. Customer profile shows ratings from candidates (if any)
5. Empty state: "No ratings yet" if user has never been rated

**Commit:**
```
feat(web): display ratings on candidate and customer profiles

- Average rating badge in profile header
- Recent ratings section with stars, feedback, subscores
- Shows up to 5 recent ratings, "View all" if more exist
- Empty state for users without ratings

Reputation signals now visible to hiring parties.
```

---

## Task 5 — Final verification (1 hour)

After completing Tasks 1-4, run end-to-end verification:

### Test flow 1: Messaging

1. As customer, create a new message thread (PLACEMENT context)
2. Send a message: "When can you start?"
3. As candidate, open `/messages` → see the thread in left panel
4. Click thread → see customer's message in right panel
5. Reply: "I can start in 2 weeks"
6. As customer, refresh `/messages` (or wait 10s for poll) → see reply
7. **Verify:** Thread participants are customer + candidate only (no CRM/SRM)

### Test flow 2: Notifications

1. As candidate, submit a timesheet
2. As customer, approve the timesheet
3. As candidate, check navbar bell → **Verify:** unread count = 1
4. Click bell → dropdown opens → **Verify:** "Timesheet approved" notification visible
5. Click notification → **Verify:** navigates to correct page, marks as read
6. Navbar bell → **Verify:** unread count = 0
7. Navigate to `/notifications` → **Verify:** notification is in list with readAt timestamp

### Test flow 3: Ratings

1. End a placement (set status to ENDED_COMPLETED)
2. As customer, navigate to `/placements/[id]`
3. **Verify:** "Rate candidate" button visible
4. Click → fill rating form (5 stars overall, 5 technical, "Excellent work")
5. Submit → redirect to placement detail
6. Navigate to candidate's profile page
7. **Verify:** Average rating shows 5.0 ⭐, 1 review visible
8. **Verify:** Rating card shows customer's feedback "Excellent work"

### Quality gates

```bash
pnpm lint     # Should pass (all 7 workspaces clean)
pnpm typecheck # Should pass (all 7 workspaces clean)
pnpm test     # Should pass (~240-270 total tests, +21 from Sprint 8.5)
pnpm build    # Should pass (no Suspense errors)
```

**If all pass:** Sprint 8.5 complete.

**If any fail:** Fix the failing test/build, re-run verification.

---

## Definition of Done (Sprint 8.5)

- [ ] Prisma migrations applied for messaging/notification/rating (schemas exist in DB)
- [ ] Integration tests written and passing (+21 tests: 8 messaging, 7 notification, 6 rating)
- [ ] Navbar notification bell visible with unread count badge
- [ ] Bell dropdown shows recent 5 notifications
- [ ] Ratings visible on candidate profiles (average + recent reviews)
- [ ] Ratings visible on customer profiles (if rated by candidates)
- [ ] All 3 test flows (messaging, notifications, ratings) verified manually
- [ ] Quality gates green (lint, typecheck, test, build)

---

## After Sprint 8.5

You'll have:
- ✅ Communication layer fully functional (messaging + notifications + ratings)
- ✅ All deferred items complete
- ✅ Integration tests for all Sprint 8 services
- ✅ Clean foundation for Sprint 9

**Then Sprint 9** — Admin Console + Dispute Resolution. The last feature sprint before production hardening.

**Progress after Sprint 8.5:** ~88% by sprint count, ~85% by difficulty.

**Remaining:** Sprint 9 (admin tools), Sprint 10 (E2E tests + deployment).

---

Once Sprint 8.5 is complete, report back:
- Did all 3 test flows pass?
- What was the final test count?
- Any bugs found and fixed?

Then we proceed to Sprint 9 (the last feature sprint before production readiness).
