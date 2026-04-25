// Demo seed — populates every role with real data so a live walkthrough can
// show populated dashboards + the full marketplace flow.
//
// Creates one user per role (CUSTOMER / CANDIDATE / CRM / SRM / MSME /
// INTERVIEWER), leaves admin@techorbit.test alone (seeded separately), and
// walks a requirement from DRAFT → published → submitted → interview → offer
// → placement → timesheet → invoice. Also seeds a pending role application
// and an open dispute so the admin console has something to act on.
//
// Usage (with the full dev stack running):
//   docker exec techorbit-postgres psql -U techorbit -d techorbit -c \
//     "DELETE FROM identity_user WHERE email LIKE '%@demo.test';"
//   pnpm exec tsx scripts/seed-demo.ts
//
// Credentials printed at the end.

const IDENTITY = process.env.IDENTITY_URL ?? "http://localhost:3002";
const PROFILE = process.env.PROFILE_URL ?? "http://localhost:3004";
const REQUIREMENT = process.env.REQUIREMENT_URL ?? "http://localhost:3005";
const MATCHING = process.env.MATCHING_URL ?? "http://localhost:3006";
const INTERVIEW = process.env.INTERVIEW_URL ?? "http://localhost:3007";
const PLACEMENT = process.env.PLACEMENT_URL ?? "http://localhost:3008";
const PAYMENTS = process.env.PAYMENTS_URL ?? "http://localhost:3009";
const ADMIN = process.env.ADMIN_URL ?? "http://localhost:3014";

const PASSWORD = "correct horse battery staple 42";

type Json = Record<string, unknown>;

async function call(
  url: string,
  method: "POST" | "PATCH" | "GET" | "PUT",
  body?: Json,
  token?: string,
): Promise<Json> {
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: Json = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return parsed;
}

// Fire-and-forget: tries the call, logs failures as warnings but doesn't
// abort the whole seed — useful for optional steps where the backend might
// 400 in ways we don't care about.
async function tryCall(label: string, fn: () => Promise<Json>): Promise<Json | null> {
  try { return await fn(); }
  catch (e) { console.log(`  ⚠ ${label}: ${(e as Error).message.slice(0, 180)}`); return null; }
}

async function register(
  email: string, firstName: string, lastName: string,
): Promise<{ token: string; userId: string }> {
  const res = await call(`${IDENTITY}/api/v1/auth/register`, "POST", {
    email, password: PASSWORD, firstName, lastName,
  });
  const token = res.accessToken as string;
  const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64").toString());
  return { token, userId: payload.sub };
}

async function login(email: string): Promise<string> {
  const res = await call(`${IDENTITY}/api/v1/auth/login`, "POST", { email, password: PASSWORD });
  return res.accessToken as string;
}

async function addRole(token: string, roleType: string): Promise<void> {
  await call(`${IDENTITY}/api/v1/me/roles`, "POST", { roleType }, token);
}

async function registerWithRole(
  email: string, firstName: string, lastName: string, role: string,
): Promise<{ token: string; userId: string }> {
  const { userId } = await register(email, firstName, lastName);
  const initial = await login(email);
  await addRole(initial, role);
  // CRM/SRM/MSME/INTERVIEWER are added as PENDING_VERIFICATION — flip
  // them to ACTIVE so the demo user can actually act in their role.
  // Without this the JWT comes back with empty roles and every gated
  // endpoint rejects them silently.
  const NON_AUTO_ACTIVE = new Set(["CRM", "SRM", "MSME", "INTERVIEWER"]);
  if (NON_AUTO_ACTIVE.has(role)) {
    await activateRole(userId, role);
  }
  // Re-login so the token carries the (now-active) role claim.
  const token = await login(email);
  return { token, userId };
}

// Direct SQL flip of role.status — bypasses the role-application workflow
// because seeded users haven't filed an application; this is demo-only.
async function activateRole(userId: string, roleType: string): Promise<void> {
  const { execSync } = await import("node:child_process");
  execSync(
    `docker exec techorbit-postgres psql -U techorbit -d techorbit -c "UPDATE identity_user_role SET status='ACTIVE', verified_at=NOW() WHERE user_id='${userId}' AND role_type='${roleType}'" >/dev/null`,
    { stdio: "inherit" },
  );
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// Start date for the placement + first timesheet — Monday, 3 weeks ago.
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

async function main(): Promise<void> {
  console.log("\n━━━ User accounts ━━━");

  const customer = await registerWithRole("customer@demo.test", "Cassie", "Customer", "CUSTOMER");
  console.log(`  CUSTOMER    → customer@demo.test (${customer.userId.slice(0, 8)}…)`);

  const candidate = await registerWithRole("candidate@demo.test", "Alex", "Candidate", "CANDIDATE");
  console.log(`  CANDIDATE   → candidate@demo.test (${candidate.userId.slice(0, 8)}…)`);

  const crm = await registerWithRole("crm@demo.test", "Riley", "CRM", "CRM");
  console.log(`  CRM         → crm@demo.test (${crm.userId.slice(0, 8)}…)`);

  const srm = await registerWithRole("srm@demo.test", "Sam", "SRM", "SRM");
  console.log(`  SRM         → srm@demo.test (${srm.userId.slice(0, 8)}…)`);

  const msme = await registerWithRole("msme@demo.test", "Morgan", "MSME", "MSME");
  console.log(`  MSME        → msme@demo.test (${msme.userId.slice(0, 8)}…)`);

  const interviewer = await registerWithRole("interviewer@demo.test", "Iris", "Interviewer", "INTERVIEWER");
  console.log(`  INTERVIEWER → interviewer@demo.test (${interviewer.userId.slice(0, 8)}…)`);

  // Second candidate so the customer's shortlist has more than one card.
  const candidate2 = await registerWithRole("candidate2@demo.test", "Priya", "Patel", "CANDIDATE");
  console.log(`  CANDIDATE#2 → candidate2@demo.test (${candidate2.userId.slice(0, 8)}…)`);

  console.log("\n━━━ Profiles ━━━");

  await tryCall("customer profile", () =>
    call(`${PROFILE}/api/v1/customers/me`, "POST", {
      companyName: "TechCorp Inc",
      legalName: "TechCorp Incorporated",
      industry: "Technology",
      websiteUrl: "https://techcorp.example",
      companySize: "SIZE_50_200",
      ein: "12-3456789",
      billingAddress: {
        line1: "123 Market St", city: "San Francisco",
        state: "CA", postalCode: "94105", country: "US",
      },
    }, customer.token));

  await tryCall("candidate1 profile", () =>
    call(`${PROFILE}/api/v1/candidates/me`, "PATCH", {
      headline: "Full-stack engineer — 8 yrs React/Node",
      bio: "Previously at Airbnb and Stripe. Built consumer + enterprise payments surfaces end-to-end.",
      seniority: "SENIOR",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "GraphQL"],
      workAuthStatus: "US_CITIZEN",
      location: "San Francisco, CA",
      rateMin: 100, rateMax: 140,
      preferRemote: true,
    }, candidate.token));

  await tryCall("candidate2 profile", () =>
    call(`${PROFILE}/api/v1/candidates/me`, "PATCH", {
      headline: "Senior React engineer",
      bio: "10 years shipping consumer web apps. Strong design sense.",
      seniority: "SENIOR",
      skills: ["React", "TypeScript", "GraphQL", "Next.js"],
      workAuthStatus: "GREEN_CARD",
      location: "Austin, TX",
      rateMin: 110, rateMax: 150,
      preferRemote: true,
    }, candidate2.token));

  await tryCall("msme profile", () =>
    call(`${PROFILE}/api/v1/msme/me`, "POST", {
      legalName: "Pine Ridge Consulting LLC",
      dba: "Pine Ridge Consulting",
      ein: "98-7654321",
      yearsInBusiness: 6,
      totalEmployees: 12,
      primaryContactName: "Morgan MSME",
      primaryContactEmail: "morgan@pineridge.example",
    }, msme.token));

  await tryCall("interviewer profile", () =>
    call(`${PROFILE}/api/v1/interviewers/me`, "POST", {
      displayName: "Iris Interviewer",
      headline: "Staff engineer turned interviewer",
      bio: "Staff engineer turned interviewer. Loves deep technical discussions on distributed systems.",
      currentRole: "Staff Engineer",
      currentCompany: "Freelance",
      specializations: ["React", "Node.js", "System Design"],
      seniorityLevelsCoverable: ["SENIOR", "STAFF"],
      perInterviewFeeUsd: 180,
      timezone: "America/Los_Angeles",
    }, interviewer.token));

  console.log("\n━━━ Requirement + submissions ━━━");

  const req = await call(`${REQUIREMENT}/api/v1/requirements`, "POST", {
    title: "Senior Full-Stack Engineer — Dashboard Rebuild",
    description:
      "We're rebuilding our analytics dashboard from Rails to Next.js. Need someone who has shipped React + Node at scale and can own a complex feature end-to-end.",
    techStack: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    seniority: "SENIOR",
    locationType: "REMOTE",
    billRateMinUsd: 100,
    billRateMaxUsd: 140,
    durationWeeks: 26,
    startDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
    openings: 1,
    workAuthAccepted: ["US_CITIZEN", "GREEN_CARD"],
    requiredInterviewCount: 2,
    blindPosting: false,
  }, customer.token);
  const requirementId = req.id as string;
  await call(`${REQUIREMENT}/api/v1/requirements/${requirementId}/publish`, "POST", {}, customer.token);
  console.log(`  published requirement: ${requirementId.slice(0, 8)}…`);

  // Second requirement in DRAFT — shows the "Draft" column in the customer dashboard.
  await tryCall("draft requirement", () =>
    call(`${REQUIREMENT}/api/v1/requirements`, "POST", {
      title: "Data Engineer (Draft — not yet published)",
      description: "Looking for a data engineer to own our ETL pipelines.",
      techStack: ["Python", "Airflow", "Snowflake"],
      seniority: "SENIOR",
      locationType: "HYBRID",
      billRateMinUsd: 90, billRateMaxUsd: 130,
      durationWeeks: 12,
      startDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
      openings: 1,
      workAuthAccepted: ["US_CITIZEN"],
      requiredInterviewCount: 1,
      blindPosting: false,
    }, customer.token));

  // Submission from candidate1 (self-submitted)
  const submission1 = await call(`${MATCHING}/api/v1/submissions`, "POST", {
    requirementId,
    candidateId: candidate.userId,
    coverNote:
      "I've built analytics dashboards at Airbnb and Stripe — happy to walk through architecture decisions for your rebuild.",
    proposedBillRate: 130,
  }, candidate.token);
  console.log(`  submission #1 (candidate): ${(submission1.id as string).slice(0, 8)}…`);

  // Submission from candidate2
  const submission2 = await tryCall("candidate2 submission", () =>
    call(`${MATCHING}/api/v1/submissions`, "POST", {
      requirementId,
      candidateId: candidate2.userId,
      coverNote: "Interested — I've shipped similar migrations at previous engagements.",
      proposedBillRate: 120,
    }, candidate2.token));
  if (submission2) console.log(`  submission #2 (candidate2): ${(submission2.id as string).slice(0, 8)}…`);

  console.log("\n━━━ Shortlist: submission #1 → INTERVIEWING ━━━");

  // Pipeline states: SUBMITTED → SCREENING → INTERVIEWING → OFFER → PLACED
  for (const status of ["SCREENING", "INTERVIEWING"]) {
    await tryCall(`move to ${status}`, () =>
      call(`${MATCHING}/api/v1/submissions/${submission1.id}/status`, "PATCH",
        { status }, customer.token));
  }

  console.log("\n━━━ Interview scheduled + completed ━━━");

  const scheduledStart = new Date(Date.now() + 2 * 86400_000); // +2 days
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60_000);
  const iv = await tryCall("schedule interview", () =>
    call(`${INTERVIEW}/api/v1/interviews`, "POST", {
      requirementId,
      submissionId: submission1.id,
      candidateId: candidate.userId,
      interviewerUserId: interviewer.userId,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    }, customer.token));
  if (iv) console.log(`  interview: ${(iv.id as string).slice(0, 8)}…`);

  if (iv) {
    await tryCall("start interview", () =>
      call(`${INTERVIEW}/api/v1/interviews/${iv.id}/start`, "POST", {}, interviewer.token));
    await tryCall("complete interview", () =>
      call(`${INTERVIEW}/api/v1/interviews/${iv.id}/end`, "POST", {}, interviewer.token));
    // Scorecard so the interview detail page has data.
    await tryCall("scorecard", () =>
      call(`${INTERVIEW}/api/v1/scorecards`, "POST", {
        interviewId: iv.id,
        recommendation: "STRONG_YES",
        technicalScore: 5, communicationScore: 5,
        problemSolvingScore: 5, culturalFitScore: 4,
        freeformFeedback: "Excellent technical depth. Shipped similar migrations before; would hire.",
        wouldHireAgain: true,
      }, interviewer.token));
  }

  console.log("\n━━━ Submission → OFFER → placement ━━━");

  await tryCall("move to OFFER", () =>
    call(`${MATCHING}/api/v1/submissions/${submission1.id}/status`, "PATCH",
      { status: "OFFER" }, customer.token));

  const startDate = mondayOf(new Date(Date.now() - 21 * 86400_000));
  const endDate = new Date(startDate.getTime() + 26 * 7 * 86400_000);
  const placementResult = await tryCall("create placement", () =>
    call(`${PLACEMENT}/api/v1/placements`, "POST", {
      submissionId: submission1.id,
      engagementType: "W2",
      billRateUsd: 120,
      payRateUsd: 90,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }, customer.token));
  const placementId = (placementResult?.placement as Json | undefined)?.id as string | undefined;
  if (placementId) console.log(`  placement: ${placementId.slice(0, 8)}…`);

  console.log("\n━━━ Timesheets (weeks 1-3) ━━━");

  console.log(`  placementId=${placementId ?? "(missing)"}`);
  if (placementId) {
    for (let i = 0; i < 3; i++) {
      const weekStart = new Date(startDate.getTime() + i * 7 * 86400_000);
      const ts = await tryCall(`timesheet week ${i + 1}`, () =>
        call(`${PAYMENTS}/api/v1/timesheets`, "POST", {
          placementId,
          weekStartDate: weekStart.toISOString(),
          hoursWorked: 40,
          description: `Week ${i + 1}: dashboard API + UI work`,
        }, candidate.token));
      if (ts) {
        console.log(`  timesheet ${i + 1}: ${(ts.id as string).slice(0, 8)}…`);
        if (i < 2) {
          await tryCall(`approve timesheet ${i + 1}`, () =>
            call(`${PAYMENTS}/api/v1/timesheets/${ts.id}/approve`, "POST", {}, customer.token));
          console.log(`  approved timesheet ${i + 1}`);
        }
      }
    }
  }

  console.log("\n━━━ Admin demo data ━━━");

  // Pending role application (CRM applicant awaiting review)
  const applicant = await registerWithRole(
    "applicant@demo.test", "Avery", "Applicant", "CANDIDATE",
  );
  await tryCall("CRM application", () =>
    call(`${ADMIN}/api/v1/role-applications`, "POST", {
      requestedRole: "CRM",
      applicationData: {
        linkedinUrl: "https://linkedin.com/in/averyapplicant",
        referralSource: "Friend at Stripe",
        companiesWorkedWith: ["Acme Corp", "Globex", "Initech"],
      },
    }, applicant.token));
  console.log(`  pending role application: applicant@demo.test → CRM`);

  // Open dispute — something for the admin to resolve
  await tryCall("dispute", () =>
    call(`${ADMIN}/api/v1/disputes`, "POST", {
      type: "TIMESHEET",
      contextType: "TIMESHEET",
      contextId: "11111111-1111-1111-1111-111111111111",
      description:
        "Customer approved 40 hours but I worked 45 — the extra time was a weekend migration that wasn't scoped in the original plan.",
    }, candidate.token));
  console.log(`  open dispute: candidate → timesheet hours`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEMO SEED COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Password for every demo user:`);
  console.log(`    "${PASSWORD}"`);
  console.log(``);
  console.log(`  Log in at http://localhost:3000/login as any of:`);
  console.log(`    • admin@techorbit.test  (ADMIN, TestAdminPass1234)`);
  console.log(`    • customer@demo.test    (CUSTOMER, TechCorp Inc)`);
  console.log(`    • candidate@demo.test   (CANDIDATE, Alex Chen)`);
  console.log(`    • candidate2@demo.test  (CANDIDATE, Priya Patel)`);
  console.log(`    • crm@demo.test         (CRM, Riley)`);
  console.log(`    • srm@demo.test         (SRM, Sam)`);
  console.log(`    • msme@demo.test        (MSME, Pine Ridge Consulting)`);
  console.log(`    • interviewer@demo.test (INTERVIEWER, Iris)`);
  console.log(`    • applicant@demo.test   (pending CRM application)`);
  console.log(`  Invoice total will generate on Monday ${money(40 * 120 * 2)} for 2 approved weeks.`);
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err);
  process.exit(1);
});
