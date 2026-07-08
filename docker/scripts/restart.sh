#!/usr/bin/env bash
# Restart the whole stack, or a single service.
#   ./docker/scripts/restart.sh            # all
#   ./docker/scripts/restart.sh backend    # one service
source "$(dirname "$0")/lib.sh"

$COMPOSE restart "$@"
ok "Restarted: ${*:-all services}"
