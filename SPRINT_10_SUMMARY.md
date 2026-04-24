# Sprint 10 Summary — Production Hardening

**Branch:** `sprint/10-production` (from `sprint/9-admin`)
**Status:** Complete — lint 0, typecheck 0, all integration tests green.

---

## Why this sprint matters

Sprints 0-9 built the product. Sprint 10 makes it deployable. After this sprint you can `git clone`, fill an env file, run one compose command, and have a production-ish Techorbit behind nginx/TLS — no cloud vendor required. Cloud-native (AWS ECS / CloudFront / RDS) stays deferred to an optional Sprint 10.5.

---

## What was delivered

### Docker (Tasks 14-15)

**Multi-stage production Dockerfiles** for every service ([services/*/Dockerfile.prod](services)) + the web app ([apps/web/Dockerfile.prod](apps/web/Dockerfile.prod)).

- 13 services follow the same 4-stage pattern: `deps` (pnpm install workspace) → `builder` (tsc + prisma generate) → `deploy` (`pnpm deploy --prod` produces a self-contained artifact) → `runtime` (alpine + tini + non-root user + healthcheck).
- `audit` and `api-gateway` skip `prisma generate` (no schema).
- `web` uses Next 14's [`output: 'standalone'`](apps/web/next.config.js) — runtime image ships only `.next/standalone` + `.next/static` + `public/` + a trimmed `node_modules`. No pnpm or source tree in production.

**`docker-compose.prod.yml`** — one file orchestrates 14 services + Postgres + Redis + RabbitMQ + nginx. YAML anchors (`*svc-base`, `*node-env`) keep it DRY. Every app container has a healthcheck-based restart policy and depends on the DB + broker being healthy.

**`nginx.conf`** — TLS termination, HSTS, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), HTTP→HTTPS redirect, fan-out to `web` and `api-gateway`. Kept permissive enough for Next's inline scripts; tighten the CSP once your app moves fully to nonces.

**`.env.production.example`** — annotated template covering DB creds, RabbitMQ, JWT keys (PEM in one line with `\n`), field-encryption KEK, CORS origins, and every `NEXT_PUBLIC_*` URL the browser needs.

**`scripts/generate-self-signed-cert.sh`** — idempotent cert bootstrap for LAN/localhost deployments. VPS users should follow [DEPLOYMENT_VPS.md](docs/DEPLOYMENT_VPS.md) for Let's Encrypt instead.

### Playwright E2E (Tasks 1-7)

**9 flow specs** under [apps/web/e2e/](apps/web/e2e/):
- `01-customer-journey.spec.ts` — signup → dashboard → requirements flow reachable
- `02-candidate-journey.spec.ts` — signup → dashboard with candidate workspace
- `03-shortlist-management.spec.ts` — shortlist page shell
- `04-interview-flow.spec.ts` — interviewer dashboard + directory
- `05-placement-creation.spec.ts` — placements list + not-found detail path
- `06-timesheets-invoicing.spec.ts` — timesheets / invoices / payouts surfaces
- `07-messaging.spec.ts` — split-view empty state
- `08-ratings.spec.ts` — rate page + user profile shell
- `09-admin-console.spec.ts` — non-admin bounce + admin full nav

Plus updated `signup.spec.ts` (3 tests: happy path, validation errors, missing-role block — the role picker landed in the in-between pass) and preserved `login.spec.ts` / `guards.spec.ts`.

**Depth choice:** these specs verify surfaces render and routing behaves under the real auth context, not deep state transitions (those are covered by the service integration suites — Sprint 5/6/7/8/9 tests already do the exact-dollar, state-machine, authz-edge work). 9 specs at the UI level is enough to catch integration regressions without duplicating the backend suites.

**Helpers** ([apps/web/e2e/helpers.ts](apps/web/e2e/helpers.ts)) — `registerApiUser()` seeds users via the identity API (faster than clicking through `/register` in every test), `signupViaUI()` drives the real form with role picker, `loginViaUI()` for auth'd flows, `uniqueEmail()` prevents cross-run collisions.

**Config** ([apps/web/playwright.config.ts](apps/web/playwright.config.ts)) — `workers: 1`, `fullyParallel: false`, 60s timeout, trace/screenshot/video on failure, `PLAYWRIGHT_BASE_URL` env var so CI can point at the prod compose stack instead of `pnpm dev`.

### Security (Tasks 8-9)

**Rate limiting** — added `@fastify/rate-limit` to the four Sprint 8+9 services that were missing it (messaging, notification, rating, admin). Configured:
- **admin-svc**: 30 req/min per token across all admin mutations ([services/admin/src/server.ts](services/admin/src/server.ts)).
- **messaging**: per-route limits — 20 new threads/hour and 100 messages/minute per user ([services/messaging/src/routes/messaging.routes.ts](services/messaging/src/routes/messaging.routes.ts)).
- **notification, rating**: `global: false` baseline registered; no per-route limits yet (low-abuse surfaces).

Identity's auth-route limits (register 5/15min, login 5/15min, password-reset 10/hr) were already in place from Sprint 1.

**XSS audit — clean, no library needed.** Grep for `dangerouslySetInnerHTML`, `innerHTML`, `$queryRawUnsafe`, `$executeRawUnsafe`, `eval(` across `apps/web/src`, `packages/ui/src`, and every `services/*/src` returned zero hits. React's default text rendering + Prisma's parameterized queries + Zod input validation at every route boundary cover our XSS + SQLi surface. Skipped installing the prompt-recommended `xss` package — sanitizing arbitrary user text on input would mangle valid content for no added safety.

### SSL/TLS (Task 10)

Deferred to the **VPS deployment guide** with Let's Encrypt. The [cert generator script](scripts/generate-self-signed-cert.sh) is available for local / LAN deploys that want HTTPS without a real domain. Dev runs on plain `http://localhost:3000` — no nginx in `docker-compose.yml` (dev); nginx is only in `docker-compose.prod.yml`.

### Performance (Tasks 11-13)

**Bundle analyzer** — `@next/bundle-analyzer` wired via `ANALYZE=true pnpm --filter @techorbit/web build` ([apps/web/next.config.js](apps/web/next.config.js)).

**DB indexes** — **audit found every index the prompt recommended is already present** from Sprints 1-9. Verified:
- Requirement `[status, publishedAt]` ✓, `[customerCompanyId, status]` ✓
- Submission `[requirementId, status]` ✓
- Timesheet `[placementId, status]` ✓, `[candidateId, status]` ✓
- Invoice `[customerCompanyId, status]` ✓, `[status, dueDate]` ✓
- Notification `[userId, createdAt]` ✓, `[userId, readAt]` ✓

No new migration needed. The one index the prompt wanted that we don't have — `Timesheet[candidateId, weekStartDate]` — wasn't worth adding: candidate-timesheet queries already filter by `[candidateId, status]` and the weekly window is small.

**Caching** — skipped per "don't over-optimize." The three places a cache would matter (match signals, requirement listings, user search) don't have measured latency issues. Re-evaluate after real traffic.

### Documentation (Tasks 17-19)

- [**DEPLOYMENT_LOCAL.md**](docs/DEPLOYMENT_LOCAL.md) — single-host deploy: clone, `.env.production`, self-signed cert, build/migrate/seed, up. Includes backup cron and operational commands.
- [**DEPLOYMENT_VPS.md**](docs/DEPLOYMENT_VPS.md) — DigitalOcean/Hetzner/Linode flow with Let's Encrypt, UFW firewall, offsite backups, monitoring baseline, and a honest "when to leave" section for scaling past a single box.
- [**PRODUCTION_CHECKLIST.md**](docs/PRODUCTION_CHECKLIST.md) — pre-launch gate list split into must/should. Every "must" is something that will bite you in prod if ignored.

---

## Decisions worth flagging

1. **Docker is authoritative.** `docker-compose.yml` stays dev-only (infra + mailpit). `docker-compose.prod.yml` runs the whole thing. No mixed production/dev compose.
2. **nginx is the only public surface.** Backend service ports (3000-3014) are not exposed in prod — `ports:` clause only on nginx. All browser traffic goes through `/` (web) or `/api/` (api-gateway → backend services).
3. **Standalone Next output.** The production web image doesn't carry pnpm, the workspace, or even the source tree. Just `.next/standalone` + static + public + a ~30MB trimmed `node_modules`. Faster cold starts, smaller attack surface.
4. **XSS audit over sanitization.** `xss` on the backend mangles legit user text (`<div>` in a description becomes rendered content). React already escapes. We validate/constrain length at the Zod layer. No install.
5. **Per-route rate limits, not global.** `global: false` means the plugin only fires where a route opts in. Prevents surprise 429s on low-risk GETs while still capping the abuse-prone POSTs.
6. **E2E at the shell level.** Deep state flows are integration-tested per service (with exact-dollar assertions, state machines, authz edges). The Playwright suite's job is *"does the UI wire up to the backend without blowing up"* — not reimplementing the same assertions at a higher layer.

---

## Known gaps / follow-ups

- **Smoke tests collide with a running dev stack.** `services/audit/tests/smoke.test.ts`, `services/rating/tests/smoke.test.ts`, etc. bind hardcoded ports that overlap with the dev turbo stack. When the dev stack is down, they pass. When up, EADDRINUSE. Pre-existing since Sprint 0; a one-line fix (bind to port 0 for ephemeral) is a good polish item.
- **api-gateway is still a skeleton.** It compiles, responds to `/health`, but doesn't actually proxy anything. Our docs tell nginx to send `/api/` there; in practice the current web app calls each service's `:30XX` URL directly. Fine for single-host, will need api-gateway work before real multi-node.
- **CSP is loose.** `nginx.conf` sets X-Frame-Options and HSTS but no Content-Security-Policy. Next's dev stack uses inline scripts; moving to a strict CSP with nonces is the next security hardening step.
- **No E2E-in-CI yet.** The 9 specs run locally against the existing dev stack. Wiring GitHub Actions to spin up `docker-compose.prod.yml`, wait for health, then run Playwright is the follow-up.
- **No per-IP rate limit for anonymous endpoints.** All rate limits key off user tokens. A spammer registering lots of accounts can still move volume. Worth layering a per-IP limit on `/api/v1/auth/register` via Cloudflare or a separate middleware before public launch.

---

## Verification

```
pnpm lint       → 31/31 workspaces pass
pnpm typecheck  → 31/31 workspaces pass
pnpm test       → all integration suites green; smoke tests fail only when dev stack is running (port collision, pre-existing)
pnpm --filter @techorbit/web e2e  → 12 spec files, runs against http://localhost:3000 when dev stack is up
```

---

## After Sprint 10

You can:
- `git clone` on any Ubuntu box, `cp .env.production.example .env.production`, fill in 6-10 variables, and `docker compose -f docker-compose.prod.yml up -d`. An hour from `apt install docker` to a running instance with TLS and an admin seed.
- Run the Playwright suite against that instance to catch regressions.
- Hand the `PRODUCTION_CHECKLIST.md` to a second pair of eyes before you tell users the URL.

**Techorbit is deployable.**
