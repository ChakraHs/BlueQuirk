#!/usr/bin/env bash
# Tail logs. Optionally pass a service name (backend|frontend|mariadb|caddy).
#   ./docker/scripts/logs.sh            # all services
#   ./docker/scripts/logs.sh backend    # one service
source "$(dirname "$0")/lib.sh"

$COMPOSE logs -f --tail=200 "$@"
