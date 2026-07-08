# `docker/` — deployment assets

Everything needed to run BlueQuirk in production. The stack is defined by the
**root** `docker-compose.yml`; this folder holds its supporting configuration,
scripts and backups.

```
docker/
├── caddy/        Caddyfile (reverse proxy, auto-HTTPS, headers, caching)
├── mariadb/      conf.d/my.cnf (tuning) + init/ (first-boot SQL)
├── backup/       backup.sh / restore.sh + docs
├── monitoring/   health endpoints + future Prometheus/Grafana/Uptime Kuma
├── scripts/      deploy · update · backup · restore · logs · status · restart
└── volumes/      local bind target for backups (git-ignored contents)
```

## Quick reference

```bash
cp .env.example .env && nano .env      # configure (from repo root)
./docker/scripts/deploy.sh             # build + start everything
./docker/scripts/status.sh             # health at a glance
./docker/scripts/logs.sh backend       # tail a service
./docker/scripts/update.sh             # pull + rebuild + recreate
./docker/scripts/backup.sh             # db + uploads backup
./docker/scripts/restore.sh            # restore newest backup
./docker/scripts/restart.sh caddy      # restart one service
```

## Profiles

```bash
docker compose up -d                      # core: caddy, frontend, backend, mariadb
docker compose --profile cache up -d      # + redis
docker compose --profile dev up -d        # + mailpit (8025) + adminer (8081)
```

Full server walkthrough: [`docs/deployment.md`](../docs/deployment.md).
