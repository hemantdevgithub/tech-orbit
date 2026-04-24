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

**Still open in Sprint 10:**
- Per-route rate limits on the *other* sensitive endpoints (identity login,
  password reset, payments invoice endpoints). Global limiter is on; per-route
  opt-ins aren't.
- XSS input audit. React handles output escaping already, but I never did the
  grep-for-`dangerouslySetInnerHTML` pass.
- Bundle analyzer wiring. `@next/bundle-analyzer` not installed.
- DB index audit. Existing indexes look sufficient per Sprint 6/7 migrations;
  haven't verified against the Sprint 10 prompt's target list.
- The E2E spec files 01-09 exist but are **stubs** (placeholder `test.skip`).
  signup.spec.ts was updated for the role picker; login.spec.ts still uses
  the old registration flow and probably fails.
- `SPRINT_10_SUMMARY.md` is a stub — write the real summary after closing the
  above items.

**UI polish still outstanding** (user flagged these in earlier sessions):
- Onboarding flows for each role are not fully built. Registration leaves
  CUSTOMER → `/onboarding/customer` and CANDIDATE → `/onboarding/candidate`,
  but those pages are minimal. CRM/SRM have no onboarding page at all — they
  go straight to `/dashboard`.
- Candidate profile (`/candidates/[id]`) is a stub; only `/users/[id]` exists
  as a generic profile page.
- Rating display on customer profiles is wired but there's no dedicated
  `/customers/[id]` page for MSMEs/SRMs to browse.

**Dependencies for the next sprint:**
- Real Stripe/Gusto integration (payments-svc currently uses mocks).
- Real SendGrid/Twilio integration (notification-svc mocks).
- Real video provider for interviews (currently Daily.co mock).
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
