#!/usr/bin/env bash
# Update to the latest code: pull, rebuild, recreate changed services, prune.
# Data volumes (DB, uploads, certs) are never touched.
#   ./docker/scripts/update.sh
source "$(dirname "$0")/lib.sh"

require_env

if [ -d "$REPO_ROOT/.git" ]; then
  log "Pulling latest code…"
  git -C "$REPO_ROOT" pull --ff-only
fi

log "Rebuilding images…"
$COMPOSE build

log "Recreating changed services…"
$COMPOSE up -d

log "Pruning dangling images…"
docker image prune -f >/dev/null || true

ok "Update complete."
$COMPOSE ps
