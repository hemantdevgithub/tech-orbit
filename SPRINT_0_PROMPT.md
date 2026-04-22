# Sprint 0 — Techorbit Monorepo Bootstrap

You are building **Techorbit**, a US IT staffing marketplace. This is **Sprint 0** — the foundational scaffolding sprint. No feature code yet. Just the monorepo, infrastructure, design system, and the shared packages every future sprint will depend on.

Your mission: leave me with a **repo that runs** via `docker-compose up`, where every service prints "hello world" on its port, the Next.js app renders a design-system-styled placeholder, and CI passes on a fresh pull.

---

## Hard rules — follow these exactly

1. **Tech stack is locked** (see `ENGINEERING_SPEC.md` Section 2). Do not substitute libraries without asking.
2. **Write TypeScript strict mode everywhere.** No `any`. No `@ts-ignore`.
3. **Named exports only.** No default exports anywhere except Next.js page components (required by the framework).
4. **Run `pnpm lint && pnpm typecheck && pnpm test` before every commit.** If any fail, fix before committing.
5. **Commit atomically.** One logical change per commit. Use conventional-commit messages (`feat:`, `chore:`, `docs:`, etc.).
6. **Plan before coding.** At the start of every task below, produce a written plan and wait for me to say "proceed" before writing files. This saves tokens.
7. **If anything in the spec is ambiguous, stop and ask me.** Do not guess on architectural choices.
8. **Never commit secrets.** `.env` files are git-ignored. Only `.env.example` with placeholder values is committed.

---

## Inputs you have

- `ENGINEERING_SPEC.md` — the full engineering requirements document. **Read Sections 0–4 and Section 5 now before starting.** You'll re-read Section 5 in detail during later sprints but skim it now to understand the data model.
- `CLAUDE.md` — repo-wide conventions for you (coding style, commit format, how to handle ambiguity). **Copy this file to the repo root as your first action** so future sessions inherit it automatically.
- `DESIGN_REFERENCE.md` — the design system tokens and component patterns from the Calibra Health Group reference.

---

## Sprint 0 scope — what to build

Do these in order. After each task, run lint/typecheck/test, commit, and give me a one-line status update.

### Task 1 — Monorepo skeleton
- Initialize a **pnpm + Turborepo** monorepo at the current directory
- Node version pinned via `.nvmrc` to Node 20 LTS
- Root `package.json` with workspaces and Turborepo scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`
- Root `.gitignore` covering Node, Next.js, Prisma, IDE, env files, build artifacts
- Root `.editorconfig`
- Root `README.md` with clone/install/run instructions
- `turbo.json` with appropriate task pipelines and caching

### Task 2 — Shared config packages
Create these packages in `packages/config/`:
- `packages/config/eslint/` — flat config for Node services and for Next.js apps (two presets)
- `packages/config/tsconfig/` — `base.json`, `node.json`, `nextjs.json` tsconfigs
- `packages/config/prettier/` — shared Prettier config
- `packages/config/vitest/` — shared Vitest preset

All other workspace packages must extend these. Do not duplicate lint/ts/prettier configs.

### Task 3 — Shared utility packages
Create empty-but-wired packages for:
- `packages/types/` — Zod schemas + TS types shared across services. For Sprint 0, just export the shared enums from ENGINEERING_SPEC.md Section 5.1 (UserRoleType, WorkAuthStatus, etc.) as Zod enums.
- `packages/logger/` — thin wrapper around pino with structured logging + correlation ID propagation
- `packages/errors/` — typed error classes (`NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `InternalError`) with HTTP status mapping
- `packages/event-bus/` — RabbitMQ wrapper (publish + subscribe with the envelope from Section 6.1). For Sprint 0, just the interfaces + a working connect/publish/subscribe. No events consumed yet.
- `packages/auth-middleware/` — JWT verification middleware factory for Fastify. Takes public key, returns middleware that attaches `request.auth = { userId, roles, sessionId }` or throws.
- `packages/db-client/` — Prisma client factory helper (accepts schema name, returns configured client)

Each package has:
- `package.json` with `name: "@techorbit/<name>"`, `"type": "module"`
- `tsconfig.json` extending `@techorbit/config/tsconfig/node.json`
- `src/index.ts` with named exports
- `tests/` folder with at least one smoke test per package

### Task 4 — Design system package (`packages/ui/`)
This is the most visible deliverable of Sprint 0. Follow `DESIGN_REFERENCE.md` exactly.

- `packages/ui/` as a Next.js-compatible component library
- `tailwind.config.ts` with the full color palette, fontSize scale, borderRadius, and boxShadow tokens from DESIGN_REFERENCE
- Global CSS with CSS variables for all tokens (so apps can pick up the theme via `@techorbit/ui/styles.css`)
- These components built and each with one Storybook story + one unit test:
  - `Button` (variants: primary, secondary, ghost, destructive; sizes: sm, md, lg)
  - `Card` (with `CardHeader`, `CardBody`, `CardFooter` subcomponents)
  - `Input` (with label + error + helper text)
  - `Label`
  - `Badge` (variants: mint, cream, danger, muted, success)
  - `Avatar`
  - `InfoStrip` — the Role/LOB/Position horizontal pill from the reference screenshot
  - `ProgressCard` — the Verification Progress card pattern with the 4-step grid
  - `NavBar` — logo + center nav + notification bell + user dropdown
  - `PageHeader` — icon tile + title + subtitle pattern
- Storybook setup (Vite builder) with the Techorbit theme applied

### Task 5 — Service scaffolding
For **each** of the 14 services in ENGINEERING_SPEC Section 1.4, create a minimal Fastify-based scaffold under `services/<name>/`:
- Fastify app on the assigned port with `/health` endpoint returning `{ status: "ok", service, version }`
- Structured logging via `@techorbit/logger`
- Graceful shutdown handling (SIGTERM → drain → exit)
- Environment parsing via Zod on boot; fail-fast if env invalid
- `Dockerfile` (multi-stage: deps → build → runtime, non-root user, tini as init)
- `package.json` with scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist), `lint`, `typecheck`, `test`
- `tsconfig.json` extending `@techorbit/config/tsconfig/node.json`
- `src/index.ts`, `src/server.ts`, `src/config.ts`
- `tests/smoke.test.ts` that boots the server, hits `/health`, expects 200

**Do NOT** add Prisma schemas yet in Sprint 0 beyond a placeholder. Each service's actual schema comes in its sprint.

Exception: `api-gateway` — use Fastify as a simple reverse proxy for now (use `@fastify/http-proxy`), routing by path prefix. Config-driven routing table.

### Task 6 — Next.js web app (`apps/web/`)
- Next.js 14 App Router, TypeScript strict
- Import `@techorbit/ui` and apply the design system
- Tailwind wired up; `globals.css` imports the UI tokens
- One page: `/` — render a page using `PageHeader`, `InfoStrip`, `ProgressCard`, `Button`, and `Card` from `@techorbit/ui`. Content is placeholder ("Welcome to Techorbit") but **styling must exactly match the Calibra Health Group aesthetic**
- A dark mode toggle is NOT needed in Sprint 0
- Basic layout with `NavBar`
- Vitest + Testing Library for unit tests; smoke test for the `/` page

### Task 7 — Docker Compose for local dev
Create a `docker-compose.yml` at the root that starts:
- `postgres:16` — one container, one instance. Seed with `CREATE SCHEMA` statements for every service schema listed in ENGINEERING_SPEC Section 5 (identity, profile, requirement, matching, interview, placement, payments, messaging, notification, rating, audit). Use an init SQL script in `infra/docker/postgres-init/`.
- `redis:7-alpine`
- `rabbitmq:3-management-alpine` (port 5672 for AMQP, 15672 for management UI)
- A `mailhog` or `mailpit` container for local email capture (port 1025 SMTP, 8025 UI)

Do NOT containerize services in Sprint 0 — devs run them via `pnpm dev` locally, connecting to compose-provided infra. We'll add service containers in Sprint 10.

`.env.example` at root with all variables every service needs: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`, `SMTP_*`, etc. Use placeholder values.

### Task 8 — CI pipeline
`.github/workflows/ci.yml`:
- Triggered on PR to `main` and push to any branch
- Matrix: ubuntu-latest, Node 20
- Steps: checkout → setup pnpm → setup Node with cache → install → lint → typecheck → test → build
- All apps and services must pass
- Use Turborepo's remote cache? No — local cache only in CI for Sprint 0, we'll add remote cache later

### Task 9 — Developer experience
- `scripts/bootstrap.sh` — one-command first-run setup: `pnpm install && docker-compose up -d && pnpm --filter=./packages/** build && echo "Ready"`
- `scripts/seed.ts` — placeholder (does nothing useful yet). Wire it as `pnpm db:seed`.
- Root `README.md` updated with: prerequisites, setup steps, how to run a single service, how to run tests, where the design system lives, link to Storybook
- A `CONTRIBUTING.md` documenting commit format, branch naming (`feat/<name>`, `fix/<name>`), PR template, code review checklist

### Task 10 — Terraform skeleton (placeholder only)
Create `infra/terraform/` with:
- `README.md` noting "provisioned in Sprint 10; this is a placeholder"
- Empty `main.tf`, `variables.tf`, `outputs.tf` with just provider block and a comment

We are NOT provisioning AWS resources in Sprint 0. This is just the folder skeleton so future sprints don't need to restructure.

---

## Definition of Done for Sprint 0

Before you finish, verify each of these by running them:

- [ ] Fresh clone: `git clone <url> && cd techorbit && ./scripts/bootstrap.sh` completes without errors
- [ ] `docker-compose up -d` brings up Postgres, Redis, RabbitMQ, Mailpit
- [ ] `pnpm dev` starts all 14 services AND the Next.js app in parallel via Turborepo
- [ ] Every service responds 200 on `GET http://localhost:<port>/health`
- [ ] Next.js app at `http://localhost:3000` renders the design-system placeholder page with correct forest green + cream styling
- [ ] Storybook runs: `pnpm --filter @techorbit/ui storybook` shows all components
- [ ] `pnpm lint` — clean
- [ ] `pnpm typecheck` — clean
- [ ] `pnpm test` — all pass
- [ ] `pnpm build` — all succeed
- [ ] GitHub Actions CI workflow exists and is syntactically valid (use `actionlint` or just careful review)
- [ ] Every service schema exists in Postgres (run `\dn` in psql to verify)
- [ ] RabbitMQ management UI accessible at http://localhost:15672 (guest/guest)
- [ ] No secrets committed. No `.env` committed. Only `.env.example` with placeholders.

---

## Deliverable

At the end of Sprint 0, produce:

1. Working code, pushed to branch `sprint/0-bootstrap`
2. A `SPRINT_0_SUMMARY.md` at the repo root containing:
   - What's built and verified
   - What's deferred (and to which sprint)
   - Known issues / open questions
   - A "first-run guide" for an engineer who pulls the branch fresh
3. All commits following conventional-commit format
4. PR description using the template from `CONTRIBUTING.md`

---

## Before you start — your first output

Produce a **written execution plan** covering:

1. Order in which you'll do Tasks 1–10 (and why if it differs from the listed order)
2. Dependencies between tasks you've identified
3. Any spec ambiguities you want me to clarify before starting
4. An estimate of how many commits you expect to land total

**Do not write code until I reply "proceed."**
