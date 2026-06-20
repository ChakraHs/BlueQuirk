#!/bin/bash
set -e

echo "Stopping Ji Platform..."

docker compose \
  -f compose.base.yml \
  -f compose.identity.yml \
  -f compose.db.yml \
  down

echo "All services stopped."
