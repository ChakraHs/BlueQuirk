#!/usr/bin/env bash
# BlueQuirk restore. DESTRUCTIVE — overwrites the current database and uploads.
#
#   ./docker/backup/restore.sh <db-YYYYMMDD-HHMMSS.sql.gz> [uploads-*.tar.gz]
#
# If no arguments are given, the most recent backups in BACKUP_DIR are used.
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)/lib.sh"

require_env

REL_BACKUP_DIR="${BACKUP_DIR:-docker/volumes/backups}"
ABS_BACKUP_DIR="$(cd "$REPO_ROOT/$REL_BACKUP_DIR" 2>/dev/null && pwd || echo "$REL_BACKUP_DIR")"

DB_FILE="${1:-}"
UPLOADS_FILE="${2:-}"

# Fall back to the newest backups when no file is given.
if [ -z "$DB_FILE" ]; then
  DB_FILE="$(ls -1t "${ABS_BACKUP_DIR}"/db-*.sql.gz 2>/dev/null | head -1 || true)"
fi
if [ -z "$UPLOADS_FILE" ]; then
  UPLOADS_FILE="$(ls -1t "${ABS_BACKUP_DIR}"/uploads-*.tar.gz 2>/dev/null | head -1 || true)"
fi

[ -n "$DB_FILE" ] && [ -f "$DB_FILE" ] || { err "Database backup not found: '${DB_FILE:-<none>}'"; exit 1; }

warn "This will OVERWRITE database '${DB_NAME}' and uploaded media."
warn "  DB:      ${DB_FILE}"
warn "  Uploads: ${UPLOADS_FILE:-<none>}"
printf 'Type "yes" to continue: '
read -r CONFIRM
[ "$CONFIRM" = "yes" ] || { log "Aborted."; exit 0; }

log "Restoring database…"
gunzip -c "$DB_FILE" | $COMPOSE exec -T mariadb \
  mariadb -uroot -p"${DB_ROOT_PASSWORD}" "${DB_NAME}"

if [ -n "$UPLOADS_FILE" ] && [ -f "$UPLOADS_FILE" ]; then
  log "Restoring uploaded media…"
  ABS_UPLOADS="$(cd "$(dirname "$UPLOADS_FILE")" && pwd)/$(basename "$UPLOADS_FILE")"
  docker run --rm \
    -v bluequirk_uploads:/data \
    -v "$(dirname "$ABS_UPLOADS"):/backup:ro" \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$ABS_UPLOADS") -C /data"
fi

ok "Restore complete. Restart the backend to pick up restored data:"
log "  ./docker/scripts/restart.sh backend"
