# Enable store 2FA in local .env and sync to VPS.
# Usage: .\script\enable-store-2fa.ps1
# Optional: .\script\enable-store-2fa.ps1 -ResendApiKey "re_xxx" -FromEmail "JewelPOS <noreply@iq-pos.com>"

param(
    [string]$ResendApiKey = "",
    [string]$FromEmail = "JewelPOS <noreply@iq-pos.com>"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: Copy .env.example to .env first." -ForegroundColor Red
    exit 1
}

function Set-EnvLine($name, $value) {
    $lines = Get-Content ".env"
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match "^${name}=") {
            $found = $true
            "${name}=${value}"
        } else {
            $line
        }
    }
    if (-not $found) {
        $out += "${name}=${value}"
    }
    $out | Set-Content ".env" -Encoding utf8
}

Set-EnvLine "STORE_REQUIRE_2FA" "true"

if ($ResendApiKey) {
    Set-EnvLine "RESEND_API_KEY" $ResendApiKey
} elseif (-not ((Get-Content ".env" | Where-Object { $_ -match "^RESEND_API_KEY=re_" }))) {
    $key = Read-Host "Enter RESEND_API_KEY (starts with re_)"
    if ($key) { Set-EnvLine "RESEND_API_KEY" $key }
}

Set-EnvLine "RESEND_FROM_EMAIL" $FromEmail

Write-Host ""
Write-Host "Local .env updated:" -ForegroundColor Green
Get-Content ".env" | Where-Object { $_ -match "^(STORE_REQUIRE_2FA|RESEND_)" }

Write-Host ""
Write-Host "Syncing to VPS..." -ForegroundColor Yellow
& "$PSScriptRoot\sync-vps-env.ps1"

Write-Host ""
Write-Host "Add GitHub secrets (optional):" -ForegroundColor Cyan
Write-Host "  STORE_REQUIRE_2FA = true"
Write-Host "  RESEND_API_KEY, RESEND_FROM_EMAIL"
Write-Host "Guide: ENABLE-STORE-2FA.md"
