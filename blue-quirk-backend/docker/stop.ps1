Write-Host "Stopping Ji Platform..."

docker compose `
  -f compose.base.yml `
  -f compose.identity.yml `
  -f compose.db.yml `
  down
