# Techorbit

US IT Staffing Marketplace — Monorepo

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Package Manager:** pnpm 9
- **Monorepo:** Turborepo
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript strict, Tailwind CSS
- **Backend:** Fastify, Prisma, TypeScript strict
- **Data:** PostgreSQL 16, Redis 7, RabbitMQ
- **Testing:** Vitest

## Prerequisites

- Node.js 20 LTS (use `nvm use` or install from nodejs.org)
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose (for local infrastructure)

## Quick Start

```bash
# First-time setup (installs deps, starts infra, builds packages)
./scripts/bootstrap.sh

# Start all services in development mode
pnpm dev

# Run quality checks
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Repository Structure

```
apps/              # Frontend applications
  web/             # Next.js customer-facing app

services/          # Backend microservices (Fastify)
  api-gateway/
  identity/
  profile/
  requirement/
  matching/
  interview/
  placement/
  payments/
  messaging/
  notification/
  rating/
  audit/
  reporting/
  onboarding/

packages/          # Shared packages
  config/          # Shared ESLint, TypeScript, Prettier, Vitest configs
    eslint/
    tsconfig/
    prettier/
    vitest/
  types/           # Zod schemas + TypeScript types
  logger/          # Structured logging (pino)
  errors/          # Typed error classes
  event-bus/       # RabbitMQ wrapper
  auth-middleware/ # JWT verification for Fastify
  db-client/       # Prisma client factory
  ui/              # Design system component library

infra/
  docker/          # Docker Compose and init scripts
  terraform/       # Infrastructure as Code (Sprint 10)
```

## Design System

The design system lives in `packages/ui/`. Storybook is available:

```bash
pnpm --filter @techorbit/ui storybook
```

See [DESIGN_REFERENCE.md](./DESIGN_REFERENCE.md) for the full visual language.

## Scripts

```bash
# Bootstrap (first run)
./scripts/bootstrap.sh

# Seed database (placeholder)
pnpm db:seed

# Work on a single service
pnpm --filter @techorbit/identity-svc dev

# Run tests for a specific package
pnpm --filter @techorbit/types test
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for commit format, branch naming, and PR guidelines.

## Environment Variables

Copy `.env.example` to `.env` in the root and fill in values. Never commit `.env` files.

```bash
cp .env.example .env
```