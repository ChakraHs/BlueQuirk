#!/usr/bin/env bash
# Shared helpers for the BlueQuirk management scripts. Sourced, not executed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Prefer the Compose v2 plugin; fall back to the legacy binary.
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: Docker Compose is not installed." >&2
  exit 1
fi

# Load .env (used by backup/restore for DB name, credentials, retention).
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env"
  set +a
fi

log()  { printf '\033[1;34m[bluequirk]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[bluequirk]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bluequirk]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[bluequirk]\033[0m %s\n' "$*" >&2; }

require_env() {
  if [ ! -f "$REPO_ROOT/.env" ]; then
    err "No .env found. Run:  cp .env.example .env  &&  edit it, then retry."
    exit 1
  fi
}
