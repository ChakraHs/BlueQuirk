Write-Host "Starting Ji Platform..."

docker compose `
  -f compose.base.yml `
  -f compose.identity.yml `
  -f compose.db.yml `
  up -d

Write-Host "All services started."
