# CLAUDE.md — Repo Conventions for Techorbit

This file is read automatically by Claude Code at the start of every session. It encodes the non-negotiable conventions for this repository. **Follow these exactly unless explicitly overridden by the task prompt.**

> **Starting a new session?** Read [`HANDOFF.md`](HANDOFF.md) first — it has the current state of the codebase, how to run the app (there are non-obvious gotchas around Next.js file watchers and per-service `.env` files), demo accounts, and what's unfinished. Per-sprint detail lives in `SPRINT_N_SUMMARY.md` files.

---

## Product context

Techorbit is a US IT staffing marketplace connecting Customers, CRMs (independent BD), SRMs (independent recruiters), Candidates, MSMEs (vendor firms with benched consultants), and Interviewers. The platform owns its Employer-of-Record infrastructure, facilitates commission-split payments via a Value Chain, and includes in-platform video interviews with ratings.

Read `ENGINEERING_SPEC.md` for the full technical specification. Read `PRD.md` for product context.

---

## Tech stack (locked)

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript strict, Tailwind CSS, shadcn/ui base customized to our design system, react-hook-form + Zod, TanStack Query v5, Zustand for client state
- **Backend:** Node.js 20 LTS, TypeScript strict, Fastify, Prisma, Zod, pino logging
- **Data:** PostgreSQL 16 (schema-per-service, single cluster), Redis 7, RabbitMQ
- **Infra:** AWS ECS Fargate, Terraform, GitHub Actions, AWS Secrets Manager, CloudFront, Route 53
- **Auth:** JWT RS256 (asymmetric), 15-min access tokens, 14-day refresh tokens
- **Testing:** Vitest (unit + integration), Supertest, Testcontainers, Playwright (E2E)
- **Observability:** Datadog + Sentry, pino structured logs, OpenTelemetry tracing

**Never substitute a library without asking.** If a locked library genuinely can't do what you need, stop and ask.

---

## Coding conventions

### TypeScript
- **Strict mode on everywhere.** No exceptions.
- **No `any`.** Use `unknown` and narrow. If you genuinely cannot avoid `any`, add a `// TODO(claude): replace any` comment and flag it in your summary.
- **No `@ts-ignore`.** Use `@ts-expect-error` with a reason, and only if truly required.
- **Named exports only.** The only default exports allowed are Next.js page/layout components (framework-required).
- **Explicit return types on exported functions.** Inferred OK for internal helpers.
- **Prefer `type` over `interface`** unless you need declaration merging.

### File and naming conventions
- File names: `kebab-case.ts`
- Types/classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Prisma models: `PascalCase` (singular)
- Database tables (via Prisma `@@map`): `snake_case` plural
- DB columns (via Prisma `@map`): `snake_case`
- One thing per file: one route handler, one service class, one repository per file

### Imports
- Workspace packages: `import { X } from "@techorbit/types"`
- Within a service: relative imports only (`./routes/auth`)
- Never reach into another package's internals (`@techorbit/ui/src/components/internal`) — use the package's public exports
- Sort imports: 1) Node built-ins, 2) external deps, 3) `@techorbit/*` workspace, 4) relative. Blank line between groups.

### Error handling
- Throw typed errors from `@techorbit/errors`: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `InternalError`
- Never throw strings or raw Errors in application code
- Global error handler maps typed errors to HTTP responses
- Error messages are user-facing; include a `code` for programmatic handling

### Logging
- Use `@techorbit/logger`, never `console.log`
- Structured logging only: `logger.info({ userId, requirementId }, "requirement published")`
- **Never log secrets, tokens, full SSNs, or full bank account numbers.** Redact at the logger level where possible.
- Every request gets a correlation ID propagated via `x-correlation-id` header

### API design
- All routes: `/api/v1/<resource>`
- Resources are plural nouns: `/requirements`, not `/requirement`
- Actions on resources: `POST /requirements/:id/publish` (verb after noun)
- Request/response schemas defined as Zod; derive TypeScript types via `z.infer`
- Auto-generate OpenAPI via `zod-to-openapi`; commit the generated spec to each service's repo
- Pagination: cursor-based only. Response envelope: `{ data, nextCursor, hasMore }`
- Errors: `{ error: { code: "SCREAMING_SNAKE", message: "human-friendly", details?: {} } }`

### Database
- **Never read another service's tables directly.** Always go through that service's API.
- Every mutation to financial data emits an audit event (see Section 6 in ENGINEERING_SPEC)
- Migrations are forward-only. For zero-downtime schema changes: add → backfill → switch code → remove old column in later migration.
- Use transactions for any multi-row write that must be atomic (Placement creation + ValueChain + CommissionRules is the canonical example)
- Index every foreign key and every column in a WHERE or ORDER BY that sees real traffic

### Testing
- Unit tests for pure functions and service layer
- Integration tests for every API endpoint (use Testcontainers for Postgres)
- Tests live next to code: `foo.ts` + `foo.test.ts` in the same folder
- Test doubles: prefer real implementations (Testcontainers) over mocks for DB; mock external HTTP APIs
- Aim for 70%+ coverage on business-logic services (matching, placement, payments); 50%+ elsewhere. Coverage is a signal, not a target — meaningful assertions matter more than line count.

### Commits and branches
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `ci:`
- Include a scope when useful: `feat(identity): add 2FA setup endpoint`
- Body should explain *why*, not *what* (the diff shows what)
- Commit atomically — one logical change per commit
- Branch naming: `sprint/<N>-<short-description>` for sprint branches, `feat/<short-description>` or `fix/<short-description>` for bug fixes

---

## Security rules (non-negotiable)

1. **Never commit secrets.** `.env` is git-ignored; `.env.example` only has placeholders.
2. **All secrets in AWS Secrets Manager** in prod. Locally, in `.env`.
3. **Never log tokens, passwords, SSNs, or bank account numbers.**
4. **Field-level encryption** for: SSN, EIN, bank account, 2FA secret, refresh tokens. Use the KMS-backed helpers in `@techorbit/db-client`.
5. **Authz at the data layer.** Every repository method takes an `AuthContext` and enforces access rules server-side. Never trust the UI.
6. **Parameterized queries only** (Prisma does this by default; raw SQL requires extra review).
7. **Rate limit** every public endpoint at the API Gateway and sensitive ones per-user in the service.
8. **2FA required** for CRM, SRM, MSME, Admin, and any user with active payouts.

---

## Financial rules (non-negotiable)

1. **Money as `Decimal`, never `number`.** Use Prisma's `Decimal` type or `decimal.js` in app code. Never `Number` or `parseFloat` for currency.
2. **All amounts in USD cents as integers for storage, or `Decimal` with explicit precision.** Choose one per schema and stick to it.
3. **Every financial mutation** (invoice, payment, commission, payroll) emits an immutable audit event.
4. **Idempotency keys** on every financial POST endpoint. Deduplicate for 24 hours.
5. **Never round until the final step.** Accumulate in full precision; round only when presenting or persisting a final amount.
6. **Double-entry thinking** even when we're not running double-entry bookkeeping — every debit has a matching credit conceptually. Reconcile daily.

---

## Design system rules

- **Never hardcode hex colors in components.** Use Tailwind tokens (`bg-forest-800`, `text-sage-500`).
- **Never hardcode font sizes or spacings in components.** Use Tailwind utilities.
- **All UI primitives live in `packages/ui/`.** Don't create ad-hoc components in apps unless there's a good reason documented in a comment.
- **Accessibility:** every interactive element has keyboard access, a visible focus state, and appropriate ARIA attributes. Run `axe` checks on new components.
- **Motion:** respect `prefers-reduced-motion`. Animations default to 150–250ms.

---

## When to stop and ask

Stop and ask me (the human) when:
- The spec is ambiguous and you'd have to guess a design choice
- You're about to substitute a library not on the locked stack
- You're about to disable a lint/type rule
- You're about to commit something that touches authentication, authorization, payments, or payroll logic without a matching test
- You're about to make a schema change that's destructive (drop column/table/constraint)
- A test is failing and you're about to mark it `.skip` or delete it — stop, explain why, ask
- You've tried to fix something 3 times without success — stop, explain the state, ask

Do not:
- Silently disable tests or lint rules
- Add libraries not in the locked stack
- Reshape the directory structure
- Change public API contracts without noting it in the sprint summary

---

## Response discipline

- When I give you a task, produce a **written plan first** and wait for "proceed" before writing code. This saves me tokens and prevents wrong-direction code.
- After every significant change: run `pnpm lint && pnpm typecheck && pnpm test`. If anything fails, fix before moving on.
- After every task completion: one-line status update ("Task N complete: <one-sentence summary>, <n> commits, all checks passing").
- End of sprint: produce `SPRINT_<N>_SUMMARY.md` with what was built, what was skipped, dependencies for the next sprint, and known issues.

---

## Useful commands (once bootstrapped)

```bash
# first-time setup
./scripts/bootstrap.sh

# bring up infra
docker-compose up -d

# dev loop (all services + web app in parallel)
pnpm dev

# run a single service
pnpm --filter @techorbit/identity-svc dev

# quality gates
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# design system
pnpm --filter @techorbit/ui storybook

# prisma (per service)
pnpm --filter @techorbit/identity-svc prisma migrate dev
pnpm --filter @techorbit/identity-svc prisma studio
```
