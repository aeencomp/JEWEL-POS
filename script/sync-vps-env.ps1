# Sync local .env to VPS and restart JewelPOS (run from project root on PC)
# Usage: .\script\sync-vps-env.ps1
# Optional: .\script\sync-vps-env.ps1 -VpsHost 82.38.44.205 -SshKey C:\Users\AEEN.IQ\.ssh\jewel-github

param(
    [string]$VpsHost = "82.38.44.205",
    [string]$VpsUser = "deploy",
    [string]$AppPath = "/home/deploy/jewel-pos",
    [string]$SshKey = "$env:USERPROFILE\.ssh\jewel-github"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: No .env in $root" -ForegroundColor Red
    exit 1
}

$sshArgs = @()
if (Test-Path $SshKey) {
    $sshArgs += @("-i", $SshKey)
}

$dbLine = (Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }) | Select-Object -First 1
if (-not $dbLine) {
    Write-Host "ERROR: DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

$hostPart = if ($dbLine -match "@([^/]+)") { $matches[1] } else { "unknown" }
Write-Host "Local DATABASE host: $hostPart" -ForegroundColor Cyan

Write-Host "Uploading .env to VPS..." -ForegroundColor Yellow
& scp @sshArgs ".env" "${VpsUser}@${VpsHost}:${AppPath}/.env"

Write-Host "Restarting app on VPS..." -ForegroundColor Yellow
$remote = @"
cd $AppPath
grep '^DATABASE_URL=' .env | sed 's/:[^:@]*@/:****@/'
pm2 restart jewel-pos --update-env
sleep 2
curl -s -o /dev/null -w 'HTTP %{http_code} on port 5001\n' http://127.0.0.1:5001
"@

& ssh @sshArgs "${VpsUser}@${VpsHost}" $remote

Write-Host ""
Write-Host "Done. Also update GitHub secret DATABASE_URL to match local .env:" -ForegroundColor Green
Write-Host "  https://github.com/aeencomp/JEWEL-POS/settings/secrets/actions" -ForegroundColor Green
Write-Host "Verify: npx tsx script/db-diagnose.ts" -ForegroundColor Green
Write-Host "Login: https://iq-pos.com/store-portal (store user from db-diagnose)" -ForegroundColor Green
