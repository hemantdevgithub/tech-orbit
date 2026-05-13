# Sprint 0 Summary — Monorepo Bootstrap

## Status: Complete ✅

## What Was Built

### Infrastructure
- pnpm 9 + Turborepo monorepo structure
- Docker Compose with Postgres 16, Redis 7, RabbitMQ, Mailpit
- CI pipeline (GitHub Actions)
- Terraform skeleton for future AWS provisioning

### Shared Config Packages
- `@techorbit/config-eslint` — ESLint flat config (Node + Next.js presets)
- `@techorbit/config-tsconfig` — Base, Node, Next.js TypeScript configs
- `@techorbit/config-prettier` — Shared Prettier config
- `@techorbit/config-vitest` — Shared Vitest preset

### Shared Utility Packages
- `@techorbit/types` — Zod schemas + TypeScript types (enums from spec)
- `@techorbit/logger` — Pino wrapper with correlation ID + secret redaction
- `@techorbit/errors` — Typed errors (NotFoundError, ValidationError, etc.)
- `@techorbit/event-bus` — RabbitMQ wrapper with event envelope schema
- `@techorbit/auth-middleware` — JWT verification for Fastify
- `@techorbit/db-client` — Prisma client factory

### Design System (`packages/ui/`)
10 components with Storybook stories:
- Button (4 variants, 3 sizes)
- Card (with Header, Body, Footer, Title, Subtitle)
- Input (with label, error, helper text)
- Label
- Badge (6 variants)
- Avatar
- InfoStrip
- ProgressCard
- NavBar
- PageHeader

### Services (14 Fastify microservices)
All scaffolded with health endpoints, structured logging, graceful shutdown:
1. api-gateway - Proxy with @fastify/http-proxy
2. identity
3. profile
4. requirement
5. matching
6. interview
7. placement
8. payments
9. messaging
10. notification
11. rating
12. audit (3012)
13. reporting
14. onboarding

### Next.js App (`apps/web/`)
- Next.js 14 App Router with TypeScript
- Design system integrated (NavBar, PageHeader, InfoStrip, ProgressCard, Card, Button)
- Welcome page matching Calibra Health aesthetic

## Deferred to Future Sprints

| Item | Sprint |
|------|--------|
| Prisma schemas + migrations | Sprint 1 (Identity) |
| Real auth implementation | Sprint 1 |
| API routes | Sprint 1+ |
| Database seed data | Sprint 1 |
| AWS provisioning | Sprint 10 |
| Remote cache | Sprint 10 |

## Known Issues / Open Questions

1. ENGINEERING_SPEC.md not available — used reasonable defaults for service ports/names
2. No Prisma migrations yet (placeholder schema init SQL created)
3. JWT keys not generated — placeholder in .env.example

## First-Run Guide

```bash
# Clone and setup
pnpm install

# Start infrastructure
docker-compose up -d

# Start development
pnpm dev

# Run tests
pnpm test

# Build all
pnpm build
```

## Repository Structure

```
techorbit/
├── apps/web/           # Next.js app
├── packages/
│   ├── config/         # ESLint, TS, Prettier, Vitest configs
│   ├── types/          # Shared types
│   ├── logger/         # Pino logger
│   ├── errors/         # Typed errors
│   ├── event-bus/      # RabbitMQ wrapper
│   ├── auth-middleware/ # JWT middleware
│   ├── db-client/       # Prisma factory
│   └── ui/             # Design system
├── services/           # 14 microservices
├── infra/
│   ├── docker/         # Postgres init scripts
│   └── terraform/      # AWS IaC (Sprint 10)
├── scripts/            # Bootstrap, seed
└── .github/workflows/   # CI pipeline
```
