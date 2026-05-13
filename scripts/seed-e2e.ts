// End-to-end seed. Populates the local dev database with a realistic set of
// entities so the web app has something to render when you click around:
//
//   - customer1@test.com (CUSTOMER) + a company profile
//   - candidate1@test.com (CANDIDATE) + a candidate profile
//   - one published requirement owned by customer1
//   - one submission from candidate1 on that requirement
//
// Idempotent-ish: re-running will fail on duplicate emails. Truncate
// identity_user + related tables before re-running, or just use new emails.
//
// Usage (with services running on default ports):
//   pnpm exec tsx scripts/seed-e2e.ts

const IDENTITY = process.env.IDENTITY_URL ?? "http://localhost:3002";
const PROFILE = process.env.PROFILE_URL ?? "http://localhost:3004";
const REQUIREMENT = process.env.REQUIREMENT_URL ?? "http://localhost:3005";
const MATCHING = process.env.MATCHING_URL ?? "http://localhost:3006";

const PASSWORD = "correct horse battery staple 42";

type Json = Record<string, unknown>;

async function call(
  url: string,
  method: "POST" | "PATCH" | "GET",
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

async function register(email: string, firstName: string, lastName: string): Promise<{ token: string; userId: string }> {
  const res = await call(`${IDENTITY}/api/v1/auth/register`, "POST", {
    email, password: PASSWORD, firstName, lastName,
  });
  const token = res.accessToken as string;
  const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64").toString());
  return { token, userId: payload.sub };
}

async function addRole(token: string, roleType: string): Promise<void> {
  await call(`${IDENTITY}/api/v1/me/roles`, "POST", { roleType }, token);
}

async function loginAgain(email: string): Promise<string> {
  const res = await call(`${IDENTITY}/api/v1/auth/login`, "POST", { email, password: PASSWORD });
  return res.accessToken as string;
}

async function main(): Promise<void> {
  console.log("→ Registering customer1@test.com");
  const customer = await register("customer1@test.com", "Cassie", "Customer");
  console.log(`  userId=${customer.userId}`);
  await addRole(customer.token, "CUSTOMER");
  // Re-login to pick up new role claims in the token.
  const customerToken = await loginAgain("customer1@test.com");
  console.log("  CUSTOMER role added");

  console.log("→ Creating customer company profile");
  await call(`${PROFILE}/api/v1/customers/me`, "POST", {
    companyName: "TechCorp Inc",
    legalName: "TechCorp Incorporated",
    industry: "Technology",
    websiteUrl: "https://techcorp.example",
    companySize: "SIZE_50_200",
    ein: "12-3456789",
    billingAddress: {
      line1: "123 Market St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "US",
    },
  }, customerToken).catch((e) => console.log(`  (customer profile: ${e.message})`));

  console.log("→ Registering candidate1@test.com");
  const candidate = await register("candidate1@test.com", "Alex", "Chen");
  console.log(`  userId=${candidate.userId}`);
  await addRole(candidate.token, "CANDIDATE");
  const candidateToken = await loginAgain("candidate1@test.com");
  console.log("  CANDIDATE role added");

  console.log("→ Updating candidate profile");
  await call(`${PROFILE}/api/v1/candidates/me`, "PATCH", {
    headline: "Full-stack engineer with 8 years experience",
    bio: "Shipping React and Node apps for the last 8 years across consumer and enterprise products.",
    seniority: "SENIOR",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
    workAuthStatus: "US_CITIZEN",
    location: "San Francisco, CA",
    rateMin: 100,
    rateMax: 140,
    preferRemote: true,
  }, candidateToken).catch((e) => console.log(`  (candidate profile: ${e.message})`));

  console.log("→ Customer publishes a requirement");
  const req = await call(`${REQUIREMENT}/api/v1/requirements`, "POST", {
    title: "Senior Full-Stack Engineer",
    description: "We need a React + Node expert to build our new dashboard. 5+ years experience required.",
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
  }, customerToken);
  const requirementId = req.id as string;
  console.log(`  requirementId=${requirementId}`);

  await call(`${REQUIREMENT}/api/v1/requirements/${requirementId}/publish`, "POST", {}, customerToken);
  console.log("  published");

  console.log("→ Candidate submits to the requirement");
  const submission = await call(`${MATCHING}/api/v1/submissions`, "POST", {
    requirementId,
    candidateId: candidate.userId,
    coverNote:
      "I have 8 years of full-stack experience building scalable web apps. I've worked with React and Node.js extensively across consumer and enterprise products.",
    proposedBillRate: 130,
  }, candidateToken).catch((e) => {
    console.log(`  (submission failed: ${e.message})`);
    return null;
  });
  if (submission) console.log(`  submissionId=${submission.id}`);

  console.log("\n✓ Seed complete.");
  console.log(`  Customer  → customer1@test.com / "${PASSWORD}"`);
  console.log(`  Candidate → candidate1@test.com / "${PASSWORD}"`);
  console.log(`  Admin     → admin@techorbit.test / TestAdminPass1234`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
