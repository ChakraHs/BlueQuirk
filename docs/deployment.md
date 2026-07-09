# BlueQuirk — Production Deployment Guide (Ubuntu / Contabo VPS)

This guide takes a **clean Ubuntu server** to a running, HTTPS-secured BlueQuirk
deployment. It applies to any Linux VPS (Contabo, Hetzner, DigitalOcean, …); the
only Contabo-specific note is the firewall.

The end state is intentionally simple:

```bash
git clone <repo> /opt/bluequirk
cd /opt/bluequirk
cp .env.example .env      # then edit
docker compose up -d      # or ./docker/scripts/deploy.sh
```

Everything else — build, networking, TLS, data persistence — is automatic.

---

## 1. Prerequisites

- An Ubuntu 22.04/24.04 VPS with a public IP and root (or sudo) access.
- A domain name you control (e.g. `bluequirk.shop`).
- Ports **80** and **443** reachable from the internet.

## 2. Point DNS at the server

At your DNS provider create records pointing to the VPS public IP:

| Type | Name | Value |
|------|------|-------|
| A    | `@`  | `<VPS_IPv4>` |
| A    | `www` (optional) | `<VPS_IPv4>` |
| AAAA | `@` (optional, if IPv6) | `<VPS_IPv6>` |

Verify before continuing (TLS issuance needs DNS to resolve):

```bash
dig +short bluequirk.shop
```

## 3. Install Docker Engine + Compose plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker as your user (log out/in afterwards):
sudo usermod -aG docker "$USER"

docker --version && docker compose version
```

## 4. Firewall + open ports

```bash
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp      # HTTP/3 (QUIC)
sudo ufw enable
sudo ufw status
```

> **Contabo:** Contabo VPSes have no external cloud firewall by default, so `ufw`
> is the firewall. If you enabled Contabo's firewall in their panel, also allow
> 22/80/443 there. The database port (3306) is **never** opened — MariaDB lives on
> a private Docker network with no published port.

## 5. Clone + configure

```bash
sudo mkdir -p /opt/bluequirk && sudo chown "$USER" /opt/bluequirk
git clone <repo-url> /opt/bluequirk
cd /opt/bluequirk

cp .env.example .env
nano .env
```

Fill in at least the `(REQUIRED)` variables. Generate strong secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # DB_PASSWORD / DB_ROOT_PASSWORD
```

Set `SITE_DOMAIN`, `PUBLIC_SITE_URL`, `PUBLIC_API_URL` to your real domain.
If any required variable is missing, `docker compose up` stops immediately with a
clear message (fail-fast).

## 6. Deploy

```bash
./docker/scripts/deploy.sh
# equivalently:
docker compose up -d --build
```

First run builds both app images and pulls MariaDB/Caddy. Caddy then obtains a
Let's Encrypt certificate automatically (needs DNS + ports 80/443). Watch it:

```bash
./docker/scripts/status.sh
./docker/scripts/logs.sh caddy      # look for certificate obtained
./docker/scripts/logs.sh backend
```

Visit `https://<your-domain>`. HTTP is redirected to HTTPS automatically.

## 7. HTTPS notes

- Certificates are stored in the `caddy-data` volume and **auto-renew**. Never
  delete that volume or you'll re-issue (and can hit Let's Encrypt rate limits).
- Local testing: set `SITE_DOMAIN=localhost` — Caddy serves HTTPS with a local CA
  cert (browser will warn; that's expected off-domain).

## 8. Updating

```bash
cd /opt/bluequirk
./docker/scripts/update.sh          # git pull + rebuild + recreate + prune
```

Data volumes (DB, uploads, certs) are untouched by updates.

## 9. Backups & restore

```bash
./docker/scripts/backup.sh          # db-*.sql.gz + uploads-*.tar.gz in BACKUP_DIR
```

Schedule daily via cron (see [`docker/backup/README.md`](../docker/backup/README.md)):

```cron
30 3 * * *  cd /opt/bluequirk && ./docker/scripts/backup.sh >> /var/log/bluequirk-backup.log 2>&1
```

Restore (destructive, prompts to confirm):

```bash
./docker/scripts/restore.sh                         # newest backup
./docker/scripts/restore.sh <db.sql.gz> <uploads.tar.gz>
```

Copy backups off-site (e.g. `rclone` to R2/S3) for real disaster recovery.

## 10. Data persistence

Named Docker volumes survive `down`/`up`/rebuilds:

| Volume | Contents |
|--------|----------|
| `mariadb-data`  | the database |
| `uploads`       | user-uploaded images (`/app/uploads`) |
| `caddy-data`    | TLS certificates + ACME account |
| `caddy-config`  | Caddy autosave |
| `redis-data`    | Redis AOF (only with `--profile cache`) |

`docker compose down` keeps volumes. Only `docker compose down -v` deletes them —
**don't** run that in production.

## 11. Logging

Per-service JSON logs, rotated (10 MB × 5):

```bash
./docker/scripts/logs.sh              # all
./docker/scripts/logs.sh backend      # one service
docker compose logs --since 1h caddy
```

Backend log verbosity is tunable via `LOG_LEVEL_*` in `.env`.

## 12. Monitoring

Health probes and future Prometheus/Grafana/Uptime Kuma integration are
documented in [`docker/monitoring/README.md`](../docker/monitoring/README.md).
Quick check:

```bash
docker inspect --format '{{.State.Health.Status}}' bluequirk-backend
```

## 13. Troubleshooting

| Symptom | Check |
|---------|-------|
| `docker compose up` exits with `… is required` | A required `.env` var is unset. |
| Caddy can't get a cert | DNS not pointing at the server yet, or 80/443 blocked by firewall. `./docker/scripts/logs.sh caddy`. |
| Backend unhealthy / restarts | `logs.sh backend`. Usually DB creds mismatch or DB not ready — it waits for MariaDB health. |
| `502` from Caddy | Backend/frontend still starting (see `status.sh`) or crashed; check its logs. |
| Images broken on the site | Add your domain to `remotePatterns` in `blue-quirk-frontend/next.config.ts` if serving `/uploads` from a different host. |
| Out of memory | Lower `*_MEM_LIMIT` in `.env` or upgrade the VPS; check `docker stats`. |
| Reset everything (keep data) | `docker compose down && docker compose up -d --build`. |

## 14. Security posture (already applied)

- Containers run as **non-root**; backend & frontend use a **read-only** root
  filesystem with a `tmpfs` for scratch.
- `no-new-privileges` on every service; only Caddy publishes ports.
- MariaDB is on a private, `internal: true` network — **not reachable** from the
  internet.
- Secrets come only from `.env` (git-ignored); no defaults are baked into images.
- Caddy sends HSTS + hardening headers and hides the server banner.

## 15. CI/CD (prepared, not enabled for deploy)

`.github/workflows/ci.yml` builds & tests both apps and builds the images on every
push/PR. Deployment is intentionally left as a future step — add a deploy job that
SSHes to the VPS and runs `./docker/scripts/update.sh`, or pushes images to a
registry the server pulls. See the "CI/CD readiness" section of the project brief.
