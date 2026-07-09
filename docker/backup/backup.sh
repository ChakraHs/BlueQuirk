#!/usr/bin/env bash
# BlueQuirk backup: dumps the MariaDB database and archives uploaded media,
# compresses both, and enforces a retention window. Safe to run from cron.
#
#   ./docker/backup/backup.sh
#
# Env (from .env): DB_NAME, DB_ROOT_PASSWORD, BACKUP_DIR, BACKUP_RETENTION_DAYS
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)/lib.sh"

require_env

TS="$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
# Resolve BACKUP_DIR to an absolute path (needed for docker -v mounts).
REL_BACKUP_DIR="${BACKUP_DIR:-docker/volumes/backups}"
mkdir -p "$REPO_ROOT/$REL_BACKUP_DIR" 2>/dev/null || mkdir -p "$REL_BACKUP_DIR"
ABS_BACKUP_DIR="$(cd "$REPO_ROOT/$REL_BACKUP_DIR" 2>/dev/null && pwd || cd "$REL_BACKUP_DIR" && pwd)"

log "Backing up database '${DB_NAME}' → ${REL_BACKUP_DIR}/db-${TS}.sql.gz"
$COMPOSE exec -T mariadb \
  mariadb-dump -uroot -p"${DB_ROOT_PASSWORD}" \
    --single-transaction --routines --triggers --events "${DB_NAME}" \
  | gzip -9 > "${ABS_BACKUP_DIR}/db-${TS}.sql.gz"

log "Backing up uploaded media → ${REL_BACKUP_DIR}/uploads-${TS}.tar.gz"
docker run --rm \
  -v bluequirk_uploads:/data:ro \
  -v "${ABS_BACKUP_DIR}:/backup" \
  alpine sh -c "tar czf /backup/uploads-${TS}.tar.gz -C /data ." \
  || warn "Uploads volume empty or unavailable — skipped."

log "Applying retention: deleting backups older than ${RETENTION_DAYS} days…"
find "${ABS_BACKUP_DIR}" -type f -name 'db-*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete
find "${ABS_BACKUP_DIR}" -type f -name 'uploads-*.tar.gz' -mtime +"${RETENTION_DAYS}" -delete

ok "Backup complete:"
ls -lh "${ABS_BACKUP_DIR}" | tail -n +1
