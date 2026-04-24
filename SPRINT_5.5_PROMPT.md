# Sprint 5.5 — UI Verification Checkpoint

**Purpose:** Fix the interviewer dashboard navigation gap and verify the full Sprints 1-5 flow works end-to-end in a browser before deciding whether to continue to Sprint 6.

**Time estimate:** 30-45 minutes total

Branch: Continue on `sprint/5-interviews` or create a tiny `sprint/5.5-ui-check` if you want clean separation.

---

## Task 1 — Fix interviewer dashboard navigation (5 min)

**Problem:** `/dashboard/interviewer/availability` page exists but isn't linked from the main interviewer dashboard.

**Fix:**

In the interviewer dashboard component (likely `apps/web/src/components/dashboard/interviewer-dashboard.tsx` or similar):

Find where you render the availability section or actions area, and add:

```tsx
<Button href="/dashboard/interviewer/availability" variant="secondary">
  <Calendar className="h-4 w-4 mr-2" />
  Manage Availability
</Button>
```

Or if you have a card-based layout:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Availability</CardTitle>
  </CardHeader>
  <CardBody>
    <p className="text-sm text-sage-500 mb-4">
      Set your available days and hours so customers can book interviews.
    </p>
    <Button href="/dashboard/interviewer/availability">
      Manage Availability
    </Button>
  </CardBody>
</Card>
```

**Verify:**
- Navigate to `/dashboard` as an interviewer
- See the "Manage Availability" button
- Click it → lands on `/dashboard/interviewer/availability`

**Commit:**
```
fix(web): add Manage Availability link to interviewer dashboard

Interviewer dashboard now includes a clear path to the
availability management page introduced in Sprint 5.
```

---

## Task 2 — End-to-end flow verification (30 min)

**Purpose:** Manually walk through the full marketplace flow as if you were a real user. This catches integration bugs that tests miss (UI state issues, navigation flows, UX gaps).

### Setup (5 min)

```bash
# Terminal 1 — Infrastructure
docker-compose up -d

# Terminal 2 — Services
pnpm dev

# Wait until all services print "listening on port..."
```

Open browser to `http://localhost:3000`

### Flow 1 — Customer posts requirement (5 min)

**As a customer:**

1. Sign up with `customer1@test.com` / `Test123!`
2. Select CUSTOMER role
3. Complete company profile:
   - Company name: "TechCorp Inc"
   - Industry: Technology
   - EIN: (any 9 digits)
   - Save
4. Navigate to `/requirements/new`
5. Post a requirement:
   - **Step 1:** Title: "Senior React Developer", Description: "Need a React expert", Tech: React + TypeScript, Seniority: Senior
   - **Step 2:** Remote, Rate: $100-150/hr, Duration: 12 weeks, Start: 2 weeks from today
   - **Step 3:** Work auth: any, Interviews: 2
   - Click "Publish"
6. **Verify:** Redirected to requirement detail page showing status: OPEN

**Checkpoint:** Does the requirement appear in `/requirements` browse list?

### Flow 2 — Candidate submits (5 min)

**As a candidate (new user):**

1. Sign up with `candidate1@test.com` / `Test123!`
2. Select CANDIDATE role
3. Complete profile:
   - Name: "Jane Doe"
   - Skills: React, TypeScript, Node.js (match the requirement)
   - Seniority: Senior
   - Location: Remote OK
   - Work auth: US Citizen
   - Years experience: 7
   - Save
4. Navigate to `/requirements` browse
5. Find the "Senior React Developer" requirement
6. Click it → requirement detail page
7. Click "Submit candidate" button
8. Fill cover note: "I have 7 years of React experience including..."
9. Submit
10. **Verify:** "Submission successful" toast appears

**Checkpoint:** Does the candidate see their submission if they navigate to `/requirements/[id]` again?

### Flow 3 — Customer views shortlist (3 min)

**As customer1:**

1. Navigate to `/requirements/[id]/shortlist`
2. **Verify:** Kanban board shows the submission in "Submitted" column
3. **Verify:** Submission card shows:
   - Candidate name: Jane Doe
   - Match score: (should be 80-100 because skills/seniority/location all match)
   - Skills pills: React, TypeScript, Node.js
4. Drag the submission card from "Submitted" to "Screening"
5. **Verify:** Card moves, status updates (refresh page → still in Screening column)

**Checkpoint:** Does the match score make sense? (High score because candidate matches well)

### Flow 4 — Schedule interview (5 min)

**As customer1:**

1. From the shortlist, drag the submission to "Interviewing" column
2. Click the submission card → submission detail page
3. Click "Schedule Interview" button (or similar action)
4. Choose interview type: "I'll conduct this myself" (self-conduct)
5. Pick date/time: tomorrow at 2pm
6. Confirm
7. **Verify:** "Interview scheduled" confirmation
8. Navigate to interviews list (or dashboard) → see the scheduled interview

**Checkpoint:** Does the interview appear with status: SCHEDULED?

### Flow 5 — Conduct interview (5 min)

**As customer1:**

1. Navigate to `/interviews/[id]`
2. Click "Join call" or similar button
3. **Verify:** Video call page loads (`/interviews/[id]/call`)
4. **Verify:** Daily.co iframe is visible (or mock video placeholder if no API key)
5. Click "End call" button
6. **Verify:** Redirected back to interview detail with status: COMPLETED

**Checkpoint:** Did the interview transition from SCHEDULED → IN_PROGRESS → COMPLETED?

### Flow 6 — Submit scorecard (5 min)

**As customer1:**

1. From the completed interview detail page, click "Submit Scorecard"
2. Fill scorecard:
   - Recommendation: YES
   - Technical: 4 stars
   - Communication: 5 stars
   - Problem solving: 4 stars
   - Cultural fit: 5 stars
   - Feedback: "Strong React skills, clear communicator, would recommend for hire"
   - Would hire again: Yes
3. Submit
4. **Verify:** "Scorecard submitted" toast
5. **Verify:** Interview detail page now shows the scorecard (customer can view, candidate cannot)

**Checkpoint:** Does the scorecard display correctly with star ratings visible?

### Flow 7 — Verify candidate cannot see scorecard (2 min)

**As candidate1:**

1. Navigate to `/interviews/[id]` (same interview)
2. **Verify:** Scorecard is NOT visible (403 or just hidden section)

**Checkpoint:** Candidate cannot see confidential feedback — authz working.

---

## Task 3 — Report findings (5 min)

After completing all 7 flows, report back:

**What worked:**
- [List the flows that worked perfectly]

**What broke:**
- [List any 404s, 500s, UI bugs, navigation issues]
- Include: which flow, what you clicked, what happened vs expected

**What was confusing:**
- [List any UX issues: unclear buttons, missing states, weird flows]

**Screenshots (optional but helpful):**
- Shortlist kanban board showing submissions
- Submission detail page with match score
- Video call page
- Scorecard form

---

## Expected outcome

If **all 7 flows work cleanly:**
- You have a genuinely functional marketplace
- Sprint 6 is a safe next step (you're building on solid foundation)
- Any UX polish issues can be batched into a future sprint

If **2-3 flows have bugs:**
- These are likely integration issues (service-to-service calls, event emission, authz)
- Fix them before Sprint 6 (Sprint 6 depends on these flows working)
- Budget 1-2 days for fixes

If **5+ flows broken:**
- There's a systemic issue (likely service wiring or event plumbing)
- Don't start Sprint 6 until the foundation is stable
- We'll diagnose together

---

## Commit

After fixes (if any):
```
fix(web): polish Sprints 1-5 end-to-end flows

- Fixed interviewer dashboard nav link
- [list other fixes if any]

Verified full flow: signup → profile → post req → submit 
→ shortlist → schedule → interview → scorecard.
```

---

Once Task 3 is complete, come back with your findings and we'll discuss:
1. Whether to proceed to Sprint 6 immediately
2. Whether to take a strategic pause (ship smaller MVP, fundraise, etc.)
3. What the realistic path to production looks like from here
