#!/usr/bin/env bash
# Convenience wrapper → docker/backup/restore.sh
exec "$(cd "$(dirname "$0")/../backup" && pwd)/restore.sh" "$@"
