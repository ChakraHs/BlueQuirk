# Starts the shop backend locally with secrets loaded from the git-ignored .env.
# The Spring config references ${TODIFY_API_TOKEN} / ${R2_API_TOKEN} /
# ${RESEND_API_KEY} etc. as environment variables — plain `mvnw spring-boot:run`
# without this loader silently starts with Todify/R2/Resend unconfigured.
#
# Usage: .\start-local.ps1   (from blue-quirk-backend/)

$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' -and -not $_.StartsWith('#')) {
            Set-Item -Path ("Env:" + $Matches[1]) -Value $Matches[2]
        }
    }
    Write-Host "Loaded env vars from .env"
} else {
    Write-Warning ".env not found next to this script - Todify/R2/Resend will be unconfigured."
}

& (Join-Path $PSScriptRoot "mvnw.cmd") spring-boot:run
