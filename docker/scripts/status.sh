#!/usr/bin/env bash
# Show service status + health at a glance.
#   ./docker/scripts/status.sh
source "$(dirname "$0")/lib.sh"

$COMPOSE ps
echo
log "Container health:"
docker ps --filter "name=bluequirk-" \
  --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
