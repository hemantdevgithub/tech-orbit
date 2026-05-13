# Sprint 6.5 — UI Polish & End-to-End Verification

You completed Sprint 6 (placements + Value Chain + commissions). Before Sprint 7 (money flows), polish the UI and verify the full marketplace flow works end-to-end.

Continue on `sprint/6-placements` or create `sprint/6.5-polish` (your call).

**Time estimate:** 1-2 days total

---

## Task 1 — Platform fee breakdown transparency (2 hours)

**Problem:** When CRM or SRM attribution is missing, the platform fee increases (absorbs the unfilled slot). The UI should explain WHY the platform fee is 20% instead of the baseline 12%.

### Where to add this

**Location 1: Hire candidate flow (commission preview sidebar)**

When showing the commission breakdown to the customer BEFORE creating the placement:

**Current (probably):**
```
Commission Breakdown:
├─ CRM: $9.60/hr (8%)
├─ SRM: $5.00/hr (5%)
├─ Platform: $14.40/hr (12%)
└─ Candidate pay: $90.00/hr (75%)
```

**If CRM is missing:**
```
Commission Breakdown:
├─ CRM: None attributed
├─ SRM: $5.00/hr (5%)
├─ Platform: $20.00/hr (20%)
│   ├─ Base platform fee: $12.00/hr (12%)
│   └─ Unattributed CRM slot: +$8.00/hr (+8%)
└─ Candidate pay: $90.00/hr (75%)
```

**If both CRM and SRM are missing:**
```
Commission Breakdown:
├─ CRM: None attributed
├─ SRM: None attributed
├─ Platform: $27.00/hr (27%)
│   ├─ Base platform fee: $12.00/hr (12%)
│   ├─ Unattributed CRM slot: +$8.00/hr (+8%)
│   └─ Unattributed SRM slot: +$5.00/hr (+5%)
└─ Candidate pay: $90.00/hr (75%)
```

**Location 2: Placement detail page (Value Chain section)**

Add a tooltip or info icon next to "Platform: 20%" that explains:
```
Platform fee breakdown:
• Base platform fee: 12%
• Unattributed CRM commission: +8%

The platform absorbs commissions for roles that were not attributed 
during this placement's creation. This ensures 100% of revenue is 
accounted for while maintaining transparent splits.
```

### Implementation

**In the commission preview component:**

```tsx
function CommissionPreview({ commissionRules, billRateUsd }) {
  const platformRules = commissionRules.filter(r => r.slot === 'PLATFORM');
  const platformPercent = platformRules.reduce((sum, r) => 
    sum + (r.percentOfBillRate || 0), 0
  );
  
  const basePlatformPercent = 0.12; // baseline
  const absorptionPercent = platformPercent - basePlatformPercent;
  
  return (
    <div>
      {/* ... CRM, SRM rows ... */}
      
      <div className="flex justify-between">
        <span>Platform</span>
        <span>${(billRateUsd * platformPercent).toFixed(2)}/hr ({(platformPercent * 100).toFixed(0)}%)</span>
      </div>
      
      {absorptionPercent > 0 && (
        <div className="ml-4 text-sm text-sage-500">
          <div>Base platform fee: ${(billRateUsd * basePlatformPercent).toFixed(2)}/hr (12%)</div>
          <div>Unattributed slots: +${(billRateUsd * absorptionPercent).toFixed(2)}/hr (+{(absorptionPercent * 100).toFixed(0)}%)</div>
        </div>
      )}
      
      {/* ... Candidate pay row ... */}
    </div>
  );
}
```

**Verify:**
1. Create a placement with no CRM attribution → see breakdown showing "Unattributed CRM slot: +8%"
2. Create a placement with no SRM attribution → see breakdown showing "Unattributed SRM slot: +5%"
3. Create a placement with both attributed → see only "Platform: 12%"

**Commit:**
```
feat(web): add platform fee breakdown transparency

When CRM/SRM attribution is missing, show breakdown of platform 
fee absorption in hire flow preview and placement detail page.

Maintains commission transparency promise by explaining why 
platform fee varies from baseline 12%.
```

---

## Task 2 — Full end-to-end verification (3-4 hours)

Walk through the COMPLETE marketplace flow from signup to placement creation. This is more comprehensive than Sprint 5.5's verification because it includes the hire flow.

### Setup (5 min)

```bash
# Terminal 1 — Infrastructure
docker-compose up -d

# Terminal 2 — All services
pnpm dev

# Wait for all services to start
# Verify in Terminal 2: identity, profile, requirement, matching, interview, placement all show "listening on port..."
```

Open browser to `http://localhost:3000`

### Flow 1 — Customer journey (30 min)

**Step 1: Sign up + onboard**
1. Register as `customer@test.com` / `Test123!`
2. Verify email (check Mailpit at localhost:8025)
3. Select CUSTOMER role
4. Complete company profile:
   - Company name: "TechCorp Inc"
   - Industry: Technology
   - Website: https://techcorp.example
   - EIN: 123456789
   - Save
5. **Verify:** Dashboard shows "Profile complete" badge

**Step 2: Post requirement**
1. Navigate to `/requirements/new`
2. Fill 3-step form:
   - **Step 1:** Title: "Senior Full-Stack Engineer", Description: "React + Node expert needed", Tech: React + Node.js + TypeScript, Seniority: Senior
   - **Step 2:** Remote, Rate: $100-140/hr, Duration: 26 weeks, Start: 2 weeks from today, Openings: 1
   - **Step 3:** Work auth: US Citizen + Green Card, Interviews: 2, Blind posting: No
3. Click "Publish"
4. **Verify:** Requirement detail page shows status: OPEN

**Step 3: Optionally attribute a CRM** (skip for testing "no CRM" scenario)
- If you want to test WITH CRM: register a second user as CRM, have them claim attribution, approve it
- If testing WITHOUT CRM: proceed to next step

**Checkpoint:** Does `/requirements` browse list show the published requirement?

### Flow 2 — Candidate journey (20 min)

**Step 1: Sign up + onboard**
1. Register as `candidate@test.com` / `Test123!`
2. Verify email
3. Select CANDIDATE role
4. Complete profile:
   - Name: "Alex Chen"
   - Headline: "Full-stack engineer with 8 years experience"
   - Skills (primary): React, Node.js, TypeScript (MATCH the requirement)
   - Skills (secondary): PostgreSQL, AWS
   - Seniority: Senior
   - Location: San Francisco, CA
   - Remote OK: Yes
   - Work auth: US Citizen
   - Years experience: 8
   - Hourly rate expectation: $120
   - Resume: (upload a PDF or skip)
   - Save
5. **Verify:** Dashboard shows "Profile complete"

**Step 2: Submit to requirement**
1. Navigate to `/requirements` browse
2. Find "Senior Full-Stack Engineer" requirement
3. Click it → requirement detail page
4. **Verify:** Match score badge is visible (should be 85-95 because skills/seniority/location/work auth all match)
5. Click "Submit candidate" (or "Submit" button)
6. Fill cover note: "I have 8 years of full-stack experience including React and Node.js at scale. I've built..."
7. Submit
8. **Verify:** "Submission successful" toast appears
9. **Verify:** Redirected back to requirement detail, submission is visible (or navigate to own submissions list)

**Checkpoint:** Does the candidate see their submission with match score?

### Flow 3 — Customer manages shortlist (15 min)

**As customer@test.com:**

1. Navigate to `/requirements/[id]/shortlist` (the requirement you posted)
2. **Verify:** Kanban board shows submission in "Submitted" column
3. **Verify:** Submission card shows:
   - Candidate name: Alex Chen
   - Match score: 85-95 (green badge)
   - Skills pills: React, Node.js, TypeScript
   - Submitted date
4. Drag submission from "Submitted" → "Screening"
5. **Verify:** Card moves smoothly
6. Refresh page → **Verify:** Still in Screening column
7. Drag submission from "Screening" → "Interviewing"
8. **Verify:** Status updates

**Checkpoint:** Does the drag-and-drop work smoothly? Do status transitions persist?

### Flow 4 — Schedule + conduct interview (20 min)

**As customer@test.com:**

1. From the shortlist kanban, click the submission card in "Interviewing" column
2. On submission detail page, click "Schedule Interview"
3. Interview setup:
   - Type: "I'll conduct this myself" (self-conduct)
   - Date: Tomorrow
   - Time: 2:00 PM
   - Duration: 1 hour
4. Confirm
5. **Verify:** "Interview scheduled" confirmation
6. Navigate to `/interviews` (or dashboard) → see the interview listed with status: SCHEDULED

**Conduct the interview:**

7. On the interview detail page, click "Join call"
8. **Verify:** Redirected to `/interviews/[id]/call`
9. **Verify:** Mock Daily.co room URL or iframe visible
10. Click "End call" (or similar action)
11. **Verify:** Interview status transitions to COMPLETED
12. **Verify:** Redirected back to interview detail or prompted to submit scorecard

**Submit scorecard:**

13. Navigate to `/interviews/[id]/scorecard` (or click "Submit Scorecard" from interview detail)
14. Fill scorecard:
    - Recommendation: YES (or STRONG_YES)
    - Technical: 5 stars
    - Communication: 5 stars
    - Problem solving: 4 stars
    - Cultural fit: 5 stars
    - Feedback: "Excellent technical skills, clear communicator, strong problem-solving approach. Would recommend for hire."
    - Red flags: (leave empty)
    - Would hire again: Yes
15. Submit
16. **Verify:** "Scorecard submitted" toast
17. Navigate back to interview detail → **Verify:** Scorecard is visible to customer

**Checkpoint:** Did the interview lifecycle work? Is the scorecard visible?

### Flow 5 — Hire the candidate (30 min) — THE NEW PART

**As customer@test.com:**

1. From the shortlist kanban, drag the submission to "Offer" column
2. Click the submission card → submission detail page
3. Click "Hire Candidate" (or similar button)
4. **Verify:** Redirected to `/submissions/[id]/hire` (or similar hire flow URL)

**Fill hire form:**

5. Engagement type: W-2
6. Bill rate: $120/hr
7. Pay rate: $90/hr (75% of bill rate)
8. Start date: 2 weeks from today
9. End date: Start date + 26 weeks (requirement duration)
10. **CRITICAL: Commission preview sidebar should be visible showing:**
    ```
    Commission Breakdown (estimated):
    ├─ CRM: None attributed
    ├─ SRM: None attributed (candidate self-submitted)
    ├─ Platform: $27/hr (27%)
    │   ├─ Base: $12/hr (12%)
    │   ├─ Unattributed CRM: +$8/hr (+8%)
    │   └─ Unattributed SRM: +$5/hr (+5%)
    ├─ Interviewer: $150 (one-time, you)
    └─ Candidate: $90/hr (75%)
    
    Total bill rate: $120/hr
    Your weekly cost: $4,800 (40 hrs)
    26-week total: $124,800
    ```
11. **Verify:** The breakdown shows "Unattributed CRM" and "Unattributed SRM" with +8% and +5%
12. Click "Create Placement" (or "Hire")
13. **Verify:** "Placement created" toast
14. **Verify:** Redirected to `/placements/[id]`

**Verify placement detail page:**

15. **Hero header** should show:
    - Candidate name: Alex Chen
    - Engagement type: W-2
    - Status: ACTIVE
    - Start date → End date
    - Bill rate: $120/hr
    - Pay rate: $90/hr
16. **Contract details section:**
    - Bill rate: $120/hr
    - Pay rate: $90/hr
    - Start: [date]
    - End: [date]
    - Duration: 26 weeks
17. **Value Chain visualization:**
    - Should show: Customer (TechCorp Inc) → [Confidential CRM] → [Confidential SRM] → Candidate (Alex Chen)
    - Platform node should show 27% (with breakdown tooltip/info icon)
    - Interviewer side-node should show "You" with $150 fee
18. **Actions section:**
    - "End placement" button visible (customer-only)
    - "View timesheets" button (disabled or Sprint 7 tooltip)

**Checkpoint:** Does the Value Chain graph render correctly? Is the platform fee breakdown visible?

### Flow 6 — Candidate views placement (10 min)

**As candidate@test.com:**

1. Navigate to `/dashboard`
2. **Verify:** Dashboard shows "Current placement" card with:
   - Customer: TechCorp Inc
   - Role: Senior Full-Stack Engineer
   - Pay rate: $90/hr
   - Start date
3. Click "View details" → navigate to `/placements/[id]`
4. **Verify:** Placement detail page shows:
   - Customer name: TechCorp Inc
   - Pay rate: $90/hr (visible)
   - **Value Chain:** Customer → [Confidential] → [Confidential] → You ($90/hr)
   - CRM/SRM commissions: NOT visible (redacted as "Confidential")
   - Platform fee: NOT visible
5. **Verify:** "End placement" button NOT visible (candidate can't end placement)

**Checkpoint:** Is Value Chain visibility filtering working? Candidate sees ONLY customer + own pay rate.

### Flow 7 — Optional: Test with CRM attribution (20 min)

If you want to verify the full Value Chain with all slots filled:

1. Register a third user as `crm@test.com`, role: CRM
2. Have CRM claim attribution on the requirement (before posting or via settings)
3. Customer approves CRM attribution
4. Repeat Flow 1-6 with a NEW requirement + candidate
5. **Verify:** Commission preview shows:
   ```
   ├─ CRM: $9.60/hr (8%)
   ├─ SRM: None attributed
   ├─ Platform: $17/hr (17%)
   │   ├─ Base: $12/hr (12%)
   │   └─ Unattributed SRM: +$5/hr (+5%)
   └─ Candidate: $90/hr (75%)
   ```
6. **Verify:** Value Chain graph shows: Customer → CRM (name visible) → [Confidential SRM] → Candidate
7. Log in as CRM → view placement → **Verify:** CRM sees own commission ($9.60/hr), but NOT SRM or Platform details

**Checkpoint:** Do all visibility permutations work correctly?

---

## Task 3 — Report findings (30 min)

After completing all 7 flows (or 6 if skipping Flow 7), document:

### What worked perfectly:
- [List flows that passed without issues]

### What broke or had bugs:
- [List any 404s, 500s, broken UI, incorrect calculations]
- Include: which flow, which step, what happened vs expected

### UI/UX issues (not bugs, but confusing):
- [List anything that worked but was unclear, hard to find, or awkward]
- Examples: missing tooltips, unclear button labels, inconsistent terminology

### Commission calculation verification:

**Test case 1: No CRM, no SRM (candidate self-submitted)**
- Bill rate: $120/hr
- Pay rate: $90/hr
- Expected breakdown:
  - Platform: $27/hr (12% base + 8% CRM + 5% SRM = 25%, but wait... this doesn't match your "20% when CRM missing" note)
  
**WAIT — clarify this math:**

If Platform is RESIDUAL in W-2, the math should be:
```
Total = 100% of bill rate
Candidate W-2 pay = 75% (fixed)
Remaining 25% = CRM (8%) + SRM (5%) + Platform (12%)

If CRM missing: Platform absorbs CRM's 8% → Platform gets 12% + 8% = 20%
If SRM missing: Platform absorbs SRM's 5% → Platform gets 12% + 5% = 17%
If both missing: Platform absorbs both → Platform gets 12% + 8% + 5% = 25%
```

So for the "no CRM, no SRM" test case:
- Expected: Platform 25% ($30/hr), Candidate 75% ($90/hr)

**Verify this in the UI commission preview and placement detail page.**

**Test case 2: CRM attributed, no SRM**
- Expected: CRM 8% ($9.60/hr), Platform 17% ($20.40/hr), Candidate 75% ($90/hr)

**Test case 3: CRM + SRM both attributed**
- Expected: CRM 8% ($9.60/hr), SRM 5% ($6/hr), Platform 12% ($14.40/hr), Candidate 75% ($90/hr)

**Calculate manually and verify against UI for all 3 cases.**

### Screenshots (recommended):

- Commission preview sidebar during hire flow
- Placement detail page with Value Chain graph
- Platform fee breakdown tooltip/info
- Value Chain as seen by candidate (redacted view)

---

## Task 4 — Polish fixes (variable time)

Based on Task 3 findings, fix:

**High priority (blocking Sprint 7):**
- Any broken flows (404s, 500s, calculation errors)
- Commission calculation bugs (wrong percentages, wrong totals)
- Value Chain visibility bugs (candidate seeing vendor commissions, etc.)

**Medium priority (polish):**
- Missing tooltips on platform fee breakdown
- Inconsistent currency formatting ($120 vs $120.00)
- Missing loading states (commission preview while fetching data)

**Low priority (defer to Sprint 7+):**
- Visual polish (button spacing, color tweaks)
- Empty states refinement
- Mobile responsiveness (if not already handled)

**Commit each fix separately:**
```
fix(web): correct platform fee calculation for no-CRM scenario

Platform absorbs unfilled CRM slot (8%) → total 20% instead of 12%.
Updates commission preview and placement detail display.
```

---

## Task 5 — Final verification + commit (1 hour)

After all fixes from Task 4:

1. Re-run the full Flow 1-6 from Task 2
2. **Verify:** All 6 flows pass without issues
3. **Verify:** Commission calculations match manual calculations for all 3 test cases
4. **Verify:** Value Chain visibility filtering works for all roles
5. Run quality gates:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
6. **Verify:** All pass with 0 errors

**Final commit:**
```
chore: Sprint 6.5 polish and verification complete

- Added platform fee breakdown transparency in hire flow
- Verified full E2E flow: signup → post → submit → interview → hire
- Tested 3 commission scenarios (no CRM/SRM, partial, full)
- Value Chain visibility filtering confirmed for all roles
- All quality gates passing

Ready for Sprint 7 (timesheets + invoicing + payroll).
```

---

## Definition of Done (Sprint 6.5)

- [ ] Platform fee breakdown shows "Base + Unattributed slots" when CRM/SRM missing
- [ ] Full E2E flow (signup → hire) completes without errors
- [ ] Commission calculations verified manually for 3 test cases (match UI exactly)
- [ ] Value Chain visibility works: customer sees all, candidate sees only pay rate, vendors see partial
- [ ] All 7 flows from Task 2 documented as passing
- [ ] Any bugs found and fixed
- [ ] Quality gates green (lint, typecheck, test, build)
- [ ] Screenshots captured for key UI states

---

## After Sprint 6.5

You'll have:
- ✅ A fully verified marketplace (end-to-end tested in browser)
- ✅ Transparent commission breakdowns (customers understand why platform fee varies)
- ✅ Confidence that Value Chain visibility filtering is bulletproof
- ✅ Clean foundation for Sprint 7 (money flows)

**Then Sprint 7** — the last "hard" sprint. Timesheets + invoicing + payroll integration. After Sprint 7, the marketplace can process real money.

**Progress after Sprint 6.5:** Still ~69% by sprint count, ~65% by difficulty.

**Remaining:** Sprints 7 (money flows), 8 (messaging/notifications), 9 (admin), 10 (production hardening).

---

Once Sprint 6.5 is complete, report back:
- Did all 7 flows pass?
- What bugs were found and fixed?
- Commission calculations: do they match the manual test cases exactly?

Then we'll proceed to Sprint 7.
