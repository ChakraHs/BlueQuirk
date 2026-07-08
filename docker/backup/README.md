# Backups & restore

Two artifacts are captured per run:

| Artifact | Source | File |
|----------|--------|------|
| Database | MariaDB (`mariadb-dump`, single transaction) | `db-<timestamp>.sql.gz` |
| Uploads  | `uploads` Docker volume (`/app/uploads`)       | `uploads-<timestamp>.tar.gz` |

Both land in `BACKUP_DIR` (default `docker/volumes/backups`, set in `.env`) and are
compressed. Backups older than `BACKUP_RETENTION_DAYS` (default 14) are pruned.

## Run a backup

```bash
./docker/scripts/backup.sh        # or ./docker/backup/backup.sh
```

## Schedule (cron, daily at 03:30)

```bash
crontab -e
# m h dom mon dow  command
30 3 * * *  cd /opt/bluequirk && ./docker/scripts/backup.sh >> /var/log/bluequirk-backup.log 2>&1
```

> For off-site safety, sync `BACKUP_DIR` to object storage (e.g. `rclone` to
> Cloudflare R2 / S3) after the backup step.

## Restore (DESTRUCTIVE)

```bash
# Newest backup:
./docker/scripts/restore.sh
# Or a specific pair:
./docker/scripts/restore.sh docker/volumes/backups/db-20260708-033001.sql.gz \
                            docker/volumes/backups/uploads-20260708-033001.tar.gz
```

The script prompts for confirmation, restores the database, replaces uploaded
media, and reminds you to restart the backend. Data volumes are otherwise never
touched by deploys/updates, so container recreation alone never loses data.
