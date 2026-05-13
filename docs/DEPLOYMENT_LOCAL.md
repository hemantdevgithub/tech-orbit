# Local single-host deployment

Deploy the full Techorbit stack (14 services + web + Postgres + Redis + RabbitMQ + nginx) to one machine — your laptop, a dedicated Linux box on your LAN, or any single VPS. Everything runs as Docker containers orchestrated by `docker-compose.prod.yml`.

## Prerequisites

- Linux host (Ubuntu 22.04 LTS tested) or macOS for dev
- Docker Engine 24+ and the Compose V2 plugin
- 8 GB RAM minimum, 16 GB recommended
- 20 GB free disk (most goes to the Node build layers)
- Ability to bind :80 and :443 (the nginx container's only exposed ports)

## 1. Clone + configure

```bash
git clone https://github.com/<your-org>/techorbit.git
cd techorbit
cp .env.production.example .env.production
# Edit .env.production — replace every CHANGE_ME
```

At minimum:
- `DB_PASSWORD` / `RABBITMQ_PASSWORD` — strong random values (`openssl rand -base64 24`)
- `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY` — run `./scripts/generate-jwt-keys.sh`
- `FIELD_ENCRYPTION_KEK_V1` — `openssl rand -base64 32`
- `ALLOWED_ORIGINS` — the exact URL your browser will hit (e.g. `https://localhost`)
- All `NEXT_PUBLIC_*_URL` values — for a single-host setup behind nginx at `/api/<svc>` paths

## 2. Generate TLS cert

Self-signed is fine for LAN / localhost:

```bash
./scripts/generate-self-signed-cert.sh certs localhost
```

For a real domain, see `DEPLOYMENT_VPS.md` — skip this step and set up Let's Encrypt instead.

## 3. Build + migrate + seed

```bash
# Build all 15 images (one-time, ~5 min on first run)
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Bring up infra services first so migrations can run against a live DB
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres rabbitmq redis

# Run migrations for every service that uses Prisma. One-shot runs against the same container image; exits when done.
for svc in identity profile file requirement matching interview placement payments messaging notification rating admin; do
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm "$svc" npx prisma migrate deploy
done

# Seed the first admin user
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
  -e ADMIN_SEED_EMAIL=admin@yourcompany.com \
  -e ADMIN_SEED_PASSWORD='<strong password>' \
  admin node --experimental-strip-types /app/scripts/seed-admin.ts
```

## 4. Bring up the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Check health:

```bash
docker compose -f docker-compose.prod.yml ps
# Every service row should read "healthy"
curl -k https://localhost/ | head -5
# 200-ish HTML from Next.js
```

Login via `https://<host>/login` — accept the self-signed cert warning.

## 5. Backups (you should do this on day one)

```bash
# One-shot
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U techorbit techorbit > backup-$(date +%F).sql

# Restore
cat backup-YYYY-MM-DD.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U techorbit techorbit
```

Schedule via host cron:

```cron
# daily 2am
0 2 * * * cd /opt/techorbit && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U techorbit techorbit | gzip > /var/backups/techorbit-$(date +\%F).sql.gz
# keep 14 days
5 3 * * * find /var/backups -name 'techorbit-*.sql.gz' -mtime +14 -delete
```

## 6. Operations

```bash
# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# Follow a single service
docker compose -f docker-compose.prod.yml logs -f payments

# Restart one service (e.g. after an env change)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate identity

# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop + wipe data volumes (DESTRUCTIVE)
docker compose -f docker-compose.prod.yml down -v
```

## Troubleshooting

**Browser keeps showing "Your connection is not private".** Expected with a self-signed cert. Click "Advanced → Proceed" in Chrome, or use Let's Encrypt (see `DEPLOYMENT_VPS.md`).

**Services stuck in "unhealthy"**. Check logs with `docker compose logs -f <svc>`. Most often a missing env var or DB not yet reachable during the retry window. The healthcheck interval is 30 s; give it 1-2 minutes before worrying.

**`docker compose build` fails with `ETOOMANYOPEN`**. The build stage runs `pnpm install` which opens thousands of files. On macOS raise with `ulimit -n 50000` in the shell that runs the build; on Linux the default is usually fine.

**Admin seed fails with "user already exists"**. The seed script is idempotent — it adds ADMIN to an existing user by email rather than erroring. If you see a duplicate-email error, you likely didn't use `--rm` and the container retained a previous run's state.
