# Full Platform Verification & UI Polish

You've completed Sprint 9 (admin console) — all features are built. Before deciding on next steps (Sprint 10, beta launch, or pivot), verify that everything actually works end-to-end and the UI is production-quality.

**Time estimate:** 4-6 hours of manual testing + fixes

---

## Goals

1. **Functional verification:** Test every major flow from signup to payout as a real user would
2. **UI polish:** Identify and fix visual bugs, inconsistent styling, missing states
3. **Cross-service integration:** Verify all 12 services talk to each other correctly
4. **Data integrity:** Confirm money calculations are accurate, no data loss
5. **User experience:** Find confusing flows, missing feedback, slow pages

---

## Setup (15 min)

### Start the full stack

```bash
# Terminal 1 — Infrastructure
docker-compose up -d

# Verify all containers running
docker-compose ps
# Expected: postgres, redis, rabbitmq, mailpit all UP

# Terminal 2 — All services + web app
pnpm dev

# Wait for all services to start
# You should see "listening on port XXXX" for:
# - web (3000)
# - identity (3002)
# - file (3003)
# - profile (3004)
# - requirement (3005)
# - matching (3006)
# - interview (3007)
# - placement (3008)
# - payments (3009)
# - messaging (3010)
# - notification (3011)
# - rating (3012)
# - admin (3014)
```

### Seed the admin user

```bash
cd services/admin-svc
pnpm seed:admin

# Verify admin created
docker-compose exec postgres psql -U postgres -d techorbit \
  -c "SELECT id, email, roles FROM identity.\"User\" WHERE 'ADMIN' = ANY(roles);"

# Expected output: admin@techorbit.test with ADMIN role
```

### Open browser

- Main app: http://localhost:3000
- Mailpit (email inbox): http://localhost:8025
- RabbitMQ management: http://localhost:15672 (guest/guest)

### Clear existing data (fresh start)

```bash
# Drop all data (keeps schema)
docker-compose exec postgres psql -U postgres -d techorbit \
  -c "TRUNCATE identity.\"User\", profile.\"CandidateProfile\", requirement.\"Requirement\" CASCADE;"

# Or full reset (drops DB and recreates)
docker-compose down -v
docker-compose up -d
cd services/identity-svc && pnpm prisma migrate deploy
# Repeat for all services...
cd ../admin-svc && pnpm seed:admin
```

---

## Flow 1 — Customer Journey (45 min)

### 1.1 Registration & onboarding

**Open:** http://localhost:3000

1. Click "Sign up"
2. Fill form:
   - Email: `customer1@test.com`
   - Password: `Test123!` (strong password)
   - Confirm password: `Test123!`
3. Submit

**✅ Check:**
- [ ] Form validates (empty fields show errors)
- [ ] Password strength indicator works
- [ ] Submit button disabled until valid
- [ ] Redirects to email verification page

4. Open Mailpit: http://localhost:8025
5. Find verification email
6. Click verification link

**✅ Check:**
- [ ] Email received (subject: "Verify your email")
- [ ] Link format correct: `http://localhost:3000/verify-email?token=...`
- [ ] Clicking link marks email as verified

7. Redirected to role selection page
8. Select "CUSTOMER" role
9. Submit

**✅ Check:**
- [ ] Role selection UI clear (6 role cards with descriptions)
- [ ] CUSTOMER card highlights on hover
- [ ] Submit button enabled only when role selected

10. Redirected to customer onboarding (company profile)
11. Fill company profile:
    - Company name: "TechCorp Inc"
    - Industry: "Technology"
    - Website: "https://techcorp.example"
    - Size: "50-200"
    - EIN: "12-3456789"
12. Upload logo (optional): any PNG/JPG file
13. Submit

**✅ Check:**
- [ ] All fields have proper labels
- [ ] EIN field validates format (XX-XXXXXXX)
- [ ] File upload shows preview
- [ ] Success toast appears
- [ ] Redirects to customer dashboard

### 1.2 Dashboard first impressions

**✅ Check:**
- [ ] Dashboard loads quickly (<2 seconds)
- [ ] "Welcome, [name]" message visible
- [ ] Stats cards show (Active placements: 0, Unpaid invoices: $0, etc.)
- [ ] "Post a requirement" CTA button prominent
- [ ] Navbar shows: logo, "Requirements", "Interviews", "Invoices", notifications bell, user menu
- [ ] User menu dropdown works (Profile, Settings, Logout)

### 1.3 Post a requirement

1. Click "Post a requirement" (from dashboard or navbar → Requirements → New)
2. **Step 1 — Job basics:**
   - Title: "Senior Full-Stack Engineer"
   - Description: "We need a React + Node expert to build our new dashboard. 5+ years experience required."
   - Tech stack: Select React, Node.js, TypeScript, PostgreSQL (multi-select working?)
   - Seniority: Senior
   - Click "Next"

**✅ Check:**
- [ ] Form laid out clearly (3 steps shown at top)
- [ ] Tech stack picker works (tags appear, can remove)
- [ ] Description textarea has character count
- [ ] "Next" button validates step before proceeding

3. **Step 2 — Location & rates:**
   - Location type: Remote
   - Bill rate min: $100/hr
   - Bill rate max: $140/hr
   - Duration: 26 weeks
   - Start date: 2 weeks from today (date picker works?)
   - Openings: 1
   - Click "Next"

**✅ Check:**
- [ ] Date picker opens and allows future dates only
- [ ] Rate sliders work smoothly (or number inputs validate)
- [ ] Min < Max validation works
- [ ] Step progress indicator updates (step 2 of 3)

4. **Step 3 — Requirements:**
   - Work auth: US Citizen, Green Card (multi-select checkboxes)
   - Required interviews: 2
   - Blind posting: No (toggle off)
   - Click "Save as draft"

**✅ Check:**
- [ ] "Save as draft" button works
- [ ] Toast appears: "Requirement saved as draft"
- [ ] Stays on same page (doesn't redirect)

5. Click "Publish"

**✅ Check:**
- [ ] Confirmation modal appears: "Are you sure you want to publish?"
- [ ] Click "Publish" → toast: "Requirement published"
- [ ] Redirects to requirement detail page
- [ ] Status badge shows "OPEN"

### 1.4 Browse requirements

1. Navigate to "Requirements" in navbar
2. View browse list

**✅ Check:**
- [ ] Table shows posted requirement
- [ ] Columns: Title, Tech Stack (pills), Seniority, Location, Rate Range, Status, Published Date
- [ ] Filters visible: Status dropdown, Tech stack multi-select, Search bar
- [ ] Click requirement row → navigates to detail page

### 1.5 Requirement detail page

**✅ Check:**
- [ ] Title + status badge at top
- [ ] Tech stack pills displayed
- [ ] Rate range, duration, start date visible
- [ ] Description formatted (line breaks preserved)
- [ ] "Edit" and "Close" buttons visible (owner only)
- [ ] "Submissions" section shows "No submissions yet"

---

## Flow 2 — Candidate Journey (30 min)

### 2.1 Registration (repeat 1.1 but select CANDIDATE role)

1. Open incognito/private window: http://localhost:3000
2. Sign up: `candidate1@test.com` / `Test123!`
3. Verify email via Mailpit
4. Select "CANDIDATE" role
5. Fill candidate profile:
   - Name: "Alex Chen"
   - Headline: "Full-stack engineer with 8 years experience"
   - Primary skills: React, Node.js, TypeScript, PostgreSQL (match requirement)
   - Secondary skills: AWS, Docker
   - Seniority: Senior
   - Location: San Francisco, CA
   - Remote OK: Yes
   - Work auth: US Citizen
   - Years experience: 8
   - Hourly rate: $120
   - Resume: upload PDF (optional)
6. Submit

**✅ Check:**
- [ ] Skills picker works (same as tech stack picker)
- [ ] Remote OK checkbox toggles city/state fields
- [ ] Resume upload accepts PDF only
- [ ] Success toast + redirect to candidate dashboard

### 2.2 Candidate dashboard

**✅ Check:**
- [ ] Stats show: Applications: 0, Active placements: 0
- [ ] "Browse requirements" CTA visible
- [ ] Navbar different from customer (no "Post requirement" option)

### 2.3 Browse & submit to requirement

1. Navigate to "Requirements"
2. Find "Senior Full-Stack Engineer" requirement
3. Click to open detail page

**✅ Check:**
- [ ] Match score badge visible (should be 85-95, green color)
- [ ] Match breakdown shows:
  - Skills match: High (4/4 skills match)
  - Seniority: Exact match
  - Location: Remote OK
  - Work auth: Match
- [ ] "Submit" button visible and enabled

4. Click "Submit"
5. Fill submission form:
   - Cover note: "I have 8 years of full-stack experience building scalable web apps. I've worked with React and Node.js extensively..."
   - Proposed bill rate: $130/hr (optional)
6. Submit

**✅ Check:**
- [ ] Cover note textarea has character count (500 max?)
- [ ] Bill rate validation (must be within requirement's range)
- [ ] Success toast: "Submission successful"
- [ ] Redirects back to requirement detail
- [ ] Page now shows "You've submitted to this requirement"

---

## Flow 3 — Customer Reviews Submissions (15 min)

### 3.1 View shortlist

Switch back to customer browser (or logout candidate, login as customer1@test.com)

1. Navigate to Requirements → "Senior Full-Stack Engineer"
2. Click "View shortlist" (or go to `/requirements/[id]/shortlist`)

**✅ Check:**
- [ ] Kanban board visible with columns: Submitted, Screening, Interviewing, Offer, Placed, Rejected, Withdrawn
- [ ] One submission card in "Submitted" column
- [ ] Card shows:
  - Candidate name: Alex Chen
  - Match score: 90 (or similar, with green badge)
  - Skills pills: React, Node.js, TypeScript, PostgreSQL
  - Submitted date
- [ ] Card is draggable (cursor changes to grab on hover)

### 3.2 Move through pipeline

1. Drag submission card from "Submitted" → "Screening"

**✅ Check:**
- [ ] Drag animation smooth
- [ ] Card lands in Screening column
- [ ] Toast: "Submission moved to Screening" (or silent success)

2. Refresh page

**✅ Check:**
- [ ] Card still in Screening column (state persisted)

3. Drag to "Interviewing"

**✅ Check:**
- [ ] Same smooth behavior
- [ ] Status persists after refresh

### 3.3 Submission detail

1. Click the submission card
2. View submission detail page

**✅ Check:**
- [ ] Candidate name + profile summary visible
- [ ] Match score breakdown shown (skills, seniority, location, work auth)
- [ ] Cover note displayed
- [ ] Proposed bill rate shown (if provided)
- [ ] Action buttons: "Schedule Interview", "Reject"
- [ ] Status badge: "Interviewing"

---

## Flow 4 — Interview Scheduling & Conduct (20 min)

### 4.1 Schedule interview

Still on submission detail page:

1. Click "Schedule Interview"
2. Fill interview form:
   - Type: "I'll conduct this myself" (self-conduct)
   - Date: Tomorrow
   - Time: 2:00 PM
   - Duration: 1 hour
3. Submit

**✅ Check:**
- [ ] Date picker only allows future dates
- [ ] Time picker shows 15-min increments
- [ ] Duration dropdown: 30min, 1hr, 1.5hr, 2hr
- [ ] Success toast: "Interview scheduled"
- [ ] Redirects to interview detail page

### 4.2 Interview detail

**✅ Check:**
- [ ] Interview details visible:
  - Candidate: Alex Chen
  - Date/time: Tomorrow 2:00 PM
  - Duration: 1 hour
  - Interviewer: You (self-conduct)
  - Status: SCHEDULED
- [ ] Video room URL visible (mock URL: https://mock-video-room.example.com/...)
- [ ] "Join call" button visible but disabled if before scheduled time
- [ ] OR: "Join call" enabled (for testing, ignore time check)

### 4.3 Conduct interview (mock)

1. Click "Join call" (opens `/interviews/[id]/call`)

**✅ Check:**
- [ ] Full-screen video interface loads
- [ ] Mock Daily.co iframe or placeholder visible
- [ ] Top bar shows: Candidate name, Time remaining (countdown?)
- [ ] Bottom bar shows: "End call" button
- [ ] Notes textarea visible (optional)

2. Click "End call"

**✅ Check:**
- [ ] Confirmation modal: "End interview?"
- [ ] Click "End" → redirects to scorecard page OR interview detail
- [ ] Interview status → COMPLETED

### 4.4 Submit scorecard

Navigate to `/interviews/[id]/scorecard` (or prompted after ending call)

1. Fill scorecard:
   - Recommendation: STRONG_YES (or YES)
   - Technical: 5 stars
   - Communication: 5 stars
   - Problem solving: 4 stars
   - Cultural fit: 5 stars
   - Feedback: "Excellent technical skills. Clear communicator. Strong problem-solving. Would highly recommend."
   - Red flags: (leave empty)
   - Would hire again: Yes
2. Submit

**✅ Check:**
- [ ] Star rating components work (click to set rating)
- [ ] Recommendation radio buttons clear
- [ ] Feedback textarea has character limit
- [ ] Success toast: "Scorecard submitted"
- [ ] Redirects to interview detail
- [ ] Scorecard now visible on interview detail page (customer view)

### 4.5 Verify candidate can't see scorecard

Switch to candidate browser:

1. Navigate to same interview detail page

**✅ Check:**
- [ ] Interview details visible
- [ ] Scorecard section NOT visible (403 or just hidden)
- [ ] No way to access customer's feedback

---

## Flow 5 — Placement Creation (20 min)

### 5.1 Move to Offer

Switch back to customer browser:

1. Navigate to shortlist kanban
2. Drag submission from "Interviewing" → "Offer"

**✅ Check:**
- [ ] Card moves smoothly
- [ ] Status persists

### 5.2 Hire candidate

1. Click submission card → submission detail
2. Click "Hire Candidate" button

**✅ Check:**
- [ ] Button visible only in Offer status
- [ ] Redirects to hire flow: `/submissions/[id]/hire`

3. Fill hire form:
   - Engagement type: W-2
   - Bill rate: $120/hr
   - Pay rate: $90/hr
   - Start date: 2 weeks from today
   - End date: Start + 26 weeks (auto-filled from requirement duration?)
   - Contract upload: (skip for now)
4. View commission preview sidebar

**✅ Check:**
- [ ] Commission preview visible (right sidebar or below form)
- [ ] Shows breakdown:
  - CRM: None attributed
  - SRM: None attributed (candidate self-submitted)
  - Platform: $27/hr (27%)
    - Base: $12/hr (12%)
    - Unattributed CRM: +$8/hr (+8%)
    - Unattributed SRM: +$5/hr (+5%)
  - Interviewer: $150 (one-time, you)
  - Candidate: $90/hr (75%)
- [ ] Weekly cost: $4,800 (40hrs × $120)
- [ ] 26-week total: $124,800
- [ ] Math is CORRECT (verify manually)

5. Click "Create Placement"

**✅ Check:**
- [ ] Success toast: "Placement created"
- [ ] Redirects to placement detail: `/placements/[id]`

### 5.3 Placement detail

**✅ Check:**
- [ ] Hero header shows:
  - Candidate name: Alex Chen
  - Engagement type: W-2
  - Status: ACTIVE
  - Start → End dates
  - Bill rate: $120/hr
  - Pay rate: $90/hr
- [ ] Contract details section shows dates, rates, duration
- [ ] Value Chain visualization:
  - Customer (TechCorp Inc) → [Confidential] → [Confidential] → Candidate (Alex Chen)
  - Platform node shows 27% with breakdown tooltip
  - Interviewer side-node shows "You" with $150
- [ ] Actions: "End placement" button visible (customer only)

### 5.4 Candidate views placement

Switch to candidate browser:

1. Navigate to `/dashboard` (or click "Placements" in navbar)
2. View active placement card
3. Click → placement detail

**✅ Check:**
- [ ] Dashboard shows current placement card:
  - Customer: TechCorp Inc
  - Role: Senior Full-Stack Engineer
  - Pay rate: $90/hr
  - Start date
- [ ] Placement detail shows:
  - Customer name
  - Pay rate: $90/hr (visible)
  - Value Chain: Customer → [Confidential] → [Confidential] → You ($90/hr)
  - CRM/SRM/Platform commissions: NOT visible (redacted)
- [ ] "End placement" button NOT visible

---

## Flow 6 — Timesheets & Invoicing (25 min)

### 6.1 Submit timesheet

As candidate:

1. Navigate to placement detail
2. Click "Submit timesheet" (or go to `/placements/[id]/timesheets/new`)
3. Fill timesheet form:
   - Week: Select current week (or most recent Mon-Sun)
   - Hours worked: 40
   - Description: "Worked on dashboard UI, API integration, and bug fixes"
4. Submit

**✅ Check:**
- [ ] Week selector shows Mon-Sun format (e.g., "Week of Nov 4-10, 2024")
- [ ] Hours input validates (0-168 max)
- [ ] Success toast: "Timesheet submitted"
- [ ] Redirects to timesheet list or placement detail

### 6.2 Customer approves timesheet

Switch to customer browser:

1. Navigate to `/timesheets/pending` (or dashboard shows "Pending timesheets" card)
2. View pending timesheets table

**✅ Check:**
- [ ] Table shows one pending timesheet:
  - Candidate: Alex Chen
  - Placement: Senior Full-Stack Engineer
  - Week: Nov 4-10
  - Hours: 40
  - Submitted date
  - Actions: Approve, Reject
- [ ] Click "Approve"

**✅ Check:**
- [ ] Success toast: "Timesheet approved"
- [ ] Row disappears from pending table
- [ ] (Optional) Email sent to candidate: "Timesheet approved" (check Mailpit)

### 6.3 Generate invoice (manual trigger for testing)

Since the weekly cron runs Monday 12:01 AM, trigger manually:

**Option A: Call internal endpoint:**
```bash
curl -X POST http://localhost:3009/api/v1/internal/generate-weekly-invoices \
  -H "Content-Type: application/json" \
  -d '{
    "billingPeriodStart": "2024-11-04T00:00:00Z",
    "billingPeriodEnd": "2024-11-10T23:59:59Z"
  }'
```

**Option B: Run cron job manually:**
```bash
cd services/payments-svc
node -e "require('./dist/jobs/weekly-invoice-generator.js').generateWeeklyInvoices()"
```

**✅ Check:**
- [ ] Invoice created successfully
- [ ] No errors in terminal
- [ ] Check database:
  ```bash
  docker-compose exec postgres psql -U postgres -d techorbit \
    -c "SELECT * FROM payments.\"Invoice\" ORDER BY created_at DESC LIMIT 1;"
  ```

### 6.4 Customer views invoice

As customer:

1. Navigate to `/invoices`
2. View invoice list

**✅ Check:**
- [ ] Table shows one invoice:
  - Invoice #: (auto-generated)
  - Billing period: Nov 4-10, 2024
  - Total: $4,800 (40 hrs × $120/hr)
  - Status: DRAFT or SENT
  - Due date: (7-14 days from generated date)
- [ ] Click invoice row → navigates to `/invoices/[id]`

### 6.5 Invoice detail

**✅ Check:**
- [ ] Header shows:
  - Invoice #
  - Status badge
  - Total: $4,800
  - Due date
- [ ] Line items table:
  - Placement: Senior Full-Stack Engineer
  - Candidate: Alex Chen
  - Week: Nov 4-10
  - Hours: 40
  - Rate: $120/hr
  - Amount: $4,800
- [ ] Summary:
  - Subtotal: $4,800
  - Tax: $0 (or calculated if tax logic exists)
  - Total: $4,800
- [ ] Payment section:
  - Stripe invoice URL: (mock URL) OR "Pay invoice" button
  - (Optional) If status=PAID: "Paid on [date]"

### 6.6 Vendor views payout

Switch to new incognito window (or use candidate browser):

**Note:** Since candidate self-submitted (no SRM) and no CRM, candidate is the only vendor with a payout besides platform.

As candidate:

1. Navigate to `/payouts`

**✅ Check:**
- [ ] Payout dashboard shows:
  - Pending earnings: $3,600 (40hrs × $90/hr)
  - This month: $0 (not yet paid)
  - Lifetime: $0
- [ ] Table shows one payout:
  - Placement: Senior Full-Stack Engineer
  - Customer: TechCorp Inc
  - Billing period: Nov 4-10
  - Amount: $3,600
  - Status: PENDING
  - Paid date: (empty)

---

## Flow 7 — Messaging (15 min)

### 7.1 Customer initiates thread

As customer:

1. Navigate to `/messages`
2. Click "New message" button
3. Fill new message modal:
   - Context: PLACEMENT
   - Select placement: Senior Full-Stack Engineer (Alex Chen)
   - Subject: "Start date confirmation"
   - Initial message: "Hi Alex, just wanted to confirm you can start on Nov 18th as discussed?"
4. Send

**✅ Check:**
- [ ] Modal layout clear
- [ ] Context dropdown: PLACEMENT, REQUIREMENT, GENERAL
- [ ] Placement selector populates from active placements
- [ ] Subject optional
- [ ] Success toast: "Message sent"
- [ ] Modal closes, thread appears in left panel

### 7.2 Messages UI

**✅ Check:**
- [ ] Split view:
  - Left panel: thread list
  - Right panel: chat window
- [ ] Thread list shows:
  - Participant: Alex Chen
  - Subject: "Start date confirmation"
  - Last message preview: "Hi Alex, just wanted..."
  - Timestamp
  - Unread badge: (none, customer sent it)
- [ ] Right panel shows:
  - Thread header: Alex Chen
  - Message: "Hi Alex, just wanted to confirm..."
  - Sender: You
  - Timestamp
  - Text input at bottom
  - Send button

### 7.3 Candidate replies

Switch to candidate browser:

1. Navigate to `/messages`

**✅ Check:**
- [ ] Thread list shows one thread
- [ ] Unread badge: 1 (customer's message unread)

2. Click thread

**✅ Check:**
- [ ] Customer's message visible in chat window
- [ ] Unread badge disappears after opening

3. Type reply: "Yes, Nov 18th works perfectly. Looking forward to it!"
4. Click Send

**✅ Check:**
- [ ] Message appears in chat window immediately
- [ ] Shows "Candidate" or your name as sender
- [ ] Timestamp correct

### 7.4 Customer sees reply

Switch to customer browser:

**Option A: Wait 10 seconds for poll to refresh**
**Option B: Manually refresh page**

**✅ Check:**
- [ ] Navbar bell shows unread notification badge: 1
- [ ] Click bell → dropdown shows "New message from Alex Chen"
- [ ] OR: Messages page shows unread badge on thread
- [ ] Click thread → candidate's reply visible

---

## Flow 8 — Ratings (10 min)

### 8.1 End placement

As customer:

1. Navigate to placement detail
2. Click "End placement" button
3. Fill end placement form:
   - Actual end date: Today (or select date)
   - Reason: "Project completed successfully"
4. Confirm

**✅ Check:**
- [ ] Confirmation modal appears
- [ ] Success toast: "Placement ended"
- [ ] Placement status → ENDED_COMPLETED
- [ ] "Rate candidate" button appears

### 8.2 Submit rating

1. Click "Rate candidate"
2. Fill rating form:
   - Overall: 5 stars
   - Technical: 5 stars
   - Communication: 5 stars
   - Professionalism: 5 stars
   - Feedback: "Excellent engineer. Delivered high-quality work on time. Great communication throughout."
3. Submit

**✅ Check:**
- [ ] Star components work (click to set)
- [ ] Success toast: "Rating submitted"
- [ ] Redirects to placement detail
- [ ] "Rate candidate" button now shows "You rated this candidate 5 stars"

### 8.3 View rating on candidate profile

1. Navigate to candidate's profile (from submission or search)

**✅ Check:**
- [ ] Average rating badge: 5.0 ⭐ (1 placement)
- [ ] Recent ratings section shows:
  - Overall: 5 stars
  - Technical: 5/5
  - Communication: 5/5
  - Professionalism: 5/5
  - Feedback: "Excellent engineer..."
  - Date: Today

### 8.4 Candidate rates customer (bilateral)

Switch to candidate browser:

1. Navigate to placement detail
2. Click "Rate customer" (should appear after placement ended)
3. Fill rating:
   - Overall: 5 stars
   - Communication: 5 stars
   - Professionalism: 5 stars
   - Feedback: "Great client. Clear requirements and timely feedback."
4. Submit

**✅ Check:**
- [ ] Same flow as customer rating
- [ ] Success, redirect, confirmation

5. Navigate to customer's profile (if accessible to candidates)

**✅ Check:**
- [ ] Customer's average rating: 5.0 ⭐
- [ ] Candidate's feedback visible

---

## Flow 9 — Admin Console (20 min)

### 9.1 Admin login

Open new incognito window:

1. Login as: `admin@techorbit.test` / password from seed script (check `.env` or script)
2. Navigate to `/admin`

**✅ Check:**
- [ ] Admin dashboard loads
- [ ] Key metrics cards:
  - Pending role applications: 0
  - Open disputes: 0
  - Active placements: 1
  - GMV this month: $4,800 (or $0 if invoice not paid)

### 9.2 Role application flow

**Simulate a role application:**

As a new user (register `crm1@test.com`):

1. Register, verify email, select CRM role
2. Fill CRM application form (if exists) OR just select role
3. View "Application pending approval" message

As admin:

1. Navigate to `/admin/role-applications`

**✅ Check:**
- [ ] Table shows one pending application
  - User: crm1@test.com
  - Role: CRM
  - Status: PENDING
  - Actions: Approve, Reject

2. Click application row → detail page

**✅ Check:**
- [ ] User info visible
- [ ] Application data shown
- [ ] Review notes textarea
- [ ] Approve/Reject buttons

3. Fill review notes: "Verified LinkedIn profile. Approved."
4. Click "Approve"

**✅ Check:**
- [ ] Success toast: "Application approved"
- [ ] Redirects to applications list
- [ ] Application no longer in pending list (or status=APPROVED)

5. Switch to CRM user browser

**✅ Check:**
- [ ] User now has CRM role (check dashboard or navbar)
- [ ] Email notification received: "Your CRM application was approved" (check Mailpit)

### 9.3 User management

As admin:

1. Navigate to `/admin/users`
2. Search for "customer1@test.com"

**✅ Check:**
- [ ] Search returns customer user
- [ ] Table shows: Name, Email, Roles, Status, Joined date
- [ ] Actions dropdown: Suspend, Ban, Reset password

3. Click "Suspend" on customer1
4. Fill suspend modal:
   - Reason: "Testing suspend feature"
   - Duration: 7 days
5. Confirm

**✅ Check:**
- [ ] Success toast: "User suspended"
- [ ] User status updates

6. Switch to customer1 browser, refresh

**✅ Check:**
- [ ] User logged out OR sees "Account suspended" message
- [ ] Cannot access protected pages

### 9.4 Dispute resolution

**Create a dispute (as candidate):**

1. Navigate to placement detail or `/disputes/new`
2. Fill dispute form:
   - Type: TIMESHEET
   - Context: (select the timesheet)
   - Description: "Hours were 45, not 40. Customer approved wrong amount."
3. Submit

**As admin:**

1. Navigate to `/admin/disputes`

**✅ Check:**
- [ ] Table shows one open dispute
  - Type: TIMESHEET
  - Raised by: candidate1@test.com
  - Status: OPEN

2. Click dispute → detail page

**✅ Check:**
- [ ] Dispute info visible
- [ ] Description shown
- [ ] Context link works (links to timesheet)
- [ ] Notes section empty (no notes yet)

3. Add note: "Reviewing timesheet records"
4. Add resolution: "Reviewed timesheet. Hours were correctly logged at 40. No adjustment needed."
5. Click "Resolve"

**✅ Check:**
- [ ] Success toast: "Dispute resolved"
- [ ] Status → RESOLVED
- [ ] Resolution text visible

### 9.5 Audit log

1. Navigate to `/admin/audit-logs`

**✅ Check:**
- [ ] Table shows recent admin actions:
  - USER_SUSPENDED (customer1)
  - ROLE_APPROVED (CRM application)
  - DISPUTE_RESOLVED
- [ ] Filters work: Action, Performed by, Date range
- [ ] Click "Details" → expands row to show metadata JSON
- [ ] "Export to CSV" button visible (test optional)

---

## UI Polish Checklist (60 min)

Go through the app systematically looking for these issues:

### Visual bugs

- [ ] Inconsistent colors (forest green vs other greens)
- [ ] Inconsistent fonts (all using same font family/sizes?)
- [ ] Misaligned elements (buttons not centered, text overflow)
- [ ] Broken responsive design (test at 375px mobile width)
- [ ] Missing spacing (cramped cards, no padding)
- [ ] Ugly buttons (inconsistent sizing, colors, hover states)

### Missing states

- [ ] Loading spinners (pages that fetch data should show loading)
- [ ] Empty states (tables with no data should show "No items yet")
- [ ] Error states (API errors should show user-friendly messages)
- [ ] Success feedback (every mutation should show toast or confirmation)
- [ ] Disabled states (buttons should disable during submit)
- [ ] Form validation errors (show inline, not just on submit)

### Navigation issues

- [ ] Broken breadcrumbs (if you have them)
- [ ] Confusing navbar (links unclear? too many items?)
- [ ] Missing back buttons (user stuck on page with no way back)
- [ ] 404 pages (navigating to `/fake-page` should show nice 404)
- [ ] Unauthorized pages (non-admin visiting `/admin` should redirect)

### Performance issues

- [ ] Slow page loads (>3 seconds? optimize)
- [ ] Janky animations (drag-and-drop stuttering?)
- [ ] Large bundle size (check Network tab for >5MB JS)
- [ ] Unnecessary re-renders (React DevTools Profiler)

### Accessibility issues

- [ ] Missing labels on inputs (screen reader test)
- [ ] Low contrast text (check with axe DevTools)
- [ ] Keyboard navigation broken (tab through forms)
- [ ] Missing alt text on images
- [ ] Buttons without aria-labels

### Content issues

- [ ] Typos (proofread all user-facing text)
- [ ] Inconsistent terminology ("Requirement" vs "Job posting")
- [ ] Missing help text (complex forms need explanations)
- [ ] Error messages unclear ("Error" vs "Bill rate must be between $50-$250/hr")

---

## Bug Tracking (ongoing)

As you find issues, document them:

**Create:** `BUG_LOG.md` in repo root

**Format:**
```markdown
# Bug Log

## High Priority (blocking)

1. **Timesheet approval button doesn't work**
   - Page: `/timesheets/pending`
   - Steps: Click Approve → no response
   - Expected: Timesheet approved, toast shown
   - Actual: Nothing happens
   - Status: FIXED (commit abc123)

## Medium Priority (UX issues)

2. **Match score badge hard to read**
   - Page: Submission detail
   - Issue: Green text on light green background
   - Fix: Use darker green or white text
   - Status: TODO

## Low Priority (polish)

3. **Missing favicon**
   - Browser tab shows default icon
   - Fix: Add favicon.ico
   - Status: TODO
```

---

## Final Checklist

After completing all 9 flows + UI polish:

**Functional:**
- [ ] All 9 flows completed without errors
- [ ] All user actions have feedback (toasts, confirmations)
- [ ] All forms validate properly
- [ ] All calculations are correct (commissions, invoices)
- [ ] Cross-service communication works (12 services talking)
- [ ] Events flowing through RabbitMQ (check RabbitMQ UI)
- [ ] Emails visible in Mailpit

**Visual:**
- [ ] Design system consistent (colors, fonts, spacing)
- [ ] All buttons styled correctly
- [ ] All tables responsive
- [ ] All forms have proper labels
- [ ] No obvious visual bugs

**Quality:**
- [ ] No console errors in browser DevTools
- [ ] No 500 errors in Network tab
- [ ] No unhandled promise rejections in terminal
- [ ] Quality gates still green (lint, typecheck, test)

**Performance:**
- [ ] Pages load in <3 seconds
- [ ] No janky animations
- [ ] Drag-and-drop smooth

---

## Deliverables

After completing this verification:

1. **BUG_LOG.md** — List of issues found + fixes applied
2. **UI_SCREENSHOTS/** — Folder with screenshots of key pages (dashboard, requirement detail, shortlist, placement detail, admin dashboard)
3. **VERIFICATION_REPORT.md** — Summary:
   ```markdown
   # Verification Report
   
   **Date:** [Today]
   **Tester:** [Your name]
   **Duration:** [Hours spent]
   
   ## Flows Tested
   - Customer journey: ✅ PASS
   - Candidate journey: ✅ PASS
   - Interview flow: ✅ PASS
   - Placement creation: ✅ PASS
   - Timesheets/invoicing: ⚠️ PARTIAL (invoice generation cron needs testing)
   - Messaging: ✅ PASS
   - Ratings: ✅ PASS
   - Admin console: ✅ PASS
   
   ## Bugs Found: 12
   - High priority: 2 (FIXED)
   - Medium priority: 6 (4 FIXED, 2 TODO)
   - Low priority: 4 (TODO)
   
   ## Overall Assessment
   Platform is [functional/needs work/broken]. Ready for [beta launch/internal testing/more dev].
   ```

---

## Next Steps After Verification

Based on what you find:

**If 0-5 bugs (mostly polish):**
→ Platform is solid. Ready to wire up real integrations (Stripe, SendGrid, Daily.co) and beta launch.

**If 6-15 bugs (mix of functional + polish):**
→ Spend 1-2 days fixing critical bugs, defer polish to post-launch.

**If 15+ bugs (many functional):**
→ Need a bug-fix sprint before launch. Prioritize by severity, fix blocking issues first.

Come back with your `BUG_LOG.md` and `VERIFICATION_REPORT.md` and I'll help you prioritize fixes and decide if you're ready to launch or need Sprint 10 first.
