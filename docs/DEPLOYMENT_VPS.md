# VPS deployment (DigitalOcean / Hetzner / Linode)

Same stack as `DEPLOYMENT_LOCAL.md`, but with a real domain + Let's Encrypt TLS so users aren't greeted by a cert warning.

## 1. Provision the box

Recommended baseline:
- Ubuntu 22.04 LTS
- 4 vCPU / 8 GB RAM / 80 GB SSD (minimum to run 14 services + Postgres + RabbitMQ comfortably)
- Firewall: allow 22 (SSH), 80, 443. Block everything else. Service ports (3000–3014) are *not* exposed — nginx is the only public surface.

## 2. Base setup

```bash
ssh root@<vps-ip>
apt update && apt upgrade -y
# Docker + Compose V2
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin ufw

# Unprivileged app user
adduser techorbit
usermod -aG docker techorbit

# UFW firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# Log in as app user from here on
su - techorbit
```

## 3. DNS

Point your domain at the VPS IP:

| Record | Name              | Value       |
|--------|-------------------|-------------|
| A      | `@` (apex)        | `<vps-ip>`  |
| A      | `www` (optional)  | `<vps-ip>`  |

Verify with `dig +short <yourdomain>` — should return `<vps-ip>`.

## 4. Clone + configure

```bash
cd /opt && sudo git clone https://github.com/<your-org>/techorbit.git
sudo chown -R techorbit:techorbit /opt/techorbit
cd /opt/techorbit
cp .env.production.example .env.production
# Fill in .env.production — see DEPLOYMENT_LOCAL.md for details.
# Replace every `https://techorbit.example.com` with your real domain.
```

## 5. TLS via Let's Encrypt

The simplest flow uses certbot's standalone mode, then symlinks certs into `./certs/`:

```bash
sudo apt install -y certbot
# Stop anything listening on :80 (nothing should be yet)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com \
  --agree-tos -m ops@yourdomain.com --non-interactive

# Wire into ./certs (bind-mounted into the nginx container)
mkdir -p certs
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/cert.pem
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/key.pem

# Auto-renewal: certbot installs a systemd timer. After renewal we need
# nginx to reload — add a deploy hook:
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOF'
#!/bin/sh
cd /opt/techorbit && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Edit `nginx.conf` if you want strict HSTS preloading, a dedicated `api.` subdomain, etc. Defaults are sensible.

## 6. Deploy

Same as local — build, migrate, seed, up:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres rabbitmq redis
for svc in identity profile file requirement matching interview placement payments messaging notification rating admin; do
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm "$svc" npx prisma migrate deploy
done
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
  -e ADMIN_SEED_EMAIL=admin@yourdomain.com \
  -e ADMIN_SEED_PASSWORD='<strong password>' \
  admin node --experimental-strip-types /app/scripts/seed-admin.ts
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Visit `https://yourdomain.com/login` — no cert warning this time. Log in with the admin seed creds and change the password immediately from `/settings/profile`.

## 7. Backups

Same as local, but copy offsite. Example with rclone to S3-compatible storage:

```bash
# /etc/cron.d/techorbit-backup
0 2 * * * techorbit cd /opt/techorbit && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U techorbit techorbit | gzip | /usr/bin/rclone rcat remote:techorbit-backups/db-$(date +\%F).sql.gz
```

## 8. Monitoring baseline

- `docker compose ps` in a cron every 5 min, email if any row isn't `healthy` (or use Netdata / Grafana Agent).
- `uptimerobot.com` (free) monitoring `https://yourdomain.com/` every minute.
- `logrotate` for `/var/lib/docker/containers/*/*.log` — docker's json-file driver doesn't rotate by default.

## 9. Scaling up

For more traffic before going to a managed / cloud deployment:

- **Bigger VPS.** Vertical scaling is the cheapest next step. 8 vCPU / 16 GB handles hundreds of concurrent sessions.
- **Move Postgres off the app box.** Managed DB (DigitalOcean Managed Postgres, RDS, Supabase) — change `DATABASE_URL` and the `postgres` service in compose becomes unused.
- **Add a second web node.** The 14 Node services are stateless; you can run a second VPS with `web` + all services pointing at the same managed DB/RabbitMQ, then put Cloudflare / a load balancer in front of both.

After that, you're in cloud-native territory — see Sprint 10.5 (not yet written).
