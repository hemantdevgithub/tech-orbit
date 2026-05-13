# Handoff — read this first

Current state of the Techorbit codebase for a fresh Claude session. Read this
**before** starting work. Everything here is concrete — the per-sprint
`SPRINT_N_SUMMARY.md` files have the why/architecture; this doc is the
"where we are, how to run it, and what's broken" page.

---

## Where the code is

- **Branch:** `sprint/7-payments` (misnamed — it carries all of Sprint 7→10).
  Rename if you want: `git branch -m <better-name>`.
- **Latest commit:** `41e1815` — "Sprints 7-10 + demo harness" checkpoint.
  236 files, +27,672 lines. Not yet pushed to any remote.
- **Clean working tree** at handoff time.

## What exists

**14 backend services** (ports 3001–3014) + **Next.js web app** (3000) in a
pnpm monorepo. Every service has its own Prisma schema, the whole repo talks
via RabbitMQ events + the transactional-outbox pattern.

| Sprint | Status | Summary |
|---|---|---|
| 0 | done | monorepo scaffold, infra (postgres/redis/rabbitmq/mailpit) |
| 1, 1.5 | done | identity-svc: auth, 2FA, sessions, field-level encryption |
| 2 | done | profile-svc: candidate/customer/MSME/interviewer + file-svc |
| 3, 3.5 | done | requirement-svc: requirements + CRM attribution |
| 4 | done | matching-svc: submissions + match scoring |
| 5, 5.5 | done | interview-svc: scheduling + scorecards |
| 6, 6.5 | done | placement-svc: Value Chain + commission calculator |
| 7 | done | payments-svc: timesheets → invoices → payouts |
| 8 | done | messaging-svc, notification-svc, rating-svc |
| 8.5 | done | migrations + integration tests + navbar bell + profile ratings |
| 9 | done | admin-svc + admin console UI |
| 10 | **partial** | prod Dockerfiles, compose, nginx, E2E scaffolds, docs |

**289+ tests green** at last full run. `pnpm lint` + `pnpm typecheck` clean
across all 31 workspaces.

## How to run the app (the real instructions)

### Prereqs
- Docker Desktop running (postgres/redis/rabbitmq/mailpit containers)
- Node 20+ (tested on 23). macOS: bump per-proc FD limit.
- After a fresh `pnpm install` in a new worktree, **regenerate Prisma clients**
  (they live under `services/*/src/generated/` and are gitignored):
  ```bash
  for svc in admin file identity interview matching messaging notification \
             payments placement profile rating requirement; do
    pnpm --filter @techorbit/$svc exec prisma generate
  done
  ```
  Without this, `pnpm typecheck` and `pnpm test` fail on `Cannot find module
  '../generated/client'` in every service.

### Known gotchas you MUST know

1. **Turbo dev with 14 services overwhelms macOS file watchers.** If you run
   `pnpm dev` for everything at once, Next.js comes up with an empty page
   registry and every route 404s. **Fix:** run backends under turbo and the
   web app standalone:
   ```bash
   # Terminal 1 — backends
   bash -c 'ulimit -n 50000 && pnpm exec turbo dev --concurrency=20 --filter=!@techorbit/web'
   # Terminal 2 — web alone
   cd apps/web && bash -c 'ulimit -n 10240 && exec pnpm dev'
   ```
2. **Services won't boot without per-service `.env` files** (they use
   `dotenv-cli` to load them — workspace-root install added during Sprint 8.5).
   Each service has a `.env` with `DATABASE_URL`, `RABBITMQ_URL`, JWT keys,
   `FIELD_ENCRYPTION_KEK_V1`. Those files are **gitignored**; bootstrap by
   copying an existing one (e.g. `services/identity/.env`) to any service
   that's missing one.
3. **tsx is not on PATH.** Use the workspace binary:
   `/Users/hemant/techorbit/node_modules/.pnpm/node_modules/.bin/tsx` (or
   `pnpm exec tsx` from inside a service dir).

### Full boot sequence

```bash
# 1. Infra
docker-compose up -d         # postgres + redis + rabbitmq + mailpit

# 2. Backends + web (see "Known gotchas" above — two terminals)

# 3. Seed the first admin (one-time)
DATABASE_URL="postgresql://techorbit:techorbit_dev@localhost:5432/techorbit" \
ADMIN_SEED_EMAIL=admin@techorbit.test \
ADMIN_SEED_PASSWORD=TestAdminPass1234 \
pnpm --filter @techorbit/admin seed-admin

# 4. Demo seed (all 7 roles + full happy path)
/Users/hemant/techorbit/node_modules/.pnpm/node_modules/.bin/tsx scripts/seed-demo.ts
```

Web app: http://localhost:3000 · Mailpit: http://localhost:8025 ·
RabbitMQ: http://localhost:15672 (guest/guest).

## Demo accounts

Demo password for every `*@demo.test` user: **`correct horse battery staple 42`**
(five words with spaces, `42` on the end).

| Email | Role |
|---|---|
| `admin@techorbit.test` | ADMIN (password `TestAdminPass1234`) |
| `customer@demo.test` | CUSTOMER (TechCorp Inc) |
| `candidate@demo.test` | CANDIDATE (Alex Chen, has active placement) |
| `candidate2@demo.test` | CANDIDATE (Priya Patel, submitted state) |
| `crm@demo.test` | CRM |
| `srm@demo.test` | SRM |
| `msme@demo.test` | MSME |
| `interviewer@demo.test` | INTERVIEWER (has conducted interview) |
| `applicant@demo.test` | CANDIDATE + pending CRM application |

Full walkthrough script: [`DEMO_WALKTHROUGH.md`](DEMO_WALKTHROUGH.md).

## Where to find things

```
apps/web/                       Next.js 14 App Router
  src/app/                      Routes
  src/components/               Live client components (UserMenu, NotificationBell, etc.)
  e2e/                          Playwright specs (1-9 stubs; signup.spec.ts + login.spec.ts working)
packages/types/                 Zod schemas shared by every service
packages/api-client/            Thin typed HTTP clients (one per svc)
packages/ui/                    Shared React components (shadcn-based)
packages/auth-middleware/       Fastify JWT + SERVICE-role gate
packages/event-bus/             RabbitMQ pub/sub
services/<name>/                One Fastify service per directory
  prisma/schema.prisma          Per-service Prisma schema (multi-schema postgres)
  prisma/migrations/            Committed migrations (apply via `prisma migrate deploy`)
  scripts/generate-openapi.ts   Regenerates openapi.yaml from Zod schemas
  Dockerfile.prod               Multi-stage production build (Sprint 10)
scripts/seed-e2e.ts             Minimal seed (customer + candidate + requirement + submission)
scripts/seed-demo.ts            Full seed (7 roles + complete happy path)
docker-compose.prod.yml         All 14 services + web + nginx (Sprint 10)
nginx.conf                      TLS terminator + security headers
.env.production.example         Config template for prod deploy
docs/DEPLOYMENT_LOCAL.md        Single-server deploy guide (Sprint 10)
docs/DEPLOYMENT_VPS.md          VPS deploy + Let's Encrypt (Sprint 10)
docs/PRODUCTION_CHECKLIST.md    Go-live checklist (Sprint 10)
```

## What's unfinished

Sprint 10 is partial — what landed vs what's still open:

**Done in Sprint 10:**
- Multi-stage Dockerfiles for all 14 services + web (standalone mode)
- `docker-compose.prod.yml`, `nginx.conf`, `.env.production.example`
- Rate limiting on admin-svc mutations (30/min)
- Self-signed cert generation script
- 9 Playwright E2E spec file stubs (helpers.ts + updated signup.spec.ts)
- Deployment docs (LOCAL + VPS + CHECKLIST)

**Closed in the 2026-04-24 polish pass** (see the addendum in `SPRINT_10_SUMMARY.md`):
- Identity login/password-reset/register per-route limits — verified these were
  already wired in Sprint 1 (`services/identity/src/routes/auth.routes.ts`).
- Payments per-route limits — added to `mark-paid` + 4 timesheet mutations,
  with a new `rate-limit.test.ts` mirroring identity's suite.
- XSS audit — zero `dangerouslySetInnerHTML` in `apps/web`, `packages/ui`, or
  any service src.
- `@next/bundle-analyzer` — already installed + wired in `next.config.js`;
  added an `analyze` script to `apps/web/package.json`.
- DB index audit — every FK and primary filter column is indexed. See the
  table in `SPRINT_10_SUMMARY.md`.

**Still open in Sprint 10:**
- The E2E spec files 01-09 exist but are **stubs** (placeholder `test.skip`).
  signup.spec.ts was updated for the role picker; login.spec.ts still uses
  the old registration flow and probably fails.
- Per-IP (not per-token) rate limits for the fully anonymous surfaces — noted
  as a known gap in `SPRINT_10_SUMMARY.md`.

**Closed in the 2026-04-25 UI polish pass** (15 commits on
`claude/adoring-montalcini-dc0292`, not yet merged):
- Role profile pages: `/candidates/[id]`, `/customers/[id]` (public subset)
  and enhanced `/users/[id]`.
- Static onboarding welcome pages for CRM and SRM; wired into
  `register` → `ONBOARDING_ROUTES`.
- Left-sidebar `AppShell` replacing the top NavBar across 17 layouts
  (dashboard, candidates, customers, users, onboarding, requirements,
  placements, interviews, interviewers, submissions, timesheets,
  invoices, payouts, messages, notifications, settings/*, admin).
  Role-aware: sidebar renders a primary CTA, 3 quick-search inputs, and
  nav links that fit the viewer's role. Mobile collapses to a drawer.
- Grid/list `ViewToggle` with `useViewMode` persisted per-page on
  Requirements, Placements, Interviewers.
- `<Breadcrumbs>` component used on every list + detail page.
- Dashboards for CRM and SRM (earnings strip + attribution/submissions
  panels). Customer/Candidate/MSME dashboards swapped their "Coming in
  Sprint 3" placeholders for live data from listRequirements /
  listSubmissions.
- Lucide-style SVG icon set replacing emojis everywhere — sidebar nav,
  CTAs, role badges, notification bell type icons, value-chain nodes,
  register role picker, onboarding welcome headers, dashboard empty
  states. Emojis remain only in Prisma seed strings and markdown.
- Public profile endpoints `GET /candidates/:id/public`,
  `/interviewers/:id/public`, `/customers/:id/public` — narrow
  no-PII subsets accessible to any authenticated user. `useDisplayName`
  hook on the web uses them, so timesheets / interviews / placements
  now read e.g. "Full-stack engineer — 8 yrs React/Node" instead of
  `#ed087681`.

**Critical bug fixes from the same pass:**
- `api-client.ts`: `getApiClient` / `makeServiceClient` were freezing
  a snapshot of the zustand store, so `getAccessToken` always returned
  `null`. Every authed request silently went anonymous — including
  `fetchMe` after login, which left the dashboard stuck on a blank
  screen.
- `dashboard/layout.tsx` + new `useAuthGuard` hook: wait for zustand
  persist rehydration before deciding whether to bounce to `/login`.
  Without this, hard-reload of any authenticated page flashed the
  login screen.
- Placement list + detail titles: stopped rendering the candidate's
  own UUID as the H1 when the candidate was the viewer.

**UI polish still outstanding:**
- E2E Playwright specs 01-09 are still `test.skip` stubs.
- Per-IP rate limits for fully anonymous register/login surfaces (docs +
  infra layer decision).
- Cross-service "Customer #abc" — value-chain graph on placement detail
  shows a short company id because it has `customerCompanyId` not a
  primaryUserId; wants a `GET /internal/customers/by-company/:id/public`
  lookup to resolve the name.

**Closed in the 2026-04-25 interview-recording pass** (4 commits on
`claude/adoring-montalcini-dc0292`, not yet merged):
- `Interview` schema gains a recording lifecycle (`videoRecordingStatus`
  NONE → RECORDING → PROCESSING → READY → FAILED) plus
  `videoRecordingFileId / StartedAt / EndedAt / DurationSec`. The
  `start` route flips to RECORDING; `end` flips to PROCESSING and fires
  an async `processRecording()` that asks the provider for metadata and
  settles to READY. Mock provider in `services/interview/src/lib/daily.ts`
  returns a deterministic public MP4 so the full flow works end-to-end
  with no real Daily account.
- New `GET /api/v1/internal/interviews/summaries?ids=&candidateId=`
  returns narrow summaries (score, duration, recording URL if READY)
  for cross-service consumers. Service-role gated.
- `CandidateProfile.featuredInterviewIds: String[]` (cap 6,
  order-preserving). New `PATCH /api/v1/candidates/me/featured-interviews`
  validates each ID via S2S to interview-svc — must belong to the
  candidate and have a READY recording. Public endpoint
  `GET /candidates/:userId/public` now embeds the resolved
  `featuredInterviews` array.
- `file-svc` `FilePurpose` enum gains `INTERVIEW_RECORDING`.
- Web: real `<video>` player on the interview detail card; new
  `FeaturedInterviewsPanel` embedded on `/candidates/[id]` (with a
  graceful public-only fallback when the viewer can't see the full
  profile); new `/settings/featured-interviews` picker for candidates
  (pick / reorder / save, capped at 6).
- 31 new tests across interview-svc and profile-svc (recording
  lifecycle, summaries endpoint authz, PATCH happy/ownership/non-READY/
  cap/dup paths, public-embedding ordering).
- Hardening: profile-svc error handler now maps ZodError → 400 (was
  leaking as 500); routes wrap `.parse()` in `parseOrThrow` for
  defence-in-depth. Settings layout switched to `useAuthGuard` (was
  bouncing to `/login` on hard reload).

**Dependencies for the next sprint:**
- Real Stripe/Gusto integration (payments-svc currently uses mocks).
- Real SendGrid/Twilio integration (notification-svc mocks).
- Real video provider for interviews (currently Daily.co mock).
  **Note:** the interview-recording feature shipped today works
  end-to-end with the mock — switching to real cloud-recording is a
  one-file change in `services/interview/src/lib/daily.ts:createLiveApi`.
- Cloud deployment (everything's single-host-ready; ECS/Fargate/CloudWatch
  deferred).

## Quick recon commands (run these if anything looks off)

```bash
# Are all 14 backend services listening?
lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '{print $9}' | grep -oE ":[0-9]+$" | sort -un

# Health-sweep every service
for p in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$p/health)
  echo "$p → $code"
done

# Web returning 404 on everything? Next's file watcher died. Restart web alone:
pkill -f "next dev" && rm -rf apps/web/.next
cd apps/web && bash -c 'ulimit -n 10240 && exec pnpm dev'

# Backend stuck? See what's failing:
tail -100 /tmp/techorbit-backends.log | grep -vE "Watchpack|incoming|response"
```

## Important project conventions

`CLAUDE.md` has the full list. Highlights:
- TypeScript strict everywhere. Named exports only (default exports only for
  Next page/layout files).
- Money is `Decimal` or `decimal.js`, never `number`.
- All financial mutations emit audit events via outbox.
- `AuthContext` passed to every repository method — authz at the data layer.
- Cursor-based pagination, never offset/limit.
- Conventional commits (`feat(scope): ...`, `fix(scope): ...`).
- Never commit `.env` files. Service `.env`s are per-machine, gitignored.
- Always work through the sprint prompt flow: re-read CLAUDE.md + sprint prompt
  → produce written plan → wait for "proceed" → execute → summary doc.

## Open threads / unresolved questions

None that I'm aware of. If the user says "continue where we left off," the
natural next step is closing out Sprint 10 (see "Still open" above) or
starting Sprint 10.5 (cloud deployment). The user mentioned "I want to
change IDE, I will work on claude cli now" so they're likely about to
reopen this repo in a new terminal session.
