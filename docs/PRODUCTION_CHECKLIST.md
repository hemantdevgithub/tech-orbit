# Production readiness checklist

Run through this before exposing Techorbit to real traffic. Every "must" item is a blocker; "should" items are strong recommendations but not gates.

## Security — must

- [ ] Every `CHANGE_ME` in `.env.production` replaced with a strong random value
- [ ] `JWT_PRIVATE_KEY` generated fresh (don't reuse dev keys). Script: `./scripts/generate-jwt-keys.sh`
- [ ] `FIELD_ENCRYPTION_KEK_V1` generated fresh (`openssl rand -base64 32`). Rotating later requires decrypting-then-re-encrypting existing 2FA secrets.
- [ ] TLS working. `https://<domain>/` returns 200 with a valid cert. No self-signed in front of real users.
- [ ] HTTP → HTTPS redirect (baked into `nginx.conf` but verify).
- [ ] Security headers present. `curl -kI https://<domain>/` should show `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] Rate limits active:
  - identity: login 5/15 min, register 5/15 min, password-reset 10/hr (already configured)
  - admin: 30 requests/min per token (Sprint 10 addition)
  - messaging: 100 messages/min and 20 new threads/hour per user (Sprint 10 addition)
- [ ] CORS `ALLOWED_ORIGINS` set to your real domain, not `*`
- [ ] No secrets in git. `grep -r "CHANGE_ME\|BEGIN PRIVATE KEY" .env* **/*.env` returns no hits in tracked files.
- [ ] `.env.production` is in `.gitignore` (default) and world-readable only to the `techorbit` user (`chmod 600`)
- [ ] First admin seeded with a strong password and password changed after first login

## Security — should

- [ ] 2FA enabled on the admin account
- [ ] Intrusion monitoring (fail2ban on SSH, Cloudflare/CrowdSec in front of nginx)
- [ ] Logrotate configured for docker json-file logs (not enabled by default)
- [ ] Audit log retention policy documented

## Data — must

- [ ] Automated daily Postgres backup configured (see `DEPLOYMENT_VPS.md` §7)
- [ ] Tested restoring from a backup on a staging host — untested backups are not backups
- [ ] At least one offsite backup target (S3, B2, another host)

## Data — should

- [ ] RabbitMQ persistent volume (`rabbitmq_data`, already configured in prod compose)
- [ ] Encrypted storage underneath the Docker volumes if the VPS supports it

## Functional gates — must

- [ ] `pnpm lint` green
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` green (all service + package test suites)
- [ ] `pnpm --filter @techorbit/web e2e` green (9 Playwright flow specs + 3 auth specs) — run against the prod compose stack
- [ ] `pnpm --filter @techorbit/web build` succeeds (exit 0) and Next's standalone output lands at `.next/standalone/server.js`
- [ ] OpenAPI specs committed and in sync (`pnpm <svc> openapi:generate` leaves no diff)

## Performance — should

- [ ] First-load bundle per route under 200 KB. Check with `ANALYZE=true pnpm --filter @techorbit/web build`.
- [ ] Database queries traced: every request path under 200 ms on a warm cache. If any exceed, check the index audit in `SPRINT_10_SUMMARY.md`.

## Monitoring — should

- [ ] Health endpoints (`/health` on every service) being polled by an external uptime monitor (UptimeRobot is the easiest zero-cost option)
- [ ] RabbitMQ management UI accessible to ops (behind a VPN — do NOT expose :15672 publicly)
- [ ] A place to read logs (journald, Loki, or just `docker compose logs` with log rotation)

## Legal — project-specific

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data retention policy for timesheets + invoices documented (financial data usually 7 years)
- [ ] If serving EU users, GDPR DPA with any third-party processors (Stripe, SendGrid, Twilio)

---

**Green on all "must" items = ready for production traffic.**
