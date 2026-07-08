#!/usr/bin/env bash
# First-time / full deploy: validate config, build images, start the stack.
#   ./docker/scripts/deploy.sh
source "$(dirname "$0")/lib.sh"

require_env

log "Validating compose configuration…"
$COMPOSE config >/dev/null

log "Pulling base images (mariadb, caddy, …)…"
$COMPOSE pull --ignore-buildable || true

log "Building application images…"
$COMPOSE build

log "Starting the stack (detached)…"
$COMPOSE up -d

ok "Deployed. Current status:"
$COMPOSE ps
log "Follow logs with:  ./docker/scripts/logs.sh"
