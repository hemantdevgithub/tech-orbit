# @techorbit/identity

Authentication, session management, 2FA, password reset, and OAuth for the Techorbit platform.

## Endpoints

| Method | Path                                         | Auth         | Purpose                                           |
| ------ | -------------------------------------------- | ------------ | ------------------------------------------------- |
| POST   | `/api/v1/auth/register`                      | —            | Create account; issues access token + refresh cookie |
| POST   | `/api/v1/auth/login`                         | —            | Email + password login; returns access token or 2FA challenge |
| POST   | `/api/v1/auth/refresh`                       | refresh cookie | Rotate refresh token, issue new access token    |
| POST   | `/api/v1/auth/logout`                        | Bearer       | Revoke current session                            |
| POST   | `/api/v1/auth/2fa/setup`                     | Bearer       | Generate TOTP secret + QR + backup codes          |
| POST   | `/api/v1/auth/2fa/verify`                    | Bearer or challenge | Verify TOTP (setup or login)               |
| POST   | `/api/v1/auth/2fa/disable`                   | Bearer       | Disable 2FA (requires password + TOTP)            |
| POST   | `/api/v1/auth/password/reset/request`        | —            | Always 200; emails reset token if account exists  |
| POST   | `/api/v1/auth/password/reset/confirm`        | —            | Consume reset token + set new password            |
| GET    | `/api/v1/me`                                 | Bearer       | Current user, roles, active sessions              |
| POST   | `/api/v1/me/roles`                           | Bearer       | Add a role (auto-active vs pending verification)  |
| GET    | `/api/v1/auth/oauth/{google,linkedin}/start` | —            | Redirect to provider                              |
| GET    | `/api/v1/auth/oauth/{google,linkedin}/callback` | —         | Exchange code; redirect to frontend               |
| GET    | `/health`                                    | —            | Liveness probe                                    |

The full machine-readable contract lives in [`openapi.yaml`](./openapi.yaml). Regenerate with:

```bash
pnpm openapi:generate
```

## Environment variables

Copy the root `.env.example` to `.env` and fill these in. Anything marked **required** must be set for `buildServer` to start.

| Variable                                                   | Required | Notes                                                    |
| ---------------------------------------------------------- | :------: | -------------------------------------------------------- |
| `DATABASE_URL`                                             | ✓        | Postgres URL. Identity owns the `identity_*` tables.     |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`                        | ✓        | RS256 PEMs (escape newlines as `\n`). See below.         |
| `COOKIE_DOMAIN`                                            |          | Defaults to `localhost`.                                 |
| `COOKIE_SECURE`                                            |          | `true` in prod, `false` locally (auto-computed from `NODE_ENV`). |
| `FRONTEND_URL`                                             |          | Used by OAuth redirects. Defaults to `http://localhost:3000`. |
| `ALLOWED_ORIGINS`                                          |          | Comma-separated CORS origins.                            |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | for Google | Google OAuth 2.0 credentials.                   |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | for LinkedIn | LinkedIn OAuth credentials.            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`                      |          | Use Mailpit locally (from `docker-compose.yml`).         |
| `TWILIO_*`                                                 |          | Optional; mock adapter is used when blank.               |
| `DISABLE_RATE_LIMIT`                                       |          | Set to `1` to skip `@fastify/rate-limit` (tests only).   |
| `LOG_LEVEL`                                                |          | `trace`, `debug`, `info`, `warn`, `error`, `fatal`.      |

### Generating JWT keys

```bash
./scripts/generate-jwt-keys.sh
```

This creates an RS256 keypair and writes `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` into the root `.env` (newlines escaped as `\n`). The script refuses to overwrite an existing `JWT_PRIVATE_KEY` — remove it manually to rotate.

Manual equivalent:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
```

### Database migrations

Migrations live in `prisma/migrations/`. The workflow is:

1. **Create** — edit `schema.prisma`, then:
   ```bash
   pnpm --filter @techorbit/identity prisma migrate dev --name <descriptive_name>
   ```
   Creates a timestamped migration directory with SQL. Review the SQL before applying.

2. **Review** — open `prisma/migrations/<timestamp>_<name>/migration.sql` and verify the changes are safe (no unexpected DROPs, all indexes present, etc.).

3. **Apply** (dev) — `pnpm --filter @techorbit/identity prisma migrate dev` applies the migration and resets the local dev database.

4. **Deploy** (CI/staging) — `pnpm --filter @techorbit/identity prisma migrate deploy` applies all pending migrations without resetting. This is used in the integration test setup (`globalSetup.ts`) and in production.

For convenience, the root `package.json` provides: `pnpm db:migrate:identity`.

## Running locally

```bash
# 1. Boot shared infra (Postgres, Redis, RabbitMQ, Mailpit)
docker-compose up -d

# 2. Generate JWT keys (once)
./scripts/generate-jwt-keys.sh

# 3. Apply schema
pnpm --filter @techorbit/identity db:migrate

# 4. Run the service
pnpm --filter @techorbit/identity dev
```

The service listens on `PORT_IDENTITY` (default `3002`).

## Seeding a test user

Until a dedicated seed script exists, register via HTTP:

```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"dev@techorbit.local","password":"Z7!mvq$HeronLatch92","firstName":"Dev","lastName":"User"}'
```

## Testing

```bash
# Unit + integration (requires Docker for Testcontainers Postgres)
pnpm --filter @techorbit/identity test

# Integration only
pnpm --filter @techorbit/identity test:integration
```

Integration tests spin a Postgres container, apply the Prisma schema via `db push`, and build the Fastify server in-process (via `server.inject`). **When Docker isn't running, integration suites skip cleanly instead of failing** — look for the `[integration-setup]` warning in the output.

## Key design notes

- **Tokens.** Access tokens are RS256 JWTs with a 15-min TTL. Refresh tokens are opaque 64-byte random strings stored as SHA-256 hashes in `identity.Session`, with a 14-day TTL and rotation on every use. Replaying a revoked refresh token revokes **every** active session for that user and emits `session.revoked.v1` with reason `REPLAY_DETECTED`.
- **Cookies.** The refresh token lives in a `refresh_token` httpOnly cookie scoped to `/api/v1/auth`. The access token is returned in the JSON body; clients keep it in memory only.
- **Passwords.** Argon2id with `memory=64MB`, `iterations=3`, `parallelism=4`. zxcvbn score ≥ 3 and length ≥ 12 required server-side.
- **Outbox.** Every auth mutation enqueues an event row in `identity.OutgoingEvent` inside the same transaction as the state change. A separate worker (see `src/lib/outbox-worker.ts`) publishes to RabbitMQ.
- **Rate limits.** `/login` and `/password/reset/request` cap at 5 / 15 min / IP; `/register` caps at 10 / hour / IP. Per-route config in `src/routes/auth.routes.ts`.
