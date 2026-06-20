#!/bin/bash
set -e

echo "Starting Ji Platform..."

docker compose \
  -f compose.base.yml \
  -f compose.identity.yml \
  -f compose.db.yml \
  up -d

echo "All services started."
