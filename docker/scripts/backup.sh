#!/usr/bin/env bash
# Convenience wrapper → docker/backup/backup.sh
exec "$(cd "$(dirname "$0")/../backup" && pwd)/backup.sh" "$@"
